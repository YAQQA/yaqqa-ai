
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getPlanConfig } from "../lib/plans";

type KnowledgeItem = {
  id: string;
  category: string;
  title: string;
  content: string;
};

type UsageRecord = {
  id: string;
  userid: string;
  period_start: string;
  ai_chat_messages: number;
  ai_writer_generations: number;
  ai_replies: number;
};

const AI_GENERATION_ENABLED = false;

const contentTypes = [
  "General business content",
  "Customer Reply",
  "Social Media Post",
  "Advertisement",
  "Product Description",
  "Email",
  "Business Announcement",
];

const tones = [
  "Friendly",
  "Professional",
  "Casual",
  "Persuasive",
  "Warm",
  "Formal",
  "Funny",
];

export default function WriterPage() {
  const [type, setType] = useState("General business content");
  const [tone, setTone] = useState("Friendly");
  const [topic, setTopic] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [country, setCountry] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [reply, setReply] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [plan, setPlan] = useState("start");
  const [usage, setUsage] = useState<UsageRecord | null>(null);

  const planConfig = getPlanConfig(plan);
  const writerLimit = planConfig.limits.aiWriterGenerations;
  const writerUsed = usage?.ai_writer_generations ?? 0;
  const writerRemaining = Math.max(writerLimit - writerUsed, 0);
  const limitReached = writerUsed >= writerLimit;

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          window.location.href = "/login";
          return;
        }

        const { data: business, error: businessError } =
          await supabase
            .from("Businesses")
            .select("name, description, country")
            .eq("userid", user.id)
            .limit(1)
            .maybeSingle();

        if (businessError) {
          console.error("YAQQA business loading error:", businessError);
        }

        if (business) {
          setBusinessName(business.name || "");
          setBusinessDescription(business.description || "");
          setCountry(business.country || "");
        }

        const { data: knowledgeItems, error: knowledgeError } =
          await supabase
            .from("knowledge")
            .select("id, category, title, content")
            .eq("userid", user.id)
            .order("created_at", { ascending: false });

        if (knowledgeError) {
          console.error("YAQQA knowledge loading error:", knowledgeError);
        } else {
          setKnowledge(knowledgeItems || []);
        }

        const { data: subscription, error: subscriptionError } =
          await supabase
            .from("subscriptions")
            .select("plan, status")
            .eq("userid", user.id)
            .eq("status", "active")
            .maybeSingle();

        if (subscriptionError) {
          console.error(
            "YAQQA subscription loading error:",
            subscriptionError
          );
        }

        const currentPlan = subscription?.plan || "start";
    
          const now = new Date();
        const periodStart = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, "0"),
          "01",
        ].join("-");const usageColumns =
          "id, userid, period_start, ai_chat_messages, ai_writer_generations, ai_replies";

        const { data: existingUsage, error: usageError } =
          await supabase
            .from("usage")
            .select(usageColumns)
            .eq("userid", user.id)
            .eq("period_start", periodStart)
            .maybeSingle();

        if (usageError) {
          console.error("YAQQA usage loading error:", usageError);
          setErrorMessage(
            "Couldn't load your monthly usage. Please refresh the page."
          );
          return;
        }

        if (existingUsage) {
          setUsage(existingUsage as UsageRecord);
        } else {
          const { data: newUsage, error: createUsageError } =
            await supabase
              .from("usage")
              .insert({
                userid: user.id,
                period_start: periodStart,
                ai_chat_messages: 0,
                ai_writer_generations: 0,
                ai_replies: 0,
              })
              .select(usageColumns)
              .single();

          if (createUsageError) {
            console.error(
              "YAQQA usage creation error:",
              createUsageError
            );
            setErrorMessage(
              "Couldn't create this month's usage record. Please refresh the page."
            );
            return;
          }

          if (newUsage) {
            setUsage(newUsage as UsageRecord);
          }
        }
      } catch (error) {
        console.error("YAQQA Writer loading error:", error);
        setErrorMessage(
          "YAQQA couldn't load your business information."
        );
      } finally {
        setPageLoading(false);
      }
    }

    loadData();
  }, []);

  async function generateContent() {
    if (!AI_GENERATION_ENABLED) {
      setErrorMessage(
        "AI generation is temporarily paused while YAQQA billing is being set up. Your writing settings and usage information are still available."
      );
      return;
    }

    if (limitReached) {
      setErrorMessage(
        `You've reached your ${planConfig.name} monthly Writer limit of ${writerLimit} generations.`
      );
      return;
    }

    if (!topic.trim()) {
      setErrorMessage("Tell YAQQA what you want it to write first.");
      return;
    }

    setGenerating(true);
    setReply("");
    setCopied(false);
    setErrorMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please log in again to continue.");
      }

      const response = await fetch("/api/writer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({
          type,
          tone,
          topic,
          business: {
            name: businessName,
            description: businessDescription,
            country,
          },
          knowledge,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "YAQQA couldn't generate the content."
        );
      }

      setReply(data.reply || "YAQQA did not return any content.");

      // Usage counting will be handled securely by the API
      // before live generation is enabled.
    } catch (error) {
      console.error("YAQQA Writer error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "YAQQA couldn't generate the content. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copyReply() {
    if (!reply) return;

    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage(
        "Couldn't copy automatically. Please select and copy the text."
      );
    }
  }

  if (pageLoading) {
    return (
      <main style={pageStyle}>
        <div style={{ margin: "auto", color: "#94a3b8" }}>
          Loading YAQQA Writer...
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <aside style={sidebarStyle}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-1px" }}>
          YAQQA
        </div>

        <div style={{ color: "#94a3b8", fontSize: 13, margin: "8px 0 30px" }}>
          Your AI business mate.
        </div>

        <nav style={{ display: "grid", gap: 6 }}>
          <a href="/dashboard" style={navStyle}>Home</a>
          <a href="/chat" style={navStyle}>AI Chat</a>
          <a href="/writer" style={activeNavStyle}>AI Writer</a>
          <a href="/leads" style={navStyle}>Leads &amp; Customers</a>
          <a href="/files" style={navStyle}>Business Knowledge</a>
          <a href="/settings" style={navStyle}>Settings</a>
        </nav>
      </aside>

      <section style={contentStyle}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 8 }}>
            CONTENT CREATOR
          </div>

          <h1 style={{ fontSize: 34, margin: 0, letterSpacing: "-1px" }}>
            AI Writer
          </h1>

          <p style={{ color: "#94a3b8", marginTop: 10, maxWidth: 700 }}>
            Create polished business content using your business information
            and Business Knowledge.
          </p>
        </div>

        <div style={usagePanelStyle}>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 5 }}>
              YOUR CURRENT PLAN
            </div>
            <strong style={{ fontSize: 18 }}>{planConfig.name}</strong>
          </div>

          <div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 5 }}>
              MONTHLY WRITER USAGE
            </div>
            <strong style={{ fontSize: 18 }}>
              {writerUsed} / {writerLimit}
            </strong>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              {writerRemaining} generations remaining
            </div>
          </div>

          <div style={usageTrackStyle}>
            <div
              style={{
                ...usageFillStyle,
                width: `${Math.min((writerUsed / writerLimit) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {!AI_GENERATION_ENABLED && (
          <div style={noticeStyle}>
            <strong>AI generation is temporarily paused.</strong>
            <div style={{ marginTop: 5 }}>
              We&apos;re continuing to build YAQQA without making live AI requests.
              Generation can be enabled after billing and server-side usage
              enforcement are ready.
            </div>
          </div>
        )}

        {errorMessage && <div style={errorStyle}>{errorMessage}</div>}

        <div style={gridStyle}>
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0, fontSize: 19 }}>
              What do you want to write?
            </h2>

            <div style={{ display: "grid", gap: 14 }}>
              <label style={labelStyle}>
                CONTENT TYPE
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  style={inputStyle}
                >
                  {contentTypes.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                TONE
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  style={inputStyle}
                >
                  {tones.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                TOPIC / INSTRUCTIONS
                <textarea
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Example: Write a Facebook post promoting our latest product."
                  rows={9}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
              </label>

              <button
                onClick={generateContent}
                disabled={generating || !AI_GENERATION_ENABLED || limitReached}
                style={{
                  ...primaryButtonStyle,
                  opacity:
                    generating || !AI_GENERATION_ENABLED || limitReached
                      ? 0.55
                      : 1,
                  cursor:
                    generating || !AI_GENERATION_ENABLED || limitReached
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {!AI_GENERATION_ENABLED
                  ? "✦ AI generation paused"
                  : limitReached
                    ? "Monthly limit reached"
                    : generating
                      ? "✦ YAQQA is writing..."
                      : "✦ Generate with YAQQA"}
              </button>
            </div>

            <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
              YAQQA has {knowledge.length} Business Knowledge item
              {knowledge.length === 1 ? "" : "s"} available.
            </p>
          </div>

          <div style={{ ...panelStyle, minHeight: 430 }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 15,
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19 }}>Your content</h2>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                  Review and edit before using it.
                </div>
              </div>

              {reply && (
                <button onClick={copyReply} style={secondaryButtonStyle}>
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              )}
            </div>

            {reply ? (
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={18}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  lineHeight: 1.6,
                  minHeight: 390,
                }}
              />
            ) : (
              <div style={emptyStyle}>
                Your generated content will appear here when AI generation is enabled.
              </div>
            )}
          </div>
        </div>

        <div style={{
          marginTop: 25,
          padding: 20,
          borderRadius: 16,
          border: "1px dashed #334155",
          color: "#94a3b8",
          background: "#0d1424",
        }}>
          <strong style={{ color: "#e2e8f0" }}>Your business information</strong>
          <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
            {businessName || "No business name saved"} ·{" "}
            {country || "No country saved"}
            {businessDescription ? ` — ${businessDescription}` : ""}
          </p>
        </div>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#0b1020",
  color: "#f8fafc",
  display: "flex",
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

const sidebarStyle = {
  width: 240,
  borderRight: "1px solid #1e293b",
  padding: "28px 18px",
  background: "#0a0f1c",
  flexShrink: 0,
};

const contentStyle = {
  flex: 1,
  padding: 42,
  maxWidth: 1100,
};

const navStyle = {
  display: "block",
  padding: "11px 12px",
  borderRadius: 10,
  color: "#94a3b8",
  textDecoration: "none",
  fontSize: 14,
};

const activeNavStyle = {
  ...navStyle,
  background: "#172033",
  color: "#ffffff",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(300px, 0.8fr) minmax(420px, 1.2fr)",
  gap: 24,
  alignItems: "start",
};

const panelStyle = {
  background: "#111827",
  border: "1px solid #1e293b",
  borderRadius: 18,
  padding: 22,
};

const usagePanelStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
  alignItems: "center",
  marginBottom: 20,
  padding: 20,
  border: "1px solid #263449",
  borderRadius: 16,
  background: "#111827",
};

const usageTrackStyle = {
  gridColumn: "1 / -1",
  height: 7,
  overflow: "hidden",
  borderRadius: 10,
  background: "#263449",
};

const usageFillStyle = {
  height: "100%",
  borderRadius: 10,
  background: "#94a3b8",
  transition: "width 0.2s ease",
};

const noticeStyle = {
  background: "#172033",
  border: "1px solid #334155",
  color: "#cbd5e1",
  borderRadius: 12,
  padding: "14px 16px",
  marginBottom: 20,
  lineHeight: 1.5,
};

const labelStyle = {
  display: "grid",
  gap: 8,
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#0b1220",
  border: "1px solid #263449",
  borderRadius: 10,
  padding: 12,
  color: "#ffffff",
  outline: "none",
  fontFamily: "inherit",
  fontSize: 14,
};

const primaryButtonStyle = {
  background: "#ffffff",
  color: "#0b1020",
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  background: "#172033",
  color: "#ffffff",
  border: "1px solid #334155",
  borderRadius: 9,
  padding: "9px 13px",
  fontWeight: 600,
  cursor: "pointer",
};

const errorStyle = {
  background: "#35151a",
  border: "1px solid #7f1d1d",
  color: "#fecaca",
  borderRadius: 12,
  padding: "14px 16px",
  marginBottom: 20,
  lineHeight: 1.5,
};

const emptyStyle = {
  minHeight: 390,
  border: "1px dashed #334155",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center" as const,
  padding: 25,
  color: "#64748b",
};