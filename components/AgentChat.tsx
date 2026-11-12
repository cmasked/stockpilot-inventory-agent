"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentResult, AgentStep } from "@/lib/agent/types";

type Message = { role: "user" | "model"; text: string; steps?: AgentStep[] };

const FRESHMART_SAMPLE_PROMPTS = [
  "Which products are critically low on stock right now?",
  "Draft purchase orders for all low-stock dairy and bakery items.",
  "Estimate days of stock remaining for Staples and Snacks.",
  "Group low stock items by supplier and estimate total replenishment cost.",
];

interface AgentChatProps {
  onDataChanged?: () => void;
  prefillPrompt?: string;
}

export default function AgentChat({ onDataChanged, prefillPrompt }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefillPrompt) {
      setInput(prefillPrompt);
    }
  }, [prefillPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: "user", text: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-20).map(({ role, text }) => ({ role, text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Agent execution failed");
      const result = data as AgentResult;
      setMessages([...next, { role: "model", text: result.reply, steps: result.steps }]);
      if (result.steps && result.steps.some((s) => s.writes && s.ok)) {
        onDataChanged?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong communicating with Gemini");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[76vh] flex-col rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200 px-4 py-3 bg-slate-50/50 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <h2 className="font-bold text-slate-900 text-sm">StockPilot Agent (Velachery Branch)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Autonomous stock analysis, runway forecasting, and draft Purchase Order creation.
          </p>
        </div>
        <span className="text-[11px] font-mono bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">
          gemini-3.5-flash-lite
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3 py-4">
            <div className="text-center max-w-md mx-auto space-y-1 mb-6">
              <div className="text-2xl">🤖</div>
              <h3 className="font-semibold text-slate-900 text-sm">Hello, FreshMart Store Manager!</h3>
              <p className="text-xs text-slate-500">
                I can check real-time inventory, calculate days of runway, group depletions by supplier, and generate official Purchase Orders in Supabase.
              </p>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Suggested Restock Queries:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {FRESHMART_SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-lg border border-slate-200 p-3 text-left text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-2xs transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xs"
                  : "max-w-[88%] space-y-2.5"
              }
            >
              {/* Show tool calls */}
              {m.steps && m.steps.length > 0 && <ToolSteps steps={m.steps} />}

              {m.role === "model" ? (
                <div className="whitespace-pre-wrap rounded-2xl bg-slate-100/90 border border-slate-200/60 px-4 py-3 text-sm text-slate-800 leading-relaxed shadow-2xs">
                  {m.text}
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <span>StockPilot is analyzing inventory and executing database tools...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-slate-200 p-3 bg-slate-50/50"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask StockPilot about inventory or instruct to draft purchase orders..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-slate-800 transition-colors shrink-0 shadow-xs"
        >
          Send
        </button>
      </form>
    </div>
  );
}

/** Shows each tool call with structured details */
function ToolSteps({ steps }: { steps: AgentStep[] }) {
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => (
        <details key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-2xs">
          <summary className="cursor-pointer select-none flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${s.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span className="font-mono font-semibold text-slate-800">{s.tool}</span>
              <span className={`text-[10px] font-bold ${s.ok ? "text-emerald-700" : "text-rose-600"}`}>
                {s.ok ? "SUCCESS" : "ERROR"}
              </span>
            </div>
            {s.writes && (
              <span className="rounded bg-amber-100 text-amber-800 font-semibold text-[10px] px-1.5 py-0.5">
                Writes to Database
              </span>
            )}
          </summary>
          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 font-mono text-[11px]">
            {s.args != null && (
              <div>
                <span className="text-slate-400">Arguments:</span>
                <pre className="overflow-x-auto whitespace-pre-wrap bg-slate-50 p-1.5 rounded text-slate-700 mt-0.5">
                  {JSON.stringify(s.args, null, 2)}
                </pre>
              </div>
            )}
            <div>
              <span className="text-slate-400">Result:</span>
              <pre className="overflow-x-auto whitespace-pre-wrap bg-slate-50 p-1.5 rounded text-slate-700 mt-0.5">
                {JSON.stringify(s.ok ? s.result : s.error, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
