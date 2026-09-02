import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimePayload {
  table: string;
  eventType: RealtimeEventType;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  timestamp?: string;
  source?: 'supabase' | 'broadcast';
}

export type RealtimeChangeCallback = (payload: RealtimePayload) => void;
export type ConnectionStatusCallback = (status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR') => void;

class RealtimeService {
  private channel: RealtimeChannel | null = null;
  private currentWorkspaceId: string | null = null;
  private listeners: Set<RealtimeChangeCallback> = new Set();
  private statusListeners: Set<ConnectionStatusCallback> = new Set();
  private connectionStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' = 'DISCONNECTED';
  private broadcastChannel: BroadcastChannel | null = null;
  private reconnectTimer: number | null = null;
  private isSubscribed = false;

  constructor() {
    // Cross-tab broadcast channel for local multi-tab sync (e.g. testing two users in separate tabs)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('team-task-tracker-realtime-bus');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.table) {
            this.notifyListeners(event.data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }
    }

    // Storage event fallback for cross-tab sync in older contexts
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'ttt_realtime_event' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.notifyListeners(parsed);
          } catch {}
        }
      });
    }
  }

  public getConnectionStatus(): 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' {
    return this.connectionStatus;
  }

  public onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.connectionStatus);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private setStatus(status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR') {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach(cb => {
        try {
          cb(status);
        } catch (e) {
          console.error('Status listener error:', e);
        }
      });
    }
  }

  /**
   * Subscribe to live postgres changes for a specific workspace.
   * Ensures singleton channel subscription, clean teardown, and reconnection handling.
   */
  public subscribeToWorkspace(workspaceId: string, onUpdate: RealtimeChangeCallback): () => void {
    this.listeners.add(onUpdate);

    // If workspace changed or not yet connected, set up channel
    if (this.currentWorkspaceId !== workspaceId || !this.channel) {
      this.currentWorkspaceId = workspaceId;
      this.initSupabaseChannel(workspaceId);
    }

    return () => {
      this.listeners.delete(onUpdate);
      // Clean up when all listeners unmount
      if (this.listeners.size === 0) {
        this.teardownChannel();
      }
    };
  }

  private initSupabaseChannel(workspaceId: string) {
    if (!isSupabaseConfigured()) {
      this.setStatus('CONNECTED'); // Local broadcast mode is active
      return;
    }

    if (this.channel) {
      this.teardownChannel();
    }

    this.setStatus('CONNECTING');

    const channelName = `realtime-ws-${workspaceId}-${Date.now().toString(36)}`;
    
    try {
      this.channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: workspaceId }
          }
        })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          payload => this.handlePostgresChange('tasks', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comments' },
          payload => this.handlePostgresChange('comments', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notes' },
          payload => this.handlePostgresChange('notes', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'suggestions' },
          payload => this.handlePostgresChange('suggestions', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'task_subtasks' },
          payload => this.handlePostgresChange('task_subtasks', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'task_labels' },
          payload => this.handlePostgresChange('task_labels', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attachments' },
          payload => this.handlePostgresChange('attachments', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'activity_logs' },
          payload => this.handlePostgresChange('activity_logs', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          payload => this.handlePostgresChange('notifications', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          payload => this.handlePostgresChange('profiles', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'workspaces' },
          payload => this.handlePostgresChange('workspaces', payload)
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
            this.setStatus('CONNECTED');
            if (this.reconnectTimer) {
              clearTimeout(this.reconnectTimer);
              this.reconnectTimer = null;
            }
          } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
            this.isSubscribed = false;
            this.setStatus('DISCONNECTED');
            this.scheduleReconnect(workspaceId);
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[Supabase Realtime Channel Error]:', err);
            this.isSubscribed = false;
            this.setStatus('ERROR');
            this.scheduleReconnect(workspaceId);
          }
        });
    } catch (err) {
      console.error('Failed to create Supabase Realtime channel:', err);
      this.setStatus('ERROR');
      this.scheduleReconnect(workspaceId);
    }
  }

  private scheduleReconnect(workspaceId: string) {
    if (this.reconnectTimer || !this.listeners.size) return;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.listeners.size > 0) {
        console.log('[Supabase Realtime] Attempting reconnection...');
        this.initSupabaseChannel(workspaceId);
      }
    }, 4000);
  }

  private handlePostgresChange(table: string, payload: any) {
    const event: RealtimePayload = {
      table,
      eventType: payload.eventType as RealtimeEventType,
      new: (payload.new as Record<string, unknown>) || {},
      old: (payload.old as Record<string, unknown>) || {},
      timestamp: new Date().toISOString(),
      source: 'supabase'
    };

    this.notifyListeners(event);
  }

  /**
   * Broadcast an event across browser tabs and local subscribers
   */
  public broadcastLocalChange(
    table: string,
    eventType: RealtimeEventType,
    newRecord: Record<string, unknown> = {},
    oldRecord: Record<string, unknown> = {}
  ): void {
    const event: RealtimePayload = {
      table,
      eventType,
      new: newRecord,
      old: oldRecord,
      timestamp: new Date().toISOString(),
      source: 'broadcast'
    };

    // Cross-tab broadcast
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch (e) {
        console.warn('Broadcast channel postMessage error:', e);
      }
    }

    // Local storage event fallback
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'ttt_realtime_event',
          JSON.stringify({ ...event, _t: Date.now() })
        );
      } catch {}
    }
  }

  private notifyListeners(event: RealtimePayload) {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (err) {
        console.error('Error in realtime listener:', err);
      }
    });
  }

  private teardownChannel(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch (e) {
        console.warn('Error removing realtime channel:', e);
      }
      this.channel = null;
    }

    this.isSubscribed = false;
    this.setStatus('DISCONNECTED');
  }

  public cleanup(): void {
    this.teardownChannel();
    this.listeners.clear();
    this.statusListeners.clear();
  }
}

export const realtimeService = new RealtimeService();
