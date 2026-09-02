export interface AICreditState {
  dailyQuota: number;
  usedToday: number;
  remaining: number;
  lastUsedDate: string; // YYYY-MM-DD
  lifetimeUsed: number;
}

const STORAGE_KEY = 'ttt_ai_credits_v1';
const DEFAULT_DAILY_QUOTA = 50;

class AICreditService {
  private listeners: Set<(state: AICreditState) => void> = new Set();

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  public getCredits(): AICreditState {
    const today = this.getTodayString();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AICreditState = JSON.parse(raw);
        // Check if date changed -> reset daily counter
        if (parsed.lastUsedDate !== today) {
          const resetState: AICreditState = {
            dailyQuota: DEFAULT_DAILY_QUOTA,
            usedToday: 0,
            remaining: DEFAULT_DAILY_QUOTA,
            lastUsedDate: today,
            lifetimeUsed: parsed.lifetimeUsed || 0,
          };
          this.saveCredits(resetState);
          return resetState;
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed reading AI credits:', e);
    }

    const defaultState: AICreditState = {
      dailyQuota: DEFAULT_DAILY_QUOTA,
      usedToday: 0,
      remaining: DEFAULT_DAILY_QUOTA,
      lastUsedDate: today,
      lifetimeUsed: 0,
    };
    this.saveCredits(defaultState);
    return defaultState;
  }

  public useCredits(amount: number = 1): { success: boolean; state: AICreditState } {
    const current = this.getCredits();
    if (current.remaining < amount) {
      return { success: false, state: current };
    }

    const updated: AICreditState = {
      ...current,
      usedToday: current.usedToday + amount,
      remaining: Math.max(0, current.remaining - amount),
      lifetimeUsed: current.lifetimeUsed + amount,
      lastUsedDate: this.getTodayString(),
    };

    this.saveCredits(updated);
    this.notify(updated);
    return { success: true, state: updated };
  }

  public topUpCredits(amount: number = 50): AICreditState {
    const current = this.getCredits();
    const updated: AICreditState = {
      ...current,
      dailyQuota: current.dailyQuota + amount,
      remaining: current.remaining + amount,
      lastUsedDate: this.getTodayString(),
    };
    this.saveCredits(updated);
    this.notify(updated);
    return updated;
  }

  public resetCredits(): AICreditState {
    const updated: AICreditState = {
      dailyQuota: DEFAULT_DAILY_QUOTA,
      usedToday: 0,
      remaining: DEFAULT_DAILY_QUOTA,
      lastUsedDate: this.getTodayString(),
      lifetimeUsed: this.getCredits().lifetimeUsed,
    };
    this.saveCredits(updated);
    this.notify(updated);
    return updated;
  }

  private saveCredits(state: AICreditState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed storing AI credits:', e);
    }
  }

  public subscribe(callback: (state: AICreditState) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(state: AICreditState) {
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error('Credit listener error:', err);
      }
    });
  }
}

export const aiCreditService = new AICreditService();
