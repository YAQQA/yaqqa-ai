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

export default function Files() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [category, setCategory] =
    useState("Products & Services");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [plan, setPlan] = useState("start");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const categories = [
    "Products & Services",
    "Pricing",
    "Opening Hours",
    "FAQs",
    "Policies",
    "Delivery",
    "About the Business",
    "Other",
  ];

  const planConfig = getPlanConfig(plan);
  const knowledgeLimit =
    planConfig.limits.knowledgeItems;
  const knowledgeUsed = items.length;
  const remaining = Math.max(
    knowledgeLimit - knowledgeUsed,
    0
  );
  const limitReached =
    knowledgeUsed >= knowledgeLimit;

  useEffect(() => {
    loadKnowledge();
  }, []);

  async function loadKnowledge() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      window.location.href = "/login";
      return;
    }

    // LOAD KNOWLEDGE

    const {
      data,
      error,
    } = await supabase
      .from("knowledge")
      .select(
        "id, category, title, content"
      )
      .eq("userid", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Knowledge loading error:",
        JSON.stringify(error, null, 2)
      );

      setMessage(
        "YAQQA couldn't load your business knowledge."
      );

      setLoading(false);
      return;
    }

    const loadedItems: KnowledgeItem[] =
      (data || []).map((item) => ({
        id: item.id,
        category:
          item.category || "Other",
        title: item.title,
        content: item.content,
      }));

    setItems(loadedItems);

    localStorage.setItem(
      "yaqqaKnowledge",
      JSON.stringify(loadedItems)
    );

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

    setPlan(
      subscription?.plan || "start"
    );

    setLoading(false);
  }

  async function addKnowledge() {
    if (
      !title.trim() ||
      !content.trim() ||
      saving
    ) {
      return;
    }

    if (limitReached) {
      setMessage(
        `${planConfig.name} allows up to ${knowledgeLimit} business knowledge items. Upgrade your plan to add more.`
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "You must be logged in to save business knowledge."
      );

      setSaving(false);
      return;
    }

    // DOUBLE CHECK THE LIMIT
    // BEFORE INSERTING

    const {
      count,
      error: countError,
    } = await supabase
      .from("knowledge")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("userid", user.id);

    if (countError) {
      console.error(
        "Knowledge count error:",
        JSON.stringify(
          countError,
          null,
          2
        )
      );

      setMessage(
        "YAQQA couldn't check your knowledge limit."
      );

      setSaving(false);
      return;
    }

    if (
      (count || 0) >=
      knowledgeLimit
    ) {
      setMessage(
        `${planConfig.name} allows up to ${knowledgeLimit} business knowledge items. Upgrade your plan to add more.`
      );

      setSaving(false);
      return;
    }

    // INSERT KNOWLEDGE

    const {
      data,
      error,
    } = await supabase
      .from("knowledge")
      .insert({
        userid: user.id,
        category,
        title: title.trim(),
        content: content.trim(),
      })
      .select(
        "id, category, title, content"
      )
      .single();

    if (error) {
      console.error(
        "Knowledge save error:",
        JSON.stringify(error, null, 2)
      );

      setMessage(error.message);

      setSaving(false);
      return;
    }

    const newItem: KnowledgeItem = {
      id: data.id,
      category:
        data.category || "Other",
      title: data.title,
      content: data.content,
    };

    const updatedItems = [
      newItem,
      ...items,
    ];

    setItems(updatedItems);

    localStorage.setItem(
      "yaqqaKnowledge",
      JSON.stringify(updatedItems)
    );

    setTitle("");
    setContent("");
    setSaving(false);
  }

  async function deleteKnowledge(
    id: string
  ) {
    setMessage("");

    const {
      error,
    } = await supabase
      .from("knowledge")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Knowledge delete error:",
        JSON.stringify(error, null, 2)
      );

      setMessage(
        "YAQQA couldn't delete this information."
      );

      return;
    }

    const updatedItems =
      items.filter(
        (item) => item.id !== id
      );

    setItems(updatedItems);

    localStorage.setItem(
      "yaqqaKnowledge",
      JSON.stringify(updatedItems)
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
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <a
          href="/dashboard"
          style={{
            display: "block",
            color: "white",
            textDecoration: "none",
            fontSize: "21px",
            fontWeight: "800",
            letterSpacing: "4px",
            padding: "0 12px",
            marginBottom: "45px",
          }}
        >
          YAQQA
        </a>

        <p
          style={{
            color: "#68738e",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing: "1.5px",
            padding: "0 12px",
            marginBottom: "10px",
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
            style={navItem}
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
            style={navItemActive}
          >
            ▣ Business Knowledge
          </a>
        </nav>

        <p
          style={{
            color: "#68738e",
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing: "1.5px",
            padding: "0 12px",
            marginTop: "35px",
            marginBottom: "10px",
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
          padding: "45px",
          boxSizing: "border-box",
          overflow: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "1150px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              marginBottom: "30px",
            }}
          >
            <p
              style={{
                color: "#68738e",
                fontSize: "13px",
                fontWeight: "bold",
                letterSpacing: "1.5px",
                margin: "0 0 10px",
              }}
            >
              BUSINESS KNOWLEDGE
            </p>

            <h1
              style={{
                fontSize: "40px",
                margin: "0 0 10px",
              }}
            >
              Teach YAQQA your business.
            </h1>

            <p
              style={{
                color: "#8f99b2",
                fontSize: "17px",
                lineHeight: "1.6",
                margin: 0,
                maxWidth: "700px",
              }}
            >
              Give YAQQA the information it
              needs to answer customers
              accurately and create better
              content.
            </p>
          </div>

          <div
            style={{
              background: "#151b2d",
              border:
                "1px solid #252c40",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "20px",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#68738e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  letterSpacing:
                    "1.2px",
                }}
              >
                CURRENT PLAN
              </div>

              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  marginTop: "3px",
                }}
              >
                {planConfig.name}
              </div>
            </div>

            <div
              style={{
                textAlign: "right",
              }}
            >
              <div
                style={{
                  color: "#68738e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  letterSpacing:
                    "1.2px",
                }}
              >
                BUSINESS KNOWLEDGE
              </div>

              <div
                style={{
                  fontSize: "17px",
                  fontWeight: "700",
                  marginTop: "3px",
                }}
              >
                {knowledgeUsed} /{" "}
                {knowledgeLimit}
              </div>

              <div
                style={{
                  color: "#68738e",
                  fontSize: "11px",
                  marginTop: "2px",
                }}
              >
                {remaining} item
                {remaining === 1
                  ? ""
                  : "s"}{" "}
                remaining
              </div>
            </div>
          </div>

          {message && (
            <div
              style={{
                marginBottom: "20px",
                padding:
                  "14px 16px",
                borderRadius: "10px",
                background:
                  "#2a1720",
                border:
                  "1px solid #5b2634",
                color: "#fca5a5",
              }}
            >
              {message}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(280px, 0.75fr) minmax(0, 1.25fr)",
              gap: "20px",
              alignItems: "start",
            }}
          >
            <div
              style={{
                background: "#151b2d",
                border:
                  "1px solid #252c40",
                borderRadius: "18px",
                padding: "25px",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 22px",
                  fontSize: "21px",
                }}
              >
                Add information
              </h2>

              <label
                style={labelStyle}
              >
                Category
              </label>

              <select
                value={category}
                onChange={(
                  event
                ) =>
                  setCategory(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                {categories.map(
                  (item) => (
                    <option
                      key={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>

              <label
                style={labelStyle}
              >
                Title
              </label>

              <input
                value={title}
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Example: Chocolate Cake"
                disabled={
                  limitReached
                }
                style={{
                  ...inputStyle,
                  opacity:
                    limitReached
                      ? 0.5
                      : 1,
                }}
              />

              <label
                style={labelStyle}
              >
                Information
              </label>

              <textarea
                value={content}
                onChange={(
                  event
                ) =>
                  setContent(
                    event.target.value
                  )
                }
                placeholder="Example: Our chocolate cake costs ₱850 and serves 8–10 people."
                rows={8}
                disabled={
                  limitReached
                }
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  lineHeight: "1.5",
                  opacity:
                    limitReached
                      ? 0.5
                      : 1,
                }}
              />

              <button
                onClick={
                  addKnowledge
                }
                disabled={
                  saving ||
                  !title.trim() ||
                  !content.trim() ||
                  limitReached
                }
                style={{
                  width: "100%",
                  padding: "15px",
                  background:
                    saving ||
                    !title.trim() ||
                    !content.trim() ||
                    limitReached
                      ? "#30384f"
                      : "white",
                  color:
                    saving ||
                    !title.trim() ||
                    !content.trim() ||
                    limitReached
                      ? "#68738e"
                      : "#0b1020",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor:
                    saving ||
                    !title.trim() ||
                    !content.trim() ||
                    limitReached
                      ? "default"
                      : "pointer",
                }}
              >
                {saving
                  ? "Saving..."
                  : limitReached
                  ? "Knowledge limit reached"
                  : "+ Save Information"}
              </button>

              {limitReached && (
                <p
                  style={{
                    color:
                      "#8f99b2",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    margin:
                      "12px 0 0",
                    textAlign:
                      "center",
                  }}
                >
                  {planConfig.name} allows{" "}
                  {knowledgeLimit}{" "}
                  business knowledge
                  items. Upgrade your
                  plan to add more.
                </p>
              )}
            </div>

            <div
              style={{
                background: "#151b2d",
                border:
                  "1px solid #252c40",
                borderRadius: "18px",
                padding: "25px",
                minHeight: "500px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "15px",
                  marginBottom:
                    "25px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin:
                        "0 0 5px",
                      fontSize: "21px",
                    }}
                  >
                    Your business knowledge
                  </h2>

                  <p
                    style={{
                      color:
                        "#68738e",
                      margin: 0,
                      fontSize:
                        "12px",
                    }}
                  >
                    Information YAQQA
                    can use
                  </p>
                </div>

                <span
                  style={{
                    color:
                      "#8f99b2",
                    fontSize:
                      "13px",
                  }}
                >
                  {knowledgeUsed} /{" "}
                  {knowledgeLimit}
                </span>
              </div>

              {loading ? (
                <div
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "70px 20px",
                    color:
                      "#68738e",
                  }}
                >
                  Loading your
                  business knowledge...
                </div>
              ) : items.length ===
                0 ? (
                <div
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "70px 20px",
                    color:
                      "#68738e",
                  }}
                >
                  <div
                    style={{
                      fontSize: "42px",
                      marginBottom:
                        "18px",
                    }}
                  >
                    ▣
                  </div>

                  <h3
                    style={{
                      color:
                        "#b8c0d4",
                      margin:
                        "0 0 8px",
                      fontSize:
                        "17px",
                    }}
                  >
                    No business knowledge yet
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      lineHeight:
                        "1.6",
                      fontSize:
                        "13px",
                    }}
                  >
                    Add your products,
                    prices, policies,
                    FAQs and other
                    important information.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display:
                      "grid",
                    gap: "12px",
                  }}
                >
                  {items.map(
                    (item) => (
                      <div
                        key={item.id}
                        style={{
                          background:
                            "#0b1020",
                          border:
                            "1px solid #30384f",
                          borderRadius:
                            "12px",
                          padding:
                            "18px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "flex-start",
                            gap: "15px",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                display:
                                  "inline-block",
                                fontSize:
                                  "10px",
                                color:
                                  "#8f99b2",
                                background:
                                  "#252c40",
                                padding:
                                  "5px 8px",
                                borderRadius:
                                  "20px",
                                marginBottom:
                                  "9px",
                              }}
                            >
                              {item.category}
                            </span>

                            <h3
                              style={{
                                margin: 0,
                                fontSize:
                                  "17px",
                              }}
                            >
                              {item.title}
                            </h3>
                          </div>

                          <button
                            onClick={() =>
                              deleteKnowledge(
                                item.id
                              )
                            }
                            style={{
                              background:
                                "transparent",
                              color:
                                "#68738e",
                              border:
                                "none",
                              cursor:
                                "pointer",
                              fontSize:
                                "12px",
                            }}
                          >
                            Delete
                          </button>
                        </div>

                        <p
                          style={{
                            color:
                              "#b8c0d4",
                            lineHeight:
                              "1.6",
                            whiteSpace:
                              "pre-wrap",
                            fontSize:
                              "13px",
                            margin:
                              "15px 0 0",
                          }}
                        >
                          {item.content}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              background:
                "#151b2d",
              border:
                "1px solid #252c40",
              borderRadius: "12px",
            }}
          >
            <p
              style={{
                margin:
                  "0 0 7px",
                color:
                  "#b8c0d4",
                fontWeight:
                  "bold",
                fontSize: "13px",
              }}
            >
              💡 What should you add?
            </p>

            <p
              style={{
                margin: 0,
                color:
                  "#68738e",
                fontSize: "12px",
                lineHeight:
                  "1.6",
              }}
            >
              Start with your most
              important products or
              services, prices, opening
              hours, delivery information
              and frequently asked
              questions. This information
              will help YAQQA give more
              accurate answers.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

const labelStyle = {
  display: "block",
  color: "#8f99b2",
  fontSize: "13px",
  marginBottom: "8px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px",
  background: "#0b1020",
  color: "white",
  border: "1px solid #30384f",
  borderRadius: "9px",
  fontSize: "14px",
  marginBottom: "20px",
};

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
  border: "1px solid #252c40",
};