"use client";
import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types";

const SUGGESTIONS = [
  "Which events had the highest registrations this year?",
  "What's the average feedback rating across categories?",
  "Show me internal vs external participant breakdown",
  "Which organizer managed the most events?",
  "What's the registration-to-attendance conversion rate?",
  "How many events ran each month?",
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "Hi! I'm your Eventura analytics assistant. Ask me anything about your event data — registrations, attendance, participant trends, organizer activity, and more. I can query your analytics views and generate custom insights.",
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [preloadContext, setPreloadContext] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const userText = text || input.trim();
    if (!userText) return;

    setInput("");
    const userMsg: ChatMessage = { role: "user", content: userText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          preload_context: preloadContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const aiMsg: ChatMessage = {
        role: "assistant",
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      // If there's query data, append a table summary
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const keys = Object.keys(data.data[0]);
        const tableText = `\n\n📊 **Query Results** (${data.data.length} rows)\n${keys.join(" | ")}\n${data.data.slice(0, 10).map((row: Record<string, unknown>) => keys.map(k => row[k]).join(" | ")).join("\n")}${data.data.length > 10 ? `\n... and ${data.data.length - 10} more rows` : ""}`;
        aiMsg.content += tableText;
      }

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Sorry, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function formatContent(text: string) {
    // Convert basic markdown to styled text
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/📊.*\n/g, "<div style='font-weight:600;color:var(--navy);margin-top:12px'>$&</div>")
      .replace(/\n/g, "<br/>");
  }

  return (
    <div className="fade-in" style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 style={{ fontSize: "28px", color: "var(--navy)" }}>AI Assistant</h1>
            <span style={{ fontSize: "10px", padding: "2px 8px", background: "var(--saffron)", color: "var(--navy)", borderRadius: "99px", fontWeight: 700, letterSpacing: "0.06em" }}>BETA</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Natural language analytics — powered by Mistral-7B via HuggingFace</p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={preloadContext}
            onChange={e => setPreloadContext(e.target.checked)}
            style={{ accentColor: "var(--navy)" }}
          />
          Preload all view data
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>(slower but more accurate)</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
        {/* Chat */}
        <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <div style={{ width: 22, height: 22, background: "var(--navy)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>✦</div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>Eventura AI</span>
                  </div>
                )}
                <div
                  className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}
                  dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                />
                {msg.timestamp && (
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <div style={{ width: 22, height: 22, background: "var(--navy)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>✦</div>
                <div className="chat-bubble-ai" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <div className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)" }} />
                  <div className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)", animationDelay: "0.2s" }} />
                  <div className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)", animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                className="input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask about your event data..."
                disabled={loading}
              />
              <button
                className="btn btn-primary"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{ flexShrink: 0 }}
              >
                {loading ? "..." : "Send →"}
              </button>
            </div>
          </div>
        </div>

        {/* Suggestions panel */}
        <div style={{ width: "240px", flexShrink: 0 }}>
          <div className="card" style={{ padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "12px" }}>
              Suggested Questions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  style={{
                    background: "var(--cream)", border: "1px solid var(--border)",
                    borderRadius: "8px", padding: "9px 12px", textAlign: "left",
                    fontSize: "12px", cursor: "pointer", color: "var(--text-primary)",
                    lineHeight: 1.4, transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "16px", marginTop: "12px", background: "var(--navy)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--saffron)", marginBottom: "8px" }}>
              How it works
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              The AI uses Mistral-7B-Instruct via HuggingFace. It reads your analytics views first, then generates safe read-only SQL for complex questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
