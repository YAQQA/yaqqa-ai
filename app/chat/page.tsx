"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { getPlanConfig } from "../lib/plans";

type Message = {
  role: "user" | "assistant";
  content: string;
};

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

export default function Chat() {
  const [businessName, setBusinessName] =
    useState("Your Business");

  const [businessDescription, setBusinessDescription] =
    useState("");

  const [country, setCountry] = useState("");

  const [knowledge, setKnowledge] = useState<
    { title: string; content: string }[]
  >([]);

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  const [loading, setLoading] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);

  const [plan, setPlan] = useState("start");

  const [usage, setUsage] =
    useState<UsageRecord | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const planConfig = getPlanConfig(plan);

  const chatLimit =
    planConfig.limits.aiChatMessages;

  const chatUsed =
    usage?.ai_chat_messages ?? 0;

  const remaining = Math.max(
    chatLimit - chatUsed,
    0
  );

  const limitReached =
    chatUsed >= chatLimit;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setPageLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      // LOAD BUSINESS

      const {
        data: businessData,
        error: businessError,
      } = await supabase
        .from("Businesses")
        .select("name, description, country")
        .eq("userid", user.id)
        .limit(1)
        .maybeSingle();

      if (businessError) {
        console.error(
          "Business loading error:",
          JSON.stringify(
            businessError,
            null,
            2
          )
        );
      }

      if (businessData) {
        setBusinessName(
          businessData.name ||
            "Your Business"
        );

        setBusinessDescription(
          businessData.description || ""
        );

        setCountry(
          businessData.country || ""
        );

        localStorage.setItem(
          "yaqqaBusiness",
          JSON.stringify({
            name:
              businessData.name || "",
            description:
              businessData.description || "",
            country:
              businessData.country || "",
          })
        );
      }

      // LOAD KNOWLEDGE

      const {
        data: knowledgeData,
        error: knowledgeError,
      } = await supabase
        .from("knowledge")
        .select(
          "id, category, title, content"
        )
        .eq("userid", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (knowledgeError) {
        console.error(
          "Knowledge loading error:",
          JSON.stringify(
            knowledgeError,
            null,
            2
          )
        );

        const savedKnowledge =
          localStorage.getItem(
            "yaqqaKnowledge"
          );

        if (savedKnowledge) {
          try {
            setKnowledge(
              JSON.parse(savedKnowledge)
            );
          } catch {
            setKnowledge([]);
          }
        }
      } else {
        const formattedKnowledge =
          (
            knowledgeData as KnowledgeItem[] | null
          )?.map((item) => ({
            title: item.title,
            content: item.content,
          })) || [];

        setKnowledge(
          formattedKnowledge
        );

        localStorage.setItem(
          "yaqqaKnowledge",
          JSON.stringify(
            formattedKnowledge
          )
        );
      }

      // LOAD SUBSCRIPTION

      const {
        data: subscription,
        error: subscriptionError,
      } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("userid", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (subscriptionError) {
        console.error(
          "Subscription loading error:",
          JSON.stringify(
            subscriptionError,
            null,
            2
          )
        );
      }

      const currentPlan =
        subscription?.plan || "start";

      setPlan(currentPlan);

      // CURRENT MONTH

      const now = new Date();

      const periodStart =
        `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, "0")}-01`;

      // LOAD USAGE

      const {
        data: existingUsage,
        error: usageError,
      } = await supabase
        .from("usage")
        .select(
          "id, userid, period_start, ai_chat_messages, ai_writer_generations, ai_replies"
        )
        .eq("userid", user.id)
        .eq(
          "period_start",
          periodStart
        )
        .maybeSingle();

      if (usageError) {
        console.error(
          "Usage loading error:",
          JSON.stringify(
            usageError,
            null,
            2
          )
        );
      }

      if (existingUsage) {
        setUsage(existingUsage);
      } else {
        // CREATE USAGE RECORD

        const {
          data: newUsage,
          error: createUsageError,
        } = await supabase
          .from("usage")
          .insert({
            userid: user.id,
            period_start:
              periodStart,
            ai_chat_messages: 0,
            ai_writer_generations: 0,
            ai_replies: 0,
          })
          .select(
            "id, userid, period_start, ai_chat_messages, ai_writer_generations, ai_replies"
          )
          .single();

        if (createUsageError) {
          console.error(
            "Usage creation error:",
            JSON.stringify(
              createUsageError,
              null,
              2
            )
          );

          setErrorMessage(
            `YAQQA could not create the monthly usage record. ${
              createUsageError.message ||
              "Please check the browser console for details."
            }`
          );
        } else if (newUsage) {
          setUsage(newUsage);
        }
      }
    } catch (error) {
      console.error(
        "Chat loading error:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      setErrorMessage(
        "YAQQA could not load AI Chat. Please refresh the page."
      );
    } finally {
      setPageLoading(false);
    }
  }

  async function askYaqqa() {
    if (
      !message.trim() ||
      loading ||
      limitReached
    ) {
      return;
    }

    const userMessage =
      message.trim();

    setMessage("");

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setLoading(true);
    setErrorMessage("");

    try {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error("Please log in again to use YAQQA Chat.");
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
            business: {
              name: businessName,
              description:
                businessDescription,
              country,
            },
            knowledge,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "YAQQA couldn't generate a response."
        );
      }

      const assistantReply =
        data.reply ||
        "YAQQA couldn't generate a response.";

      // ADD SUCCESSFUL RESPONSE

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: assistantReply,
        },
      ]);

      // ONLY COUNT THE MESSAGE AFTER
      // A SUCCESSFUL AI RESPONSE

      if (usage) {
        const newCount =
          usage.ai_chat_messages + 1;

        const {
          data: updatedUsage,
          error: updateError,
        } = await supabase
          .from("usage")
          .update({
            ai_chat_messages:
              newCount,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            usage.id
          )
          .select(
            "id, userid, period_start, ai_chat_messages, ai_writer_generations, ai_replies"
          )
          .single();

        if (updateError) {
          console.error(
            "Usage update error:",
            JSON.stringify(
              updateError,
              null,
              2
            )
          );
        } else if (updatedUsage) {
          setUsage(
            updatedUsage
          );
        }
      }
    } catch (error) {
      console.error(
        "Chat generation error:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

      // Remove the user's message if
      // the AI request failed.

      setMessages((previous) =>
        previous.filter(
          (_, index) =>
            index !==
            previous.length - 1
        )
      );

      setErrorMessage(
        "YAQQA couldn't generate a response. Please check your AI connection or account credits."
      );
    } finally {
      setLoading(false);

      textareaRef.current?.focus();
    }
  }

  function useSuggestion(
    text: string
  ) {
    if (limitReached) {
      return;
    }

    setMessage(text);

    textareaRef.current?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      askYaqqa();
    }
  }

  if (pageLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0b1020",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        Loading YAQQA AI...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "white",
        fontFamily:
          "Arial, sans-serif",
        display: "flex",
        boxSizing: "border-box",
      }}
    >
      <aside
        style={{
          width: "230px",
          borderRight:
            "1px solid #252c40",
          padding: "28px 18px",
          boxSizing:
            "border-box",
          flexShrink: 0,
        }}
      >
        <a
          href="/dashboard"
          style={{
            display: "block",
            color: "white",
            textDecoration:
              "none",
            fontSize: "21px",
            fontWeight: "800",
            letterSpacing:
              "4px",
            padding: "0 12px",
            marginBottom:
              "45px",
          }}
        >
          YAQQA
        </a>

        <p
          style={{
            color: "#68738e",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing:
              "1.5px",
            padding: "0 12px",
            marginBottom:
              "10px",
          }}
        >
          WORKSPACE
        </p>

        <nav
          style={{
            display: "grid",
            gap: "5px",
          }}
        >
          <a
            href="/dashboard"
            style={navItem}
          >
            ⌂ Home
          </a>

          <a
            href="/chat"
            style={navItemActive}
          >
            ✦ AI Chat
          </a>

          <a
            href="/writer"
            style={navItem}
          >
            ✎ AI Writer
          </a>

          <a
            href="/leads"
            style={navItem}
          >
            ♙ Leads & Customers
          </a>

          <a
            href="/files"
            style={navItem}
          >
            ▣ Business Knowledge
          </a>
        </nav>

        <p
          style={{
            color: "#68738e",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing:
              "1.5px",
            padding: "0 12px",
            marginTop:
              "35px",
            marginBottom:
              "10px",
          }}
        >
          ACCOUNT
        </p>

        <a
          href="/settings"
          style={navItem}
        >
          ⚙ Settings
        </a>
      </aside>

      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection:
            "column",
          minWidth: 0,
          height: "100vh",
        }}
      >
        <header
          style={{
            padding:
              "24px 35px",
            borderBottom:
              "1px solid #252c40",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: "20px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize:
                  "20px",
                margin:
                  "0 0 5px",
              }}
            >
              YAQQA AI
            </h1>

            <p
              style={{
                color:
                  "#68738e",
                fontSize:
                  "13px",
                margin: 0,
              }}
            >
              Your AI business mate
            </p>
          </div>

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                padding:
                  "8px 12px",
                borderRadius:
                  "8px",
                background:
                  "#151b2d",
                border:
                  "1px solid #252c40",
                color:
                  "#b8c0d4",
                fontSize:
                  "12px",
              }}
            >
              {businessName}
            </div>
          </div>
        </header>

        <div
          style={{
            padding:
              "12px 35px",
            borderBottom:
              "1px solid #252c40",
            background:
              "#0d1424",
          }}
        >
          <div
            style={{
              maxWidth:
                "850px",
              margin:
                "0 auto",
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "20px",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#68738e",
                  fontSize:
                    "10px",
                  fontWeight:
                    "bold",
                  letterSpacing:
                    "1.2px",
                }}
              >
                CURRENT PLAN
              </div>

              <div
                style={{
                  fontSize:
                    "13px",
                  fontWeight:
                    "700",
                  marginTop:
                    "3px",
                }}
              >
                {planConfig.name}
              </div>
            </div>

            <div
              style={{
                textAlign:
                  "right",
              }}
            >
              <div
                style={{
                  color:
                    "#68738e",
                  fontSize:
                    "10px",
                  fontWeight:
                    "bold",
                  letterSpacing:
                    "1.2px",
                }}
              >
                AI CHAT
              </div>

              <div
                style={{
                  fontSize:
                    "16px",
                  fontWeight:
                    "700",
                  marginTop:
                    "2px",
                }}
              >
                {chatUsed} / {chatLimit}
              </div>

              <div
                style={{
                  color:
                    "#68738e",
                  fontSize:
                    "10px",
                  marginTop:
                    "2px",
                }}
              >
                {remaining} message
                {remaining ===
                1
                  ? ""
                  : "s"}{" "}
                remaining this month
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              margin:
                "18px 35px 0",
              background:
                "#35151a",
              border:
                "1px solid #7f1d1d",
              color:
                "#fecaca",
              borderRadius:
                "10px",
              padding:
                "12px 15px",
              lineHeight:
                "1.5",
              fontSize:
                "13px",
            }}
          >
            <div
              style={{
                maxWidth:
                  "850px",
                margin:
                  "0 auto",
              }}
            >
              {errorMessage}
            </div>
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY:
              "auto",
            padding:
              "35px",
            boxSizing:
              "border-box",
          }}
        >
          <div
            style={{
              maxWidth:
                "850px",
              margin:
                "0 auto",
            }}
          >
            {messages.length ===
            0 ? (
              <div
                style={{
                  minHeight:
                    "55vh",
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  justifyContent:
                    "center",
                  alignItems:
                    "center",
                  textAlign:
                    "center",
                }}
              >
                <div
                  style={{
                    width:
                      "64px",
                    height:
                      "64px",
                    borderRadius:
                      "18px",
                    background:
                      "#151b2d",
                    border:
                      "1px solid #30384f",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize:
                      "28px",
                    marginBottom:
                      "25px",
                  }}
                >
                  ✦
                </div>

                <h2
                  style={{
                    fontSize:
                      "32px",
                    margin:
                      "0 0 12px",
                  }}
                >
                  How can I help?
                </h2>

                <p
                  style={{
                    color:
                      "#8f99b2",
                    fontSize:
                      "16px",
                    lineHeight:
                      "1.6",
                    maxWidth:
                      "560px",
                    margin:
                      "0 auto",
                  }}
                >
                  Ask YAQQA about
                  your business,
                  customers,
                  content,
                  products or
                  anything else you
                  need help with.
                </p>

                <div
                  style={{
                    display:
                      "flex",
                    flexWrap:
                      "wrap",
                    justifyContent:
                      "center",
                    gap:
                      "10px",
                    marginTop:
                      "30px",
                  }}
                >
                  <Suggestion
                    text="Write a customer reply"
                    onClick={() =>
                      useSuggestion(
                        "Write a professional reply to a customer asking about our services."
                      )
                    }
                    disabled={
                      limitReached
                    }
                  />

                  <Suggestion
                    text="Create a social post"
                    onClick={() =>
                      useSuggestion(
                        "Create a social media post promoting my business."
                      )
                    }
                    disabled={
                      limitReached
                    }
                  />

                  <Suggestion
                    text="Tell me about my business"
                    onClick={() =>
                      useSuggestion(
                        "What do you know about my business?"
                      )
                    }
                    disabled={
                      limitReached
                    }
                  />
                </div>
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",
                  gap:
                    "25px",
                }}
              >
                {messages.map(
                  (item, index) => (
                    <div
                      key={index}
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          item.role ===
                          "user"
                            ? "flex-end"
                            : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth:
                            "75%",
                          padding:
                            "16px 19px",
                          borderRadius:
                            "14px",
                          background:
                            item.role ===
                            "user"
                              ? "#ffffff"
                              : "#151b2d",
                          color:
                            item.role ===
                            "user"
                              ? "#0b1020"
                              : "#dce1ed",
                          border:
                            item.role ===
                            "user"
                              ? "none"
                              : "1px solid #252c40",
                          lineHeight:
                            "1.6",
                          whiteSpace:
                            "pre-wrap",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "11px",
                            fontWeight:
                              "bold",
                            color:
                              "#68738e",
                            marginBottom:
                              "6px",
                            textTransform:
                              "uppercase",
                            letterSpacing:
                              "1px",
                          }}
                        >
                          {item.role ===
                          "user"
                            ? "You"
                            : "YAQQA"}
                        </div>

                        {item.content}
                      </div>
                    </div>
                  )
                )}

                {loading && (
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "flex-start",
                    }}
                  >
                    <div
                      style={{
                        padding:
                          "16px 19px",
                        borderRadius:
                          "14px",
                        background:
                          "#151b2d",
                        border:
                          "1px solid #252c40",
                        color:
                          "#8f99b2",
                      }}
                    >
                      YAQQA is
                      thinking...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding:
              "20px 35px 25px",
            borderTop:
              "1px solid #252c40",
          }}
        >
          <div
            style={{
              maxWidth:
                "850px",
              margin:
                "0 auto",
            }}
          >
            <div
              style={{
                background:
                  "#151b2d",
                border:
                  "1px solid #30384f",
                borderRadius:
                  "14px",
                padding:
                  "10px",
                display:
                  "flex",
                gap:
                  "10px",
                alignItems:
                  "flex-end",
              }}
            >
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(
                  event
                ) =>
                  setMessage(
                    event.target
                      .value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                disabled={
                  limitReached
                }
                placeholder={
                  limitReached
                    ? "Monthly AI Chat limit reached."
                    : "Message YAQQA..."
                }
                rows={2}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background:
                    "transparent",
                  color:
                    "white",
                  border:
                    "none",
                  outline:
                    "none",
                  padding:
                    "10px",
                  fontSize:
                    "15px",
                  lineHeight:
                    "1.5",
                  resize:
                    "none",
                  fontFamily:
                    "Arial, sans-serif",
                  opacity:
                    limitReached
                      ? 0.5
                      : 1,
                }}
              />

              <button
                onClick={
                  askYaqqa
                }
                disabled={
                  loading ||
                  !message.trim() ||
                  limitReached
                }
                style={{
                  width:
                    "45px",
                  height:
                    "45px",
                  borderRadius:
                    "10px",
                  border:
                    "none",
                  background:
                    loading ||
                    !message.trim() ||
                    limitReached
                      ? "#30384f"
                      : "white",
                  color:
                    loading ||
                    !message.trim() ||
                    limitReached
                      ? "#68738e"
                      : "#0b1020",
                  fontSize:
                    "18px",
                  cursor:
                    loading ||
                    !message.trim() ||
                    limitReached
                      ? "default"
                      : "pointer",
                  flexShrink:
                    0,
                }}
              >
                ↑
              </button>
            </div>

            <p
              style={{
                color:
                  "#4f5a73",
                fontSize:
                  "11px",
                textAlign:
                  "center",
                margin:
                  "10px 0 0",
              }}
            >
              {limitReached
                ? "Your monthly AI Chat limit has been reached."
                : "Press Enter to send · Shift + Enter for a new line"}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Suggestion({
  text,
  onClick,
  disabled,
}: {
  text: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background:
          disabled
            ? "#101624"
            : "#151b2d",
        color:
          disabled
            ? "#4f5a73"
            : "#b8c0d4",
        border:
          "1px solid #30384f",
        borderRadius:
          "9px",
        padding:
          "10px 13px",
        fontSize:
          "12px",
        cursor:
          disabled
            ? "default"
            : "pointer",
      }}
    >
      {text}
    </button>
  );
}

const navItem = {
  display: "block",
  padding: "12px",
  borderRadius: "9px",
  color: "#8f99b2",
  textDecoration: "none",
  fontSize: "14px",
};

const navItemActive = {
  ...navItem,
  background: "#151b2d",
  color: "white",
  border:
    "1px solid #252c40",
};