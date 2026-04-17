"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { format, subDays } from "date-fns";
import Link from "next/link";
import {
  Send,
  Sparkles,
  RotateCcw,
  Dumbbell,
  Utensils,
  Settings,
  Bot,
} from "lucide-react";
import { askAIChat } from "@/lib/ai";
import {
  getSettings,
  getMacroTargets,
  getMetrics,
  getWorkouts,
  getMeals,
  getDailyMacros,
  getWater,
  getAiSettings,
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
  AI_MODELS_FALLBACK,
  getCachedModels,
  type ChatMessage,
} from "@/lib/storage";

const SUGGESTIONS = [
  "How am I doing this week?",
  "What should I eat for dinner?",
  "Create a workout for today",
  "Am I eating enough protein?",
  "Help me break through my plateau",
  "What should I improve?",
];

type SlashCommand = {
  command: string;
  href: string;
  description: string;
};

const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/log meal", href: "/log", description: "Log a meal" },
  { command: "/log weight", href: "/log", description: "Log your weight" },
  { command: "/workout start", href: "/workouts", description: "Start a workout" },
  { command: "/plan week", href: "/plan", description: "Plan your week" },
  { command: "/grocery", href: "/grocery", description: "Open grocery list" },
  { command: "/progress", href: "/progress", description: "View progress" },
];

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadChat = useCallback(() => {
    setMessages(getChatHistory());
  }, []);

  useEffect(() => {
    setMounted(true);
    loadChat();
  }, [loadChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const aiSettings = getAiSettings();
  const hasKey = !!aiSettings.apiKey || !!process.env.NEXT_PUBLIC_HAS_API_KEY;
  const models = getCachedModels() ?? AI_MODELS_FALLBACK;
  const modelName = models.find((m) => m.id === aiSettings.model)?.name ?? aiSettings.model;

  // No API key configured
  if (!hasKey) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">AI Coach</h1>
        <div className="bg-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles size={28} className="text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Set up your AI key</p>
            <p className="text-xs text-slate-400 mt-1">
              To chat with your fitness coach, add your Anthropic API key in Settings.
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition"
          >
            <Settings size={14} /> Go to AI Settings
          </Link>
        </div>
      </div>
    );
  }

  function buildCoachPrompt(): string {
    const settings = getSettings();
    const macroTargets = getMacroTargets(settings);
    const metrics = getMetrics();
    const workouts = getWorkouts();
    const today = format(new Date(), "yyyy-MM-dd");

    const recentWeights = metrics
      .slice(0, 5)
      .map((m) => `${m.date}: ${m.weight}kg`)
      .join(", ");

    const recentWorkouts = workouts
      .slice(0, 5)
      .map(
        (w) =>
          `${w.date}: ${w.name} (${w.exercises.length} exercises, ${w.duration}min)`
      )
      .join("\n");

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      return getDailyMacros(d);
    });
    const avgCals = Math.round(
      last7Days.reduce((s, d) => s + d.calories, 0) / 7
    );
    const avgProtein = Math.round(
      last7Days.reduce((s, d) => s + d.protein, 0) / 7
    );

    const waterAvg = Math.round(
      Array.from({ length: 7 }, (_, i) =>
        getWater(format(subDays(new Date(), i), "yyyy-MM-dd"))
      ).reduce((s, g) => s + g, 0) / 7
    );

    const todayMacros = getDailyMacros(today);

    return `You are FitLife Coach, a knowledgeable and encouraging personal fitness and nutrition coach. You have access to the user's complete health and fitness data:

**Profile:**
- Name: ${settings.name}
- Goal: ${settings.weightGoal} (${settings.weightGoal === "lose" ? "losing weight" : settings.weightGoal === "gain" ? "gaining weight" : "maintaining weight"})
- Current weight: ${metrics[0]?.weight ?? "unknown"}kg

**Nutrition Targets:**
- Daily calories: ${settings.calorieTarget}, Protein: ${macroTargets.protein}g, Carbs: ${macroTargets.carbs}g, Fat: ${macroTargets.fat}g

**Today's Intake (${today}):**
- Calories: ${todayMacros.calories}/${settings.calorieTarget}, Protein: ${todayMacros.protein}g, Carbs: ${todayMacros.carbs}g, Fat: ${todayMacros.fat}g

**Recent Activity (last 7 days):**
- Workouts:\n${recentWorkouts || "None logged"}
- Average daily calories: ${avgCals}, Average protein: ${avgProtein}g
- Weight trend: ${recentWeights || "No entries"}
- Water intake average: ${waterAvg} glasses/day

Based on this data, provide personalized, actionable advice. Be encouraging but honest. Use metric units. Keep responses concise (under 200 words unless the user asks for detail). If asked to create a workout or meal plan, format it clearly with structure. Use markdown formatting (bold, lists) for readability.`;
  }

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    saveChatHistory(updated);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const systemPrompt = buildCoachPrompt();
      // Send last 20 messages (10 pairs) for context
      const contextMessages = updated.slice(-20).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await askAIChat({
        system: systemPrompt,
        messages: contextMessages,
        maxTokens: 1024,
      });

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };

      const withResponse = [...updated, assistantMsg];
      setMessages(withResponse);
      saveChatHistory(withResponse);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to get response"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    clearChatHistory();
    setMessages([]);
    setError("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-600/20 rounded-lg flex items-center justify-center">
            <Bot size={18} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">AI Coach</h1>
            <p className="text-[10px] text-slate-500">Using {modelName}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            <RotateCcw size={12} /> New Chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pb-2">
        {messages.length === 0 && !loading && (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 bg-violet-600/10 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles size={24} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Hi! I&apos;m your fitness coach.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ask me anything about your fitness, nutrition, or training.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 px-3 py-1.5 rounded-full transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="text-xs leading-relaxed prose-sm">
                    <RenderMarkdown text={msg.content} />
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
            {/* Smart action buttons for assistant messages */}
            {msg.role === "assistant" && (
              <SmartActions content={msg.content} />
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="pt-2 border-t border-slate-800 relative">
        <SlashMenu query={input} onClose={() => setInput("")} />
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach... (type / for quick actions)"
            rows={1}
            className="flex-1 bg-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500 resize-none max-h-24"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SlashMenu({ query, onClose }: { query: string; onClose: () => void }) {
  if (!query.startsWith("/")) return null;

  const q = query.toLowerCase();
  const matches = SLASH_COMMANDS.filter((c) => c.command.toLowerCase().startsWith(q));

  if (matches.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-40">
      <div className="px-3 py-1.5 text-[10px] text-slate-500 font-medium uppercase tracking-wide border-b border-slate-700/50">
        Quick actions
      </div>
      <ul>
        {matches.map((c) => (
          <li key={c.command}>
            <Link
              href={c.href}
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-700 transition"
            >
              <span className="text-xs font-mono text-violet-300">{c.command}</span>
              <span className="text-[10px] text-slate-400">{c.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Simple Markdown Renderer ---
function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="font-semibold text-white mt-2 mb-1">
          {formatInline(line.slice(4))}
        </p>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="font-bold text-white mt-2 mb-1">
          {formatInline(line.slice(3))}
        </p>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, j) => (
            <li key={j}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1">
          {items.map((item, j) => (
            <li key={j}>{formatInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="my-0.5">
        {formatInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function formatInline(text: string): ReactNode {
  // Bold + italic patterns
  const parts: ReactNode[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={match.index} className="italic font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {match[3]}
        </strong>
      );
    } else if (match[4]) {
      parts.push(
        <em key={match.index} className="italic">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      parts.push(
        <code
          key={match.index}
          className="bg-slate-700 px-1 py-0.5 rounded text-[10px]"
        >
          {match[5]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

// --- Smart Action Buttons ---
function SmartActions({ content }: { content: string }) {
  const lower = content.toLowerCase();
  const hasWorkout =
    (lower.includes("exercise") || lower.includes("set") || lower.includes("rep")) &&
    (lower.includes("workout") || lower.includes("training") || lower.includes("routine"));
  const hasMeal =
    (lower.includes("calorie") || lower.includes("protein") || lower.includes("meal")) &&
    (lower.includes("eat") || lower.includes("recipe") || lower.includes("suggest"));

  if (!hasWorkout && !hasMeal) return null;

  return (
    <div className="flex gap-2 mt-1.5 ml-1">
      {hasWorkout && (
        <Link
          href="/workouts"
          className="flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 bg-teal-600/10 px-2 py-1 rounded-lg transition"
        >
          <Dumbbell size={10} /> Start Workout
        </Link>
      )}
      {hasMeal && (
        <Link
          href="/log"
          className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 bg-amber-600/10 px-2 py-1 rounded-lg transition"
        >
          <Utensils size={10} /> Log Meal
        </Link>
      )}
    </div>
  );
}
