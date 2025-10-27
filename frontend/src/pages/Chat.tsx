import { useState, useEffect, useRef } from "react";
import { Send, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import StatusIndicator from "@/components/StatusIndicator";
import Navigation from "@/components/Navigation";
import ChatMessage from "@/components/ChatMessages";
import ClauseDisplay from "@/components/ClauseDisplay";
import ContextCard from "@/components/ContextCard";
import { API_ENDPOINTS } from "@/config/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  answer?: string;
  citations?: string[];
  route?: string;
  clause?: any;
  contexts?: any[];
  ambiguity_reason?: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load thread ID and messages from localStorage on mount
    const savedThreadId = localStorage.getItem('chatThreadId');
    const savedMessages = localStorage.getItem('chatMessages');

    if (savedThreadId) {
      setThreadId(savedThreadId);
    } else {
      const newThreadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setThreadId(newThreadId);
      localStorage.setItem('chatThreadId', newThreadId);
    }

    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Failed to parse saved messages:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Save messages to localStorage whenever they change
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    // Save threadId to localStorage whenever it changes
    if (threadId) {
      localStorage.setItem('chatThreadId', threadId);
    }
  }, [threadId]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, question: input }),
      });

      if (!response.ok) throw new Error("API request failed");

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer || "",
        answer: data.answer,
        citations: data.citations,
        route: data.route,
        clause: data.clause,
        contexts: data.contexts,
        ambiguity_reason: data.ambiguity_reason,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyThread = () => {
    navigator.clipboard.writeText(threadId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lastMessage = messages[messages.length - 1];
  const showClause = lastMessage?.role === "assistant" && lastMessage.clause;
  const showContexts = lastMessage?.role === "assistant" && lastMessage.contexts;

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚖️</span>
            <h1 className="text-xl font-semibold">Deontic Logic Assistant</h1>
          </div>
          <div className="flex items-center gap-6">
            <Navigation />
            <StatusIndicator />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversation Panel */}
        <div className="flex-[7] flex flex-col border-r">
          <ScrollArea className="flex-1 px-6 py-6" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <p className="text-muted-foreground text-lg mb-2">
                    Ask about the EU AI Act
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try: "What are the obligations for providers under Article 10?"
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg} />
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Composer */}
          <div className="border-t p-4 bg-card">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about regulatory obligations..."
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Evidence & Clause Panel */}
        <div className="flex-[3] flex flex-col bg-surface">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Retrieved Context */}
              {showContexts && lastMessage.contexts && lastMessage.contexts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                    Retrieved Context
                  </h3>
                  <div className="space-y-3">
                    {lastMessage.contexts.map((ctx, idx) => (
                      <ContextCard key={idx} context={ctx} />
                    ))}
                  </div>
                </div>
              )}

              {/* Structured Clause */}
              {showClause && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                    Structured Clause
                  </h3>
                  <ClauseDisplay clause={lastMessage.clause} />
                </div>
              )}

              {!showContexts && !showClause && (
                <div className="flex items-center justify-center h-full text-center">
                  <p className="text-sm text-muted-foreground">
                    Evidence and clause details will appear here
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Thread ID:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {threadId.slice(0, 24)}...
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyThread}
              className="h-7 w-7 p-0"
            >
              {copied ? (
                <Check className="h-3 w-3 text-status-ok" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Chat;
