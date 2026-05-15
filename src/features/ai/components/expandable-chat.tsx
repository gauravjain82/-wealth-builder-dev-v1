import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Send, Trash2, User, X } from 'lucide-react';
import { cn } from '@/core/utils';
import { clearAIChat, sendAIChatMessage } from '../services/ai-chat-service';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
};

const WELCOME_MESSAGE = "Hey there! I'm your AI assistant. I'm here to fire you up and help you work through questions, doubts, and next steps. What's on your mind?";

function createMessage(role: ChatMessage['role'], content: string, isError = false): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    timestamp: new Date(),
    isError,
  };
}

export function ExpandableChat() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createMessage('assistant', WELCOME_MESSAGE)]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentPage = useMemo(() => {
    const search = location.search || '';
    return `${location.pathname}${search}`;
  }, [location.pathname, location.search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    setInputValue('');
    setError(null);
    setMessages((prev) => [...prev, createMessage('user', trimmed)]);
    setIsLoading(true);

    try {
      const response = await sendAIChatMessage(trimmed, currentPage);
      setMessages((prev) => [...prev, createMessage('assistant', response.assistantMessage)]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong while contacting the AI assistant.';
      setError(message);
      setMessages((prev) => [
        ...prev,
        createMessage('assistant', 'Something went wrong, but we can try again. Ask me again in a second.', true),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear all chat messages and start fresh?')) return;

    try {
      await clearAIChat();
      setMessages([createMessage('assistant', "Fresh start. Let's go. What do you need help with?")]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear chat.');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[80]">
      <div
        className={cn(
          'pointer-events-none invisible fixed inset-0 opacity-0 transition-all duration-300 sm:absolute sm:inset-auto sm:bottom-[calc(100%+12px)] sm:right-0 sm:h-[600px] sm:w-[430px] sm:scale-95 sm:rounded-2xl',
          isOpen && 'pointer-events-auto visible opacity-100 sm:scale-100'
        )}
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden border border-yellow-500/50 bg-gradient-to-br from-black/90 via-black/80 to-black/90 shadow-2xl backdrop-blur-lg sm:rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-transparent to-yellow-400/5 opacity-50" />

          <div className="relative z-10 flex items-center justify-between border-b border-yellow-400/30 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg">
                <User className="h-5 w-5 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-yellow-400">Personal Assistant</h2>
                <p className="text-xs text-white/70">{isLoading ? 'Thinking...' : 'Ready to help'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white sm:hidden"
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative z-10 flex flex-1 flex-col overflow-y-auto p-6">
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-200">
                <div className="font-semibold">Note</div>
                <div className="mt-1 text-xs">{error}</div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                        : 'bg-gradient-to-br from-yellow-400 to-yellow-500'
                    )}
                  >
                    {message.role === 'user' ? (
                      <MessageCircle className="h-4 w-4 text-white" />
                    ) : (
                      <User className="h-4 w-4 text-black" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] flex-1 rounded-2xl border px-4 py-3',
                      message.role === 'user'
                        ? 'border-blue-500/30 bg-blue-600/30'
                        : message.isError
                        ? 'border-yellow-500/30 bg-yellow-600/20'
                        : 'border-white/20 bg-white/10'
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">{message.content}</p>
                    <p className="mt-2 text-xs text-white/40">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500">
                    <User className="h-4 w-4 animate-pulse text-black" />
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-400" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-400" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="relative z-10 border-t border-yellow-400/30 p-6">
            <div className="flex gap-2">
              <div className="relative flex-1 overflow-hidden rounded-xl border border-yellow-400/30 bg-black/30 backdrop-blur-sm">
                <textarea
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Ask me anything..."
                  className="min-h-[44px] w-full resize-none bg-transparent p-3 pr-12 text-sm text-white outline-none placeholder:text-white/50"
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className={cn(
                  'h-11 w-11 rounded-xl transition-all duration-200',
                  inputValue.trim() && !isLoading
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-500/25'
                    : 'cursor-not-allowed bg-white/10 text-white/30'
                )}
              >
                <Send className="mx-auto h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 text-center">
              <p className="text-xs text-white/50">Here to motivate and inspire you</p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-yellow-300/20 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg transition-all duration-300 hover:scale-110 hover:from-yellow-500 hover:to-yellow-600 hover:shadow-xl hover:shadow-yellow-500/25"
        title={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <User className="h-6 w-6" />}
      </button>
    </div>
  );
}
