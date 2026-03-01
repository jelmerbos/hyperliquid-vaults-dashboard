"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAiChat } from "@/lib/hooks/use-ai-chat";
import { MessageSquare, Send, Square, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface AiChatProps {
  vaultContext: string;
}

export function AiChat({ vaultContext }: AiChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isStreaming, error, sendMessage, stop, clear } =
    useAiChat({ vaultContext });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle className="text-lg">AI Chat</CardTitle>
            <Badge variant="outline" className="text-xs">
              Beta
            </Badge>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-3">
          {/* Messages area */}
          <div className="max-h-96 min-h-[200px] overflow-y-auto rounded-md border bg-muted/30 p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Ask anything about this vault: strategy, risks, positions, performance...
              </p>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="bg-background border rounded-lg px-3 py-2 text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error display */}
          {error && (
            <p className="text-sm text-[#f85149]">{error}</p>
          )}

          {/* Input area */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this vault..."
              disabled={isStreaming}
              className="flex-1"
            />
            {isStreaming ? (
              <Button type="button" variant="outline" size="icon" onClick={stop}>
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
            {messages.length > 0 && !isStreaming && (
              <Button type="button" variant="ghost" size="icon" onClick={clear}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </form>
        </CardContent>
      )}
    </Card>
  );
}
