"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getPlanConfig, type YaqqaPlan } from "../lib/plans";

type Lead = {
  id: string;
  userid: string;
  name: string;
  contact: string;
  status: string;
  notes: string;
  message: string;
};

type KnowledgeItem = {
  id: string;
  userid: string;
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [country, setCountry] = useState("");

  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);

  const [plan, setPlan] = useState<YaqqaPlan>("start");
  const [usage, setUsage] = useState<UsageRecord | null>(null);

  const [aiReply, setAiReply] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const planConfig = getPlanConfig(plan);

  const customerLimit = planConfig.limits.customers;

  const replyLimit = planConfig.limits.aiReplies;

  const repliesUsed = usage?.ai_replies ?? 0;

  const atCustomerLimit = leads.length >= customerLimit;

  const atReplyLimit = repliesUsed >= replyLimit;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    // -----------------------------
    // BUSINESS
    // -----------------------------

    const { data: business } = await supabase
      .from("Businesses")
      .select("name, description, country")
      .eq("userid", user.id)
      .maybeSingle();

    if (business) {
      setBusinessName(business.name || "");
      setBusinessDescription(business.description || "");
      setCountry(business.country || "");

      localStorage.setItem(
        "yaqqaBusiness",
        JSON.stringify({
          name: business.name || "",
          description: business.description || "",
          country: business.country || "",
        })
      );
    }

    // -----------------------------
    // KNOWLEDGE
    // -----------------------------

    const { data: knowledgeData } = await supabase
      .from("knowledge")
      .select("*")
      .eq("userid", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (knowledgeData) {
      setKnowledge(knowledgeData);
    }

    // -----------------------------
    // LEADS
    // -----------------------------

    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("userid", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (leadError) {
      console.error("Could not load leads:", leadError);
    }

    if (leadData) {
      setLeads(leadData);
    }

    // -----------------------------
    // SUBSCRIPTION
    // -----------------------------

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("userid", user.id)
      .eq("status", "active")
      .maybeSingle();

    const currentPlan: YaqqaPlan =
      subscription?.plan === "mvp" || subscription?.plan === "pro"
        ? subscription.plan
        : "start";

    setPlan(currentPlan);

    // -----------------------------
    // CURRENT MONTH
    // -----------------------------

    const now = new Date();

    const periodStart = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-01`;

    // -----------------------------
    // USAGE
    // -----------------------------

    let { data: usageData } = await supabase
      .from("usage")
      .select("*")
      .eq("userid", user.id)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (!usageData) {
      const { data: newUsage, error: usageInsertError } =
        await supabase
          .from("usage")
          .insert({
            userid: user.id,
            period_start: periodStart,
            ai_chat_messages: 0,
            ai_writer_generations: 0,
            ai_replies: 0,
          })
          .select()
          .single();

      if (usageInsertError) {
        console.error(
          "Could not create usage record:",
          usageInsertError
        );
      } else {
        usageData = newUsage;
      }
    }

    if (usageData) {
      setUsage(usageData);
    }
  }

  function saveLocalLeads(updatedLeads: Lead[]) {
    setLeads(updatedLeads);

    localStorage.setItem(
      "yaqqaLeads",
      JSON.stringify(updatedLeads)
    );
  }

  async function addLead() {
    if (!name.trim()) {
      return;
    }

    if (atCustomerLimit) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    // Double-check the actual count in Supabase.
    const { count, error: countError } = await supabase
      .from("leads")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("userid", user.id);

    if (countError) {
      console.error("Could not check customer limit:", countError);
      return;
    }

    if ((count ?? 0) >= customerLimit) {
      alert(
        `You have reached your ${planConfig.name} customer limit of ${customerLimit}.`
      );
      await loadData();
      return;
    }

    const newLead = {
      userid: user.id,
      name: name.trim(),
      contact: contact.trim(),
      status: "New",
      notes: notes.trim(),
      message: message.trim(),
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(newLead)
      .select()
      .single();

    if (error) {
      console.error("Could not add customer:", error);
      alert("YAQQA couldn't add this customer.");
      return;
    }

    if (data) {
      const updatedLeads = [data, ...leads];

      saveLocalLeads(updatedLeads);
    }

    setName("");
    setContact("");
    setMessage("");
    setNotes("");
  }

  async function deleteLead(id: string) {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Could not delete customer:", error);
      return;
    }

    const updated = leads.filter((lead) => lead.id !== id);

    saveLocalLeads(updated);

    if (selectedLead?.id === id) {
      setSelectedLead(null);
      setAiReply("");
    }
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("leads")
      .update({
        status,
      })
      .eq("id", id);

    if (error) {
      console.error("Could not update status:", error);
      return;
    }

    const updated = leads.map((lead) =>
      lead.id === id
        ? {
            ...lead,
            status,
          }
        : lead
    );

    saveLocalLeads(updated);

    if (selectedLead?.id === id) {
      setSelectedLead({
        ...selectedLead,
        status,
      });
    }
  }

  async function generateAIReply() {
    if (!selectedLead) {
      return;
    }

    if (atReplyLimit) {
      setAiReply(
        `You've reached your ${planConfig.name} limit of ${replyLimit} AI customer replies this month.`
      );
      return;
    }

    const enquiry = selectedLead.message.trim();

    if (!enquiry) {
      setAiReply(
        "This customer does not have an enquiry saved yet. Add their message to the lead first."
      );
      return;
    }

    setGenerating(true);
    setAiReply("");
    setCopied(false);

    try {
      const response = await fetch("/api/writer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "Customer Reply",
          tone: "Friendly",
          topic: `
Create a reply to this customer enquiry.

Customer name: ${selectedLead.name}

Customer contact: ${
            selectedLead.contact || "Not provided"
          }

Customer enquiry:
${enquiry}
`,
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
          data.error || "YAQQA could not generate a reply."
        );
      }

      const generatedReply =
        data.reply || "YAQQA did not return a reply.";

      setAiReply(generatedReply);

      // Only count the reply after the AI request succeeds.
      if (usage) {
        const newReplyCount = usage.ai_replies + 1;

        const { data: updatedUsage, error: usageError } =
          await supabase
            .from("usage")
            .update({
              ai_replies: newReplyCount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", usage.id)
            .select()
            .single();

        if (usageError) {
          console.error(
            "Could not update AI reply usage:",
            usageError
          );
        } else if (updatedUsage) {
          setUsage(updatedUsage);
        }
      }
    } catch (error) {
      console.error(error);

      setAiReply(
        "YAQQA couldn't generate the reply. Please check your AI connection or account credits."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copyReply() {
    if (!aiReply) {
      return;
    }

    try {
      await navigator.clipboard.writeText(aiReply);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Could not copy reply:", error);
    }
  }

  function openInWriter() {
    if (!selectedLead) {
      return;
    }

    const enquiry = selectedLead.message.trim();

    const writerTopic =
      enquiry ||
      `Create a customer reply for ${selectedLead.name}.`;

    localStorage.setItem(
      "yaqqaWriterRequest",
      JSON.stringify({
        topic: writerTopic,
        type: "Customer Reply",
        tone: "Friendly",
        leadId: selectedLead.id,
        customerName: selectedLead.name,
        customerContact: selectedLead.contact,
      })
    );

    window.location.href = "/writer";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "#f8fafc",
        display: "flex",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <aside
        style={{
          width: "240px",
          borderRight: "1px solid #1e293b",
          padding: "28px 18px",
          background: "#0a0f1c",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "26px",
            fontWeight: 800,
            letterSpacing: "-1px",
            marginBottom: "8px",
          }}
        >
          YAQQA
        </div>

        <div
          style={{
            color: "#94a3b8",
            fontSize: "13px",
            marginBottom: "30px",
          }}
        >
          Your AI business mate.
        </div>

        <nav
          style={{
            display: "grid",
            gap: "6px",
          }}
        >
          <a href="/dashboard" style={navStyle}>
            Home
          </a>

          <a href="/chat" style={navStyle}>
            AI Chat
          </a>

          <a href="/writer" style={navStyle}>
            AI Writer
          </a>

          <a
            href="/leads"
            style={{
              ...navStyle,
              background: "#172033",
              color: "#ffffff",
            }}
          >
            Leads & Customers
          </a>

          <a href="/files" style={navStyle}>
            Business Knowledge
          </a>

          <a href="/settings" style={navStyle}>
            Settings
          </a>
        </nav>
      </aside>

      <section
        style={{
          flex: 1,
          padding: "42px",
          maxWidth: "1250px",
        }}
      >
        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            CRM
          </div>

          <h1
            style={{
              fontSize: "34px",
              margin: 0,
              letterSpacing: "-1px",
            }}
          >
            Leads & Customers
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: "10px",
              maxWidth: "700px",
            }}
          >
            Keep track of customers and let YAQQA help prepare
            replies to their enquiries.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(300px, 0.8fr) minmax(420px, 1.2fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid #1e293b",
              borderRadius: "18px",
              padding: "22px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                fontSize: "19px",
              }}
            >
              Add customer
            </h2>

            <div style={{ display: "grid", gap: "12px" }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                style={inputStyle}
              />

              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Contact details"
                style={inputStyle}
              />

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Customer enquiry"
                rows={5}
                style={textareaStyle}
              />

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes"
                rows={3}
                style={textareaStyle}
              />

              <button
                onClick={addLead}
                disabled={atCustomerLimit}
                style={{
                  ...primaryButton,
                  opacity: atCustomerLimit ? 0.5 : 1,
                  cursor: atCustomerLimit
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {atCustomerLimit
                  ? `Customer limit reached (${customerLimit})`
                  : "+ Add customer"}
              </button>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                {leads.length} / {customerLimit} customers
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            <div
              style={{
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: "18px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "15px",
                }}
              >
                <div>
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "5px",
                      fontSize: "19px",
                    }}
                  >
                    Customers
                  </h2>

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    {leads.length} / {customerLimit} customers
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    color: "#64748b",
                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      color: "#94a3b8",
                      fontWeight: 700,
                    }}
                  >
                    {planConfig.name}
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                    }}
                  >
                    AI replies: {repliesUsed} / {replyLimit}
                  </div>
                </div>
              </div>

              {leads.length === 0 ? (
                <div
                  style={{
                    color: "#94a3b8",
                    padding: "25px 0",
                  }}
                >
                  No customers yet. Add your first customer on the
                  left.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginTop: "18px",
                  }}
                >
                  {leads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setAiReply("");
                        setCopied(false);
                      }}
                      style={{
                        textAlign: "left",
                        background:
                          selectedLead?.id === lead.id
                            ? "#172033"
                            : "#0f172a",
                        border: "1px solid #243047",
                        borderRadius: "12px",
                        padding: "15px",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <strong>{lead.name}</strong>

                        <span
                          style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                          }}
                        >
                          {lead.status}
                        </span>
                      </div>

                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: "13px",
                          marginTop: "5px",
                        }}
                      >
                        {lead.contact || "No contact details"}
                      </div>

                      {lead.message && (
                        <div
                          style={{
                            color: "#cbd5e1",
                            fontSize: "13px",
                            marginTop: "8px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {lead.message}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedLead && (
              <div
                style={{
                  background: "#111827",
                  border: "1px solid #1e293b",
                  borderRadius: "18px",
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "20px",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: "13px",
                        marginBottom: "5px",
                      }}
                    >
                      CUSTOMER
                    </div>

                    <h2
                      style={{
                        margin: 0,
                        fontSize: "25px",
                      }}
                    >
                      {selectedLead.name}
                    </h2>

                    <div
                      style={{
                        color: "#94a3b8",
                        marginTop: "5px",
                      }}
                    >
                      {selectedLead.contact ||
                        "No contact details"}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteLead(selectedLead.id)}
                    style={dangerButton}
                  >
                    Delete
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "22px",
                    display: "grid",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div style={labelStyle}>STATUS</div>

                    <select
                      value={selectedLead.status}
                      onChange={(e) =>
                        updateStatus(
                          selectedLead.id,
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    >
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Follow-up</option>
                      <option>Won</option>
                      <option>Lost</option>
                    </select>
                  </div>

                  <div>
                    <div style={labelStyle}>
                      CUSTOMER ENQUIRY
                    </div>

                    <div
                      style={{
                        background: "#0b1220",
                        border: "1px solid #243047",
                        borderRadius: "12px",
                        padding: "16px",
                        color: "#e2e8f0",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedLead.message ||
                        "No enquiry has been saved for this customer."}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#0d1424",
                      border: "1px solid #243047",
                      borderRadius: "12px",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                      }}
                    >
                      AI CUSTOMER REPLIES
                    </div>

                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "15px",
                        fontWeight: 700,
                      }}
                    >
                      {repliesUsed} / {replyLimit} this month
                    </div>

                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "12px",
                        marginTop: "3px",
                      }}
                    >
                      {planConfig.name}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <button
                      onClick={generateAIReply}
                      disabled={generating || atReplyLimit}
                      style={{
                        ...primaryButton,
                        opacity:
                          generating || atReplyLimit ? 0.55 : 1,
                        cursor:
                          generating || atReplyLimit
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {generating
                        ? "✦ YAQQA is thinking..."
                        : atReplyLimit
                        ? `AI Reply Limit Reached (${replyLimit})`
                        : "✦ Generate AI Reply"}
                    </button>

                    <button
                      onClick={openInWriter}
                      style={secondaryButton}
                    >
                      Open in AI Writer
                    </button>
                  </div>

                  {aiReply && (
                    <div
                      style={{
                        background: "#0b1220",
                        border: "1px solid #334155",
                        borderRadius: "14px",
                        padding: "18px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "12px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "16px",
                            }}
                          >
                            YAQQA's suggested reply
                          </div>

                          <div
                            style={{
                              color: "#64748b",
                              fontSize: "12px",
                              marginTop: "3px",
                            }}
                          >
                            Review before sending
                          </div>
                        </div>

                        <button
                          onClick={copyReply}
                          style={secondaryButton}
                        >
                          {copied ? "Copied ✓" : "Copy reply"}
                        </button>
                      </div>

                      <textarea
                        value={aiReply}
                        onChange={(e) =>
                          setAiReply(e.target.value)
                        }
                        rows={8}
                        style={{
                          ...textareaStyle,
                          resize: "vertical",
                          lineHeight: 1.6,
                        }}
                      />

                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "12px",
                          marginTop: "8px",
                        }}
                      >
                        You can edit YAQQA's reply before copying
                        it.
                      </div>
                    </div>
                  )}

                  {selectedLead.notes && (
                    <div>
                      <div style={labelStyle}>
                        INTERNAL NOTES
                      </div>

                      <div
                        style={{
                          color: "#cbd5e1",
                          lineHeight: 1.6,
                        }}
                      >
                        {selectedLead.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: "25px",
            padding: "20px",
            borderRadius: "16px",
            border: "1px dashed #334155",
            color: "#94a3b8",
            background: "#0d1424",
          }}
        >
          <strong style={{ color: "#e2e8f0" }}>
            Coming next
          </strong>

          <div style={{ marginTop: "6px" }}>
            YAQQA Inbox will eventually connect customer messages
            from channels such as Messenger, Instagram, WhatsApp
            and email. YAQQA can prepare the reply, while you remain
            in control of what gets sent.
          </div>
        </div>
      </section>
    </main>
  );
}

const navStyle = {
  display: "block",
  padding: "11px 12px",
  borderRadius: "10px",
  color: "#94a3b8",
  textDecoration: "none",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#0b1220",
  border: "1px solid #263449",
  borderRadius: "10px",
  padding: "12px",
  color: "#fff",
  outline: "none",
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#0b1220",
  border: "1px solid #263449",
  borderRadius: "10px",
  padding: "12px",
  color: "#fff",
  outline: "none",
  fontFamily: "inherit",
};

const primaryButton = {
  background: "#ffffff",
  color: "#0b1020",
  border: "none",
  borderRadius: "10px",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton = {
  background: "#172033",
  color: "#ffffff",
  border: "1px solid #334155",
  borderRadius: "10px",
  padding: "12px 16px",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerButton = {
  background: "transparent",
  color: "#fca5a5",
  border: "1px solid #7f1d1d",
  borderRadius: "9px",
  padding: "8px 12px",
  cursor: "pointer",
};

const labelStyle = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  marginBottom: "7px",
};