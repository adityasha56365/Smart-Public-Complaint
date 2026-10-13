/**
 * JanSahayak AI Chatbot Component
 * A floating multilingual AI assistant for the Civicly citizen portal.
 * Matches the existing Figma design system (colors, fonts, radius from index.css).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { chatService } from "../../services/chatService";
import type { ChatMessage, ComplaintDraft, ComplaintStatusInfo, DraftSubmitResult } from "../../services/chatService";

// ── Markdown-lite renderer (bold, bullets) ─────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      // Italic: *text*
      return part.split(/(\*[^*]+\*)/g).map((p, k) => {
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
          return <em key={k}>{p.slice(1, -1)}</em>;
        }
        return p;
      });
    });
    return (
      <span key={i} style={{ display: "block", marginBottom: i < lines.length - 1 ? 4 : 0 }}>
        {parts}
      </span>
    );
  });
}

// ── Timestamp formatter ────────────────────────────────────────────────────
function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Complaint status card ──────────────────────────────────────────────────
function ComplaintStatusCard({ info }: { info: ComplaintStatusInfo }) {
  const statusColors: Record<string, string> = {
    submitted: "#326cc5",
    under_review: "#b7791f",
    assigned: "#5268a5",
    in_progress: "#087f8c",
    awaiting_info: "#b7791f",
    resolved: "#23845b",
    reopened: "#b7791f",
    rejected: "#c74646",
    closed: "#65727d",
  };
  const color = statusColors[info.status] || "#65727d";

  return (
    <div style={{
      background: "white",
      border: "1px solid #dce3e7",
      borderRadius: 12,
      padding: "14px 16px",
      marginTop: 8,
      fontSize: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#17324d", marginBottom: 2 }}>{info.title}</div>
          <div style={{ color: "#65727d", fontSize: 10 }}>{info.reference_number}</div>
        </div>
        <span style={{
          background: color + "18",
          color,
          borderRadius: 20,
          padding: "4px 10px",
          fontWeight: 700,
          fontSize: 10,
          flexShrink: 0,
          marginLeft: 8,
        }}>
          {info.status.replace(/_/g, " ").toUpperCase()}
        </span>
      </div>
      <div style={{ color: "#65727d", fontSize: 11, marginBottom: 6 }}>{info.status_label}</div>
      {info.category && <div style={{ fontSize: 11, color: "#65727d" }}>📂 {info.category}</div>}
      {info.location && <div style={{ fontSize: 11, color: "#65727d" }}>📍 {info.location}</div>}
      <div style={{ fontSize: 10, color: "#8b969d", marginTop: 8, borderTop: "1px solid #dce3e7", paddingTop: 8 }}>
        Submitted: {info.submitted_at} · Updated: {info.updated_at}
      </div>
      {info.history.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 10, color: "#17324d", marginBottom: 4 }}>STATUS HISTORY</div>
          {info.history.slice(-4).map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: statusColors[h.status] || "#65727d",
                marginTop: 4, flexShrink: 0,
              }} />
              <div>
                <span style={{ fontWeight: 600, fontSize: 10 }}>{h.status.replace(/_/g, " ")}</span>
                <span style={{ color: "#8b969d", fontSize: 10 }}> · {h.date}</span>
                {h.reason && <div style={{ color: "#65727d", fontSize: 10 }}>{h.reason}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Complaint draft preview card ────────────────────────────────────────────
function ComplaintDraftCard({
  draft,
  onEdit,
  onSubmit,
  onSaveDraft,
  submitting,
}: {
  draft: ComplaintDraft;
  onEdit: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  submitting: boolean;
}) {
  return (
    <div style={{
      background: "white",
      border: "2px solid #087f8c",
      borderRadius: 12,
      padding: "14px 16px",
      marginTop: 8,
      fontSize: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>📋</span>
        <strong style={{ color: "#17324d", fontSize: 13 }}>Complaint Draft</strong>
        <span style={{ background: "#e8f3ef", color: "#087f8c", borderRadius: 10, padding: "2px 8px", fontSize: 9, fontWeight: 700, marginLeft: "auto" }}>PREVIEW</span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 11, color: "#087f8c", marginBottom: 2 }}>TITLE</div>
          <div style={{ color: "#17324d", fontSize: 12 }}>{draft.title}</div>
        </div>
        {draft.category_name && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#087f8c", marginBottom: 2 }}>CATEGORY</div>
            <div style={{ color: "#17324d", fontSize: 12 }}>{draft.category_name}</div>
          </div>
        )}
        {draft.location_address && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: "#087f8c", marginBottom: 2 }}>LOCATION</div>
            <div style={{ color: "#17324d", fontSize: 12 }}>{draft.location_address}</div>
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 11, color: "#087f8c", marginBottom: 2 }}>DESCRIPTION</div>
          <div style={{ color: "#17324d", fontSize: 12, lineHeight: 1.5 }}>{draft.description}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={onEdit}
          disabled={submitting}
          style={{
            flex: 1, height: 36, border: "1px solid #dce3e7", borderRadius: 8,
            background: "white", color: "#17324d", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}
        >
          ✏️ Edit
        </button>
        <button
          onClick={onSaveDraft}
          disabled={submitting}
          style={{
            flex: 1, height: 36, border: "1px solid #dce3e7", borderRadius: 8,
            background: "white", color: "#5268a5", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}
        >
          💾 Save Draft
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            flex: 1.4, height: 36, border: 0, borderRadius: 8,
            background: "#087f8c", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          {submitting ? (
            <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
          ) : "✅ Submit"}
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: "#8b969d", textAlign: "center" }}>
        ⚠️ Complaint will only submit after you confirm above.
      </div>
    </div>
  );
}

// ── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "6px 0" }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "linear-gradient(135deg, #087f8c, #17324d)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontSize: 14, flexShrink: 0,
      }}>J</div>
      <div style={{
        background: "white",
        border: "1px solid #dce3e7",
        borderRadius: "18px 18px 18px 4px",
        padding: "10px 14px",
        display: "flex",
        gap: 5,
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(23,50,77,0.06)",
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#087f8c",
            animation: `chatBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Main Chatbot Component ─────────────────────────────────────────────────
type MessageExtra =
  | { type: "status"; data: ComplaintStatusInfo }
  | { type: "draft"; data: ComplaintDraft }
  | { type: "submit-result"; data: DraftSubmitResult }
  | { type: "none" };

interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  extra?: MessageExtra;
  suggestions?: string[];
}

const WELCOME_MESSAGE: UIMessage = {
  id: "welcome",
  role: "assistant",
  content: "Namaste! Main **JanSahayak AI** hoon. Main aapki complaint likhne, complaint register karne aur aapke sawaalon ka jawab dene mein madad kar sakta hoon. 🙏",
  timestamp: new Date(),
  suggestions: [
    "Register a Complaint",
    "Help Me Write a Complaint",
    "Track My Complaint",
    "How to Use This App",
    "Ask a Question",
  ],
};

export default function JanSahayakChat() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const [currentDraft, setCurrentDraft] = useState<ComplaintDraft | null>(null);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, typing, open]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const addMessage = useCallback((msg: Omit<UIMessage, "id" | "timestamp">) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now().toString() + Math.random(), timestamp: new Date() }]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setInput("");
    setError("");

    // Check for reference number tracking
    const refMatch = trimmed.toUpperCase().match(/CMP-[A-Z0-9]{8}/);

    // Add user message
    addMessage({ role: "user", content: trimmed });
    setTyping(true);
    setCurrentDraft(null);

    // Build history for API (exclude welcome and system messages)
    const history = messages
      .filter(m => m.id !== "welcome" && (m.role === "user" || m.role === "assistant"))
      .slice(-20)
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      // Handle complaint tracking with reference number
      if (refMatch && isAuthenticated) {
        const statusInfo = await chatService.getComplaintStatus(refMatch[0]);
        setTyping(false);
        addMessage({
          role: "assistant",
          content: `Aapki complaint ka status mil gaya hai:`,
          extra: { type: "status", data: statusInfo },
          suggestions: ["Register a Complaint", "Track Another Complaint"],
        });
        return;
      }

      // Regular chat
      const response = await chatService.sendMessage({
        message: trimmed,
        history,
        session_id: sessionId,
      });

      setTyping(false);

      // Check if response suggests quick actions that could trigger draft
      const quickActionMap: Record<string, string> = {
        "Register a Complaint": "Mujhe complaint register karni hai",
        "Help Me Write a Complaint": "Complaint likhne mein help chahiye",
        "Track My Complaint": "Meri complaint ka status batao",
        "How to Use This App": "App kaise use karein?",
      };

      const lowerText = trimmed.toLowerCase();
      const mappedText = quickActionMap[trimmed];
      const effectiveText = mappedText || trimmed;

      addMessage({
        role: "assistant",
        content: response.reply,
        extra: response.complaint_draft ? { type: "draft", data: response.complaint_draft } : { type: "none" },
        suggestions: response.suggestion_actions,
      });

      if (response.complaint_draft) {
        setCurrentDraft(response.complaint_draft);
      }
    } catch (err: unknown) {
      setTyping(false);
      const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (axErr.response?.status === 429) {
        setError("Aap bahut jaldi messages bhej rahe hain. Thodi der ruk kar dobara koshish karein.");
      } else if (axErr.response?.status === 401) {
        addMessage({
          role: "assistant",
          content: "Yeh feature ke liye aapko **login karna hoga**. Please apne account mein sign in karein.",
          suggestions: ["Register a Complaint", "How to Use This App"],
        });
      } else if (axErr.response?.status === 404) {
        addMessage({
          role: "assistant",
          content: "Woh complaint nahi mili. Kripya reference number check karein — format hai: **CMP-XXXXXXXX**",
          suggestions: ["Track My Complaint"],
        });
      } else {
        setError("Kuch galat ho gaya. Kripya thodi der mein dobara koshish karein.");
      }
    }
  }, [messages, sessionId, isAuthenticated, addMessage]);

  const handleSubmitDraft = useCallback(async () => {
    if (!currentDraft) return;
    if (!isAuthenticated) {
      addMessage({
        role: "assistant",
        content: "Complaint submit karne ke liye aapko **login karna hoga**. Please sign in karein aur phir wapas aayein.",
        suggestions: [],
      });
      return;
    }
    setSubmittingDraft(true);
    try {
      const result = await chatService.submitDraft(currentDraft);
      setCurrentDraft(null);
      addMessage({
        role: "assistant",
        content: `🎉 **Badhai ho!** Aapki complaint safaltapoorvak submit ho gayi!\n\nReference Number: **${result.reference_number}**\n\nAap 'My Complaints' mein apni complaint track kar sakte hain.`,
        extra: { type: "submit-result", data: result },
        suggestions: ["Track My Complaint", "Register Another Complaint"],
      });
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string } } };
      addMessage({
        role: "assistant",
        content: `Complaint submit nahi ho saki: ${axErr.response?.data?.detail || "Please dobara koshish karein."}`,
        suggestions: ["Register a Complaint"],
      });
    } finally {
      setSubmittingDraft(false);
    }
  }, [currentDraft, isAuthenticated, addMessage]);

  const handleEditDraft = useCallback(() => {
    addMessage({
      role: "assistant",
      content: "Theek hai! Kya aap badalna chahte hain?\n\n• **Title** — complaint ka naam\n• **Location** — jagah ka address\n• **Description** — samasya ka vivaran\n\nKoi bhi badlaav batayein.",
      suggestions: [],
    });
    setCurrentDraft(null);
  }, [addMessage]);

  const handleSaveDraft = useCallback(() => {
    addMessage({
      role: "assistant",
      content: "Draft save kar liya gaya hai. 💾\n\nApp mein 'Report a Problem' section mein jayein aur draft se directly submit kar sakte hain.\n\nYa phir mujhse batayein — main ek nai complaint mein madad kar sakta hoon.",
      suggestions: ["Register a Complaint", "Track My Complaint"],
    });
    setCurrentDraft(null);
  }, [addMessage]);

  const resetChat = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setCurrentDraft(null);
    setError("");
    setInput("");
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Notify badge when closed
  useEffect(() => {
    if (!open && messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") setHasNewMessage(true);
    } else {
      setHasNewMessage(false);
    }
  }, [messages, open]);

  return (
    <>
      {/* Global styles injected once */}
      <style>{`
        @keyframes chatBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes chatSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes chatPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(8,127,140,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(8,127,140,0); }
        }
        .jansahayak-fab { animation: chatPulse 2.5s ease-in-out 1; }
        .jansahayak-panel { animation: chatSlideIn 0.25s ease-out; }
        .jansahayak-suggestion:hover { background: #087f8c !important; color: white !important; border-color: #087f8c !important; }
        .jansahayak-input-wrap textarea:focus { outline: none; border-color: #087f8c !important; box-shadow: 0 0 0 3px rgba(8,127,140,0.15); }
        .jansahayak-close:hover { background: rgba(255,255,255,0.15) !important; }
        .jansahayak-send:hover:not(:disabled) { background: #066b76 !important; }
        .jansahayak-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .jansahayak-reset:hover { background: rgba(255,255,255,0.1) !important; }
      `}</style>

      {/* Floating Action Button */}
      <button
        className="jansahayak-fab"
        id="btn-jansahayak-open"
        onClick={() => { setOpen(o => !o); setHasNewMessage(false); }}
        aria-label={open ? "Close JanSahayak AI" : "Open JanSahayak AI assistant"}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #087f8c 0%, #17324d 100%)",
          color: "white",
          border: 0,
          cursor: "pointer",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(23,50,77,0.28)",
          transition: "transform 0.2s, box-shadow 0.2s",
          fontSize: 26,
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? "✕" : "🤝"}
        {hasNewMessage && !open && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            width: 14, height: 14, borderRadius: "50%",
            background: "#ef6d64", border: "2px solid white",
          }} />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className="jansahayak-panel"
          role="dialog"
          aria-label="JanSahayak AI Chat"
          aria-modal="true"
          style={{
            position: "fixed",
            bottom: 100,
            right: 28,
            width: "min(420px, calc(100vw - 32px))",
            height: "min(620px, calc(100vh - 120px))",
            background: "#f7f8f5",
            borderRadius: 20,
            boxShadow: "0 24px 80px rgba(23,50,77,0.22), 0 4px 16px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 999,
          }}
        >
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #17324d 0%, #087f8c 100%)",
            padding: "16px 18px",
            color: "white",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.25)",
              }}>🤝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "Manrope, sans-serif", letterSpacing: -0.3 }}>
                  JanSahayak AI
                </div>
                <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#48c1bd", display: "inline-block" }} />
                  Online · Hindi · English · Hinglish
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="jansahayak-reset"
                  onClick={resetChat}
                  title="Start new conversation"
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 0,
                    background: "rgba(255,255,255,0.08)", color: "white",
                    cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >🔄</button>
                <button
                  className="jansahayak-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 0,
                    background: "rgba(255,255,255,0.08)", color: "white",
                    cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >✕</button>
              </div>
            </div>
            {!isAuthenticated && (
              <div style={{
                marginTop: 10,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 10,
                opacity: 0.9,
              }}>
                💡 Login karein complaint submit karne aur track karne ke liye
              </div>
            )}
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  /* User bubble */
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                    <div style={{ maxWidth: "80%" }}>
                      <div style={{
                        background: "#17324d",
                        color: "white",
                        borderRadius: "18px 18px 4px 18px",
                        padding: "10px 14px",
                        fontSize: 13,
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: 9, color: "#8b969d", textAlign: "right", marginTop: 3 }}>
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Assistant bubble */
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "linear-gradient(135deg, #087f8c, #17324d)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 14, flexShrink: 0, marginTop: 2,
                    }}>J</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        background: "white",
                        border: "1px solid #dce3e7",
                        borderRadius: "18px 18px 18px 4px",
                        padding: "10px 14px",
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "#18232d",
                        boxShadow: "0 2px 8px rgba(23,50,77,0.06)",
                        wordBreak: "break-word",
                      }}>
                        {renderMarkdown(msg.content)}
                      </div>

                      {/* Status card */}
                      {msg.extra?.type === "status" && (
                        <ComplaintStatusCard info={msg.extra.data} />
                      )}

                      {/* Draft preview card */}
                      {msg.extra?.type === "draft" && msg.id === messages[messages.length - 1]?.id && currentDraft && (
                        <ComplaintDraftCard
                          draft={currentDraft}
                          onEdit={handleEditDraft}
                          onSubmit={handleSubmitDraft}
                          onSaveDraft={handleSaveDraft}
                          submitting={submittingDraft}
                        />
                      )}

                      {/* Submit result */}
                      {msg.extra?.type === "submit-result" && (
                        <div style={{
                          background: "#e5f2eb",
                          border: "1px solid #b3dfc5",
                          borderRadius: 10,
                          padding: "10px 14px",
                          marginTop: 8,
                          fontSize: 12,
                        }}>
                          <div style={{ fontWeight: 700, color: "#23845b" }}>✅ Submitted Successfully</div>
                          <div style={{ color: "#18232d", marginTop: 4 }}>
                            Reference: <strong>{msg.extra.data.reference_number}</strong>
                          </div>
                        </div>
                      )}

                      <div style={{ fontSize: 9, color: "#8b969d", marginTop: 3 }}>
                        {formatTime(msg.timestamp)}
                      </div>

                      {/* Suggestion buttons */}
                      {msg.suggestions && msg.suggestions.length > 0 && msg.id === messages[messages.length - 1]?.id && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {msg.suggestions.map(s => (
                            <button
                              key={s}
                              className="jansahayak-suggestion"
                              onClick={() => sendMessage(s)}
                              style={{
                                border: "1px solid #087f8c",
                                background: "white",
                                color: "#087f8c",
                                borderRadius: 20,
                                padding: "5px 12px",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.15s",
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {typing && <TypingIndicator />}
            {error && (
              <div style={{
                background: "#fff7f6",
                border: "1px solid #f4bebe",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12,
                color: "#c74646",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}>
                <span>⚠️</span>
                <div>
                  {error}
                  <button
                    onClick={() => { setError(""); }}
                    style={{
                      display: "block",
                      marginTop: 4,
                      border: 0,
                      background: "transparent",
                      color: "#c74646",
                      fontWeight: 700,
                      fontSize: 11,
                      padding: 0,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            className="jansahayak-input-wrap"
            style={{
              padding: "12px 14px",
              borderTop: "1px solid #dce3e7",
              background: "white",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                id="jansahayak-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Apna sawaal ya samasya yahan likhein..."
                disabled={typing}
                rows={1}
                maxLength={2000}
                aria-label="Chat message"
                style={{
                  flex: 1,
                  border: "1px solid #dce3e7",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                  resize: "none",
                  outline: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  background: typing ? "#f7f8f5" : "white",
                  lineHeight: 1.5,
                  maxHeight: 100,
                  overflowY: "auto",
                  color: "#18232d",
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 100) + "px";
                }}
              />
              <button
                id="btn-jansahayak-send"
                className="jansahayak-send"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || typing}
                aria-label="Send message"
                style={{
                  width: 42, height: 42,
                  borderRadius: 12,
                  border: 0,
                  background: "#087f8c",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                {typing ? (
                  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                ) : "↑"}
              </button>
            </div>
            <div style={{ fontSize: 9, color: "#8b969d", marginTop: 6, textAlign: "center" }}>
              Enter to send · Shift+Enter for new line · JanSahayak AI may make mistakes
            </div>
          </div>
        </div>
      )}
    </>
  );
}
