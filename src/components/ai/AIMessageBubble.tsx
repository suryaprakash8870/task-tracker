import React, { useState } from 'react';
import { AIChatMessage, User, Task } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  Sparkles,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Bot
} from 'lucide-react';

interface AIMessageBubbleProps {
  message: AIChatMessage;
  currentUser: User;
  onSelectTask?: (taskId: string) => void;
  onRetry?: () => void;
}

export const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({
  message,
  currentUser,
  onSelectTask,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'liked' | 'disliked') => {
    setFeedback(prev => (prev === type ? null : type));
  };

  // Format content for rendering
  const renderFormattedContent = (content: string) => {
    // Basic Markdown parser for bullet points, bolding, inline code, and paragraphs
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-[13px]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Bullet list items
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            const itemText = trimmed.replace(/^[-*•]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-indigo-500 font-bold mt-1 text-[8px]">•</span>
                <span className="flex-1" dangerouslySetInnerHTML={{ __html: formatInline(itemText) }} />
              </div>
            );
          }

          // Numbered lists
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="font-mono text-zinc-400 text-[11px] font-semibold">{numMatch[1]}.</span>
                <span className="flex-1" dangerouslySetInnerHTML={{ __html: formatInline(numMatch[2]) }} />
              </div>
            );
          }

          // Bold Headers (e.g. ### Header or **Header**)
          if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
            const hText = trimmed.replace(/^#+\s+/, '');
            return (
              <h4 key={idx} className="font-bold text-zinc-900 mt-2 mb-1 text-xs sm:text-sm">
                {hText}
              </h4>
            );
          }

          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
          );
        })}
      </div>
    );
  };

  const formatInline = (text: string) => {
    return text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>')
      // Inline Code
      .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 font-mono text-[11px] border border-zinc-200/60">$1</code>');
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[11px] font-medium border border-zinc-200/80">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`group flex gap-3 ${
        isAssistant ? 'items-start' : 'items-start flex-row-reverse'
      } transition-opacity duration-200`}
    >
      {/* Avatar */}
      {isAssistant ? (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-2xs shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      ) : (
        <Avatar user={currentUser} size="sm" className="mt-0.5 shrink-0 shadow-2xs" />
      )}

      {/* Message Bubble Container */}
      <div className={`flex flex-col max-w-[88%] sm:max-w-[82%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-zinc-400">
          <span className="font-medium text-zinc-600">
            {isAssistant ? 'Gemini 2.5 Flash' : currentUser.name}
          </span>
          <span>•</span>
          <span className="font-mono text-[10px]">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Content Box */}
        <div
          className={`rounded-2xl px-4 py-3 shadow-2xs ${
            isAssistant
              ? 'bg-white border border-zinc-200/90 text-zinc-800 rounded-tl-sm'
              : 'bg-zinc-900 text-white rounded-tr-sm'
          }`}
        >
          {renderFormattedContent(message.content)}

          {/* Tool Invocations Display */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-zinc-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Executed Actions ({message.toolCalls.length})
                </span>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-indigo-600 hover:text-indigo-700 text-[10px] flex items-center gap-0.5 cursor-pointer"
                >
                  {showDetails ? 'Hide details' : 'Show details'}
                  {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {message.toolCalls.map((tc, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-xs border ${
                    tc.status === 'success'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : tc.status === 'ambiguous'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold font-mono text-[11px]">{tc.name}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-white/80">
                      {tc.status}
                    </span>
                  </div>

                  {tc.result?.message && (
                    <p className="mt-1 text-[11px] leading-snug">{tc.result.message}</p>
                  )}

                  {/* Quick Jump Link if task ID returned */}
                  {tc.result?.data?.task?.id && onSelectTask && (
                    <button
                      onClick={() => onSelectTask(tc.result.data.task.id)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                    >
                      <span>Open created task "{tc.result.data.task.title}"</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {showDetails && (
                    <pre className="mt-1.5 p-1.5 bg-black/5 rounded text-[10px] font-mono overflow-x-auto">
                      {JSON.stringify(tc.args, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Toolbar on Hover (for Assistant messages) */}
        {isAssistant && (
          <div className="flex items-center gap-1 mt-1.5 px-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
              title="Copy response"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleFeedback('liked')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                feedback === 'liked' ? 'text-indigo-600 bg-indigo-50' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
              }`}
              title="Good response"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleFeedback('disliked')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                feedback === 'disliked' ? 'text-rose-600 bg-rose-50' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
              }`}
              title="Bad response"
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                title="Regenerate response"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
