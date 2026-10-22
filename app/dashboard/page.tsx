
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getPlanConfig } from "../lib/plans";
import Sidebar from "../components/Sidebar";

type Lead = {
  id: string;
  name: string;
  contact: string;
  status: string;
  notes: string;
  message: string;
};

type KnowledgeItem = {
  id: string;
  category: string;
  title: string;
  content: string;
};

type Usage = {
  ai_chat_messages: number;
  ai_writer_generations: number;
  ai_replies: number;
};

const EMPTY_USAGE: Usage = {
  ai_chat_messages: 0,
  ai_writer_generations: 0,
  ai_replies: 0,
};

const card: React.CSSProperties = {
  background: "linear-gradient(145deg, #121a2b, #101625)",
  border: "1px solid #253047",
  borderRadius: 18,
  padding: 22,
  minWidth: 0,
};

const muted: React.CSSProperties = {
  color: "#94a3b8",
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 15px",
  background: "linear-gradient(135deg, #8b5cf6, #7045db)",
  border: "1px solid #9775f7",
  borderRadius: 10,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 15px",
  background: "#172033",
  border: "1px solid #334155",
  borderRadius: 10,
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <div
          style={{
            color: "#a78bfa",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "1.4px",
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
      )}
      <h2
        style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 750,
          letterSpacing: "-0.35px",
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          style={{
            ...muted,
            margin: "7px 0 0",
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [country, setCountry] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [plan, setPlan] = useState("start");
  const [usage, setUsage] = useState<Usage>(EMPTY_USAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      const now = new Date();
      const periodStart = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        "01",
      ].join("-");

      const [
        businessResult,
        leadsResult,
        knowledgeResult,
        subscriptionResult,
        usageResult,
      ] = await Promise.all([
        supabase
          .from("Businesses")
          .select("name, description, country")
          .eq("userid", user.id)
          .limit(1)
          .maybeSingle(),

        supabase
          .from("leads")
          .select("id, name, contact, status, notes, message")
          .eq("userid", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("knowledge")
          .select("id, category, title, content")
          .eq("userid", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("userid", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),

        supabase
          .from("usage")
          .select(
            "ai_chat_messages, ai_writer_generations, ai_replies"
          )
          .eq("userid", user.id)
          .eq("period_start", periodStart)
          .maybeSingle(),
      ]);

      if (businessResult.error) throw businessResult.error;
      if (leadsResult.error) throw leadsResult.error;
      if (knowledgeResult.error) throw knowledgeResult.error;
      if (subscriptionResult.error) throw subscriptionResult.error;

      const business = businessResult.data;
      const nextLeads = (leadsResult.data || []) as Lead[];
      const nextKnowledge =
        (knowledgeResult.data || []) as KnowledgeItem[];

      setBusinessName(business?.name || "");
      setBusinessDescription(business?.description || "");
      setCountry(business?.country || "");
      setLeads(nextLeads);
      setKnowledge(nextKnowledge);
      setPlan(subscriptionResult.data?.plan || "start");

      if (usageResult.error) {
        console.error("Could not load monthly usage:", usageResult.error);
        setUsage(EMPTY_USAGE);
      } else {
        setUsage({
          ai_chat_messages:
            usageResult.data?.ai_chat_messages || 0,
          ai_writer_generations:
            usageResult.data?.ai_writer_generations || 0,
          ai_replies: usageResult.data?.ai_replies || 0,
        });
      }

      localStorage.setItem(
        "yaqqaBusiness",
        JSON.stringify({
          name: business?.name || "",
          description: business?.description || "",
          country: business?.country || "",
        })
      );

      localStorage.setItem(
        "yaqqaKnowledge",
        JSON.stringify(nextKnowledge)
      );
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(
        "We couldn't load your dashboard information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const planConfig = getPlanConfig(plan);
  const limits = planConfig.limits;
  const firstName =
    businessName.trim().split(/\s+/)[0] || "there";

  const usageItems = [
    {
      label: "AI Chat",
      used: usage.ai_chat_messages,
      limit: limits.aiChatMessages,
      description: "Messages this month",
    },
    {
      label: "AI Writer",
      used: usage.ai_writer_generations,
      limit: limits.aiWriterGenerations,
      description: "Generations this month",
    },
    {
      label: "Customer replies",
      used: usage.ai_replies,
      limit: limits.aiReplies,
      description: "Replies this month",
    },
  ];

  const stats = [
    {
      label: "CUSTOMERS",
      value: leads.length,
      detail: `Plan allowance: ${limits.customers}`,
      icon: "◎",
    },
    {
      label: "KNOWLEDGE ITEMS",
      value: knowledge.length,
      detail: `Plan allowance: ${limits.knowledgeItems}`,
      icon: "▤",
    },
    {
      label: "AI CHAT",
      value: usage.ai_chat_messages,
      detail: `${limits.aiChatMessages} monthly messages`,
      icon: "✳",
    },
    {
      label: "AI WRITER",
      value: usage.ai_writer_generations,
      detail: `${limits.aiWriterGenerations} monthly generations`,
      icon: "✎",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        background:
          "radial-gradient(ellipse at 75% 0%, #17152c 0%, #0b1020 48%)",
        color: "#f8fafc",
        fontFamily:
          "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <Sidebar />

      <section
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: 1600,
          padding: "clamp(20px, 3.5vw, 42px)",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                color: "#a78bfa",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "1.5px",
                marginBottom: 10,
              }}
            >
              YOUR WORKSPACE
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(27px, 3vw, 36px)",
                lineHeight: 1.2,
                letterSpacing: "-1.3px",
                fontWeight: 800,
              }}
            >
              G&apos;day, {firstName}
              <span style={{ color: "#a78bfa" }}>.</span>
            </h1>

            <p
              style={{
                ...muted,
                margin: "10px 0 0",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Your business at a glance. Let&apos;s get things moving.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              border: "1px solid #29344a",
              background: "#111827cc",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                borderRadius: 12,
                background: "linear-gradient(135deg, #8b5cf6, #39275f)",
                border: "1px solid #9b7cf5",
                fontSize: 17,
                fontWeight: 800,
              }}
            >
              {businessName.trim().charAt(0).toUpperCase() || "Y"}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 750,
                  overflowWrap: "anywhere",
                }}
              >
                {businessName || "Your business"}
              </div>
              <div
                style={{
                  ...muted,
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                {country || "Workspace"}
              </div>
            </div>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              padding: 16,
              marginBottom: 22,
              borderRadius: 12,
              border: "1px solid #713348",
              background: "#301b27",
              color: "#fecdd3",
              fontSize: 13,
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => void loadDashboard()}
              style={secondaryButton}
            >
              Try again
            </button>
          </div>
        )}

        {/* Overview heading */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <SectionHeading
            eyebrow="OVERVIEW"
            title="Your business, at a glance"
            description="A live snapshot of your YAQQA workspace."
          />

          <a href="/settings" style={secondaryButton}>
            ⚙ Business settings
          </a>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 205px), 1fr))",
            gap: 15,
            marginBottom: 30,
          }}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              style={{
                ...card,
                padding: 20,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -28,
                  right: -20,
                  width: 95,
                  height: 95,
                  borderRadius: "50%",
                  background: "#8b5cf6",
                  opacity: 0.07,
                  filter: "blur(25px)",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    ...muted,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.8px",
                  }}
                >
                  {stat.label}
                </span>

                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 35,
                    height: 35,
                    borderRadius: 11,
                    background: index % 2 === 0 ? "#292143" : "#20243c",
                    border: "1px solid #3b3458",
                    color: "#c4b5fd",
                    fontSize: 17,
                  }}
                >
                  {stat.icon}
                </span>
              </div>

              <div
                style={{
                  fontSize: 32,
                  lineHeight: 1.2,
                  fontWeight: 800,
                  letterSpacing: "-1.2px",
                  marginTop: 20,
                }}
              >
                {loading ? "—" : stat.value}
              </div>

              <div
                style={{
                  ...muted,
                  fontSize: 11,
                  marginTop: 7,
                  lineHeight: 1.6,
                }}
              >
                {stat.detail}
              </div>
            </div>
          ))}
        </div>

        {/* Main dashboard columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
            {/* Quick actions */}
            <div style={card}>
              <SectionHeading
                eyebrow="GET THINGS DONE"
                title="Quick actions"
                description="Your most-used tools, ready when you need them."
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                  gap: 11,
                  marginTop: 22,
                }}
              >
                <a href="/chat" style={primaryButton}>
                  ✳ Open AI Chat
                </a>
                <a href="/writer" style={secondaryButton}>
                  ✎ Open AI Writer
                </a>
                <a href="/leads" style={secondaryButton}>
                  ◎ Manage customers
                </a>
                <a href="/files" style={secondaryButton}>
                  ▤ Add knowledge
                </a>
              </div>
            </div>

            {/* Business profile */}
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 12,
                  marginBottom: 22,
                }}
              >
                <SectionHeading
                  eyebrow="YOUR BUSINESS"
                  title="Business profile"
                  description="The details YAQQA uses to tailor its assistance."
                />

                <a
                  href="/settings"
                  style={{
                    color: "#c4b5fd",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Edit →
                </a>
              </div>

              {loading ? (
                <p style={muted}>Loading business profile…</p>
              ) : (
                <div style={{ display: "grid", gap: 19 }}>
                  <div>
                    <div style={fieldLabel}>BUSINESS NAME</div>
                    <div style={fieldValue}>
                      {businessName || "Not set up yet"}
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabel}>COUNTRY</div>
                    <div style={fieldValue}>
                      {country || "Not provided"}
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabel}>DESCRIPTION</div>
                    <div
                      style={{
                        color: businessDescription ? "#cbd5e1" : "#64748b",
                        fontSize: 13,
                        lineHeight: 1.8,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {businessDescription ||
                        "Add a short description of your business to help YAQQA provide more relevant assistance."}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent customers */}
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 12,
                  marginBottom: 19,
                }}
              >
                <SectionHeading
                  eyebrow="CUSTOMER RELATIONSHIPS"
                  title="Recent customers"
                  description="Your latest customer records."
                />

                <a
                  href="/leads"
                  style={{
                    color: "#c4b5fd",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  View all →
                </a>
              </div>

              {loading ? (
                <p style={muted}>Loading customers…</p>
              ) : leads.length === 0 ? (
                <div style={emptyState}>
                  <div style={emptyIcon}>◎</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    Your customer list is ready
                  </div>
                  <p style={emptyDescription}>
                    Add your first customer to organise enquiries and prepare
                    AI-assisted replies.
                  </p>
                  <a href="/leads" style={secondaryButton}>
                    + Add customer
                  </a>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 9 }}>
                  {leads.slice(0, 4).map((lead) => (
                    <a
                      key={lead.id}
                      href="/leads"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: 13,
                        borderRadius: 12,
                        border: "1px solid #263248",
                        background: "#0c1322",
                        color: "#f8fafc",
                        textDecoration: "none",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {lead.name}
                        </div>
                        <div
                          style={{
                            ...muted,
                            fontSize: 11,
                            marginTop: 5,
                          }}
                        >
                          {lead.contact || "No contact details"}
                        </div>
                      </div>

                      <span
                        style={{
                          color: "#c4b5fd",
                          background: "#27213e",
                          border: "1px solid #40345f",
                          borderRadius: 20,
                          padding: "6px 9px",
                          fontSize: 10,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lead.status}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
            {/* Subscription and usage */}
            <div
              style={{
                ...card,
                background:
                  "radial-gradient(ellipse at top right, #30234f 0%, #171629 38%, #111827 100%)",
                border: "1px solid #4b3b70",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 12,
                }}
              >
                <SectionHeading
                  eyebrow="YOUR SUBSCRIPTION"
                  title={planConfig.name}
                  description="Your monthly AI usage and allowances."
                />

                <span
                  style={{
                    background: "#352853",
                    color: "#ddd6fe",
                    border: "1px solid #584578",
                    padding: "7px 10px",
                    borderRadius: 9,
                    fontSize: 10,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {planConfig.label}
                </span>
              </div>

              <div style={{ display: "grid", gap: 23, marginTop: 26 }}>
                {usageItems.map((item) => {
                  const percentage =
                    item.limit > 0
                      ? Math.min(100, (item.used / item.limit) * 100)
                      : 0;

                  return (
                    <div key={item.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          flexWrap: "wrap",
                          gap: 8,
                          marginBottom: 9,
                        }}
                      >
                        <span
                          style={{
                            color: "#e2e8f0",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {item.label}
                        </span>

                        <span
                          style={{
                            color: "#c4b5fd",
                            fontSize: 11,
                            fontWeight: 750,
                          }}
                        >
                          {loading ? "—" : `${item.used} / ${item.limit}`}
                        </span>
                      </div>

                      <div
                        style={{
                          height: 7,
                          borderRadius: 20,
                          background: "#303044",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${loading ? 0 : percentage}%`,
                            height: "100%",
                            borderRadius: 20,
                            background:
                              percentage >= 90
                                ? "#f59e0b"
                                : "linear-gradient(90deg, #8b5cf6, #c4b5fd)",
                            transition: "width 250ms ease",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          ...muted,
                          fontSize: 10,
                          marginTop: 7,
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  borderTop: "1px solid #38334d",
                  marginTop: 24,
                  paddingTop: 18,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={allowanceChip}>
                  Customers: <strong>{limits.customers}</strong>
                </div>
                <div style={allowanceChip}>
                  Knowledge: <strong>{limits.knowledgeItems}</strong>
                </div>
              </div>
            </div>

            {/* Business knowledge */}
            <div style={card}>
              <SectionHeading
                eyebrow="YOUR BUSINESS BRAIN"
                title="Business knowledge"
                description="Information that helps YAQQA understand your business."
              />

              {loading ? (
                <p style={muted}>Loading knowledge…</p>
              ) : knowledge.length === 0 ? (
                <div style={{ ...emptyState, marginTop: 20 }}>
                  <div style={emptyIcon}>▤</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    Build your business knowledge
                  </div>
                  <p style={emptyDescription}>
                    Add products, services, policies and frequently asked
                    questions to help YAQQA give more relevant answers.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginTop: 20,
                  }}
                >
                  {knowledge.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: 13,
                        background: "#0c1322",
                        border: "1px solid #263248",
                        borderRadius: 11,
                      }}
                    >
                      <div
                        style={{
                          color: "#c4b5fd",
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.6px",
                          marginBottom: 6,
                        }}
                      >
                        {item.category || "GENERAL"}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>
                        {item.title}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <a
                href="/files"
                style={{
                  ...secondaryButton,
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 18,
                }}
              >
                Manage knowledge →
              </a>
            </div>

            {/* Product roadmap */}
            <div
              style={{
                ...card,
                background:
                  "linear-gradient(145deg, #19172b, #0f1625)",
                border: "1px dashed #494064",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 11,
                    background: "#292143",
                    color: "#c4b5fd",
                    fontSize: 18,
                  }}
                >
                  ✦
                </div>
                <div>
                  <div style={fieldLabel}>THE ROAD AHEAD</div>
                  <div style={{ fontSize: 14, fontWeight: 750 }}>
                    More possibilities
                  </div>
                </div>
              </div>

              <p
                style={{
                  ...muted,
                  fontSize: 12,
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                YAQQA is being built to bring more of your business workflows
                together. Connected inboxes and automations can be added as
                the product develops.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            ...muted,
            fontSize: 11,
            borderTop: "1px solid #202a3d",
            marginTop: 32,
            paddingTop: 20,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>YAQQA AI · Your AI business mate.</span>
          <span>Your business. Your workspace.</span>
        </footer>
      </section>
    </main>
  );
}

const fieldLabel: React.CSSProperties = {
  color: "#8290a5",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.9px",
  marginBottom: 7,
};

const fieldValue: React.CSSProperties = {
  color: "#f1f5f9",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.7,
};

const emptyState: React.CSSProperties = {
  background: "#0c1322",
  border: "1px dashed #334155",
  borderRadius: 12,
  padding: 19,
};

const emptyIcon: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 38,
  height: 38,
  marginBottom: 13,
  borderRadius: 11,
  background: "#292143",
  color: "#c4b5fd",
  fontSize: 18,
};

const emptyDescription: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.8,
  margin: "8px 0 15px",
};

const allowanceChip: React.CSSProperties = {
  display: "flex",
  gap: 5,
  alignItems: "center",
  color: "#b5b5c9",
  fontSize: 11,
  background: "#211d33",
  border: "1px solid #38334d",
  borderRadius: 9,
  padding: "8px 10px",
};