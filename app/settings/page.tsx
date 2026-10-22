
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type Business = {
  id: number | string;
  name: string | null;
  description: string | null;
  country: string | null;
};

const countries = [
  "Australia",
  "Philippines",
  "United States",
  "United Kingdom",
  "Canada",
  "New Zealand",
  "Singapore",
  "Other",
];

export default function SettingsPage() {
  const [businessId, setBusinessId] = useState<number | string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error: queryError } = await supabase
        .from("Businesses")
        .select("id, name, description, country")
        .eq("userid", user.id)
        .limit(1)
        .maybeSingle();

      if (queryError) throw queryError;

      if (data) {
        const business = data as Business;

        setBusinessId(business.id);
        setBusinessName(business.name || "");
        setDescription(business.description || "");
        setCountry(business.country || "");

        localStorage.setItem(
          "yaqqaBusiness",
          JSON.stringify({
            name: business.name || "",
            description: business.description || "",
            country: business.country || "",
          })
        );

        return;
      }

      const localData = localStorage.getItem("yaqqaBusiness");

      if (localData) {
        try {
          const business = JSON.parse(localData);
          setBusinessName(business.name || business.businessName || "");
          setDescription(business.description || "");
          setCountry(business.country || "");
        } catch {
          // Ignore invalid browser data.
        }
      }

      setError(
        "No business record was found for this account. Check your details below and save to create a business record."
      );
    } catch (err) {
      console.error("Settings loading error:", err);
      setError(
        err instanceof Error
? "Could not load settings: " + err.message
          : "Could not load settings. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

   useEffect(() => {
    async function initializeSettings() {
      await loadSettings();
    }

    initializeSettings();
  }, [loadSettings]); 

  async function saveSettings() {
    setError("");
    setSaved(false);

    if (!businessName.trim()) {
      setError("Please enter your business name.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const businessData = {
        name: businessName.trim(),
        description: description.trim(),
        country,
      };

      if (businessId !== null) {
        const { data, error: updateError } = await supabase
          .from("Businesses")
          .update(businessData)
          .eq("id", businessId)
          .eq("userid", user.id)
          .select("id");

        if (updateError) throw updateError;

        if (!data || data.length === 0) {
          throw new Error(
            "No business record was updated. Check your Supabase permissions and business ownership."
          );
        }
      } else {
        const { data, error: insertError } = await supabase
          .from("Businesses")
          .insert({
            ...businessData,
            userid: user.id,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        setBusinessId(data.id);
      }

      localStorage.setItem(
        "yaqqaBusiness",
        JSON.stringify(businessData)
      );

      setBusinessName(businessData.name);
      setSaved(true);
    } catch (err) {
      console.error("Settings save error:", err);
      setError(
        err instanceof Error
? "Save failed: " + err.message
          : "Save failed because of an unknown error."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "13px 14px",
    marginTop: "8px",
    background: "#0b1220",
    color: "#f8fafc",
    border: "1px solid #30384f",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 650,
    marginBottom: "20px",
  };

  const cardStyle = {
    background: "#111827",
    border: "1px solid #253047",
    borderRadius: "16px",
    padding: "24px",
  };

  const mutedStyle = { color: "#94a3b8" };

  const navItems = [
    { label: "Home", href: "/dashboard", icon: "⌂" },
    { label: "AI Chat", href: "/chat", icon: "✳" },
    { label: "AI Writer", href: "/writer", icon: "✎" },
    { label: "Leads & Customers", href: "/leads", icon: "◎" },
    { label: "Business Knowledge", href: "/files", icon: "▤" },
    { label: "Settings", href: "/settings", icon: "⚙" },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#0b1020",
        color: "#f8fafc",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <aside
        style={{
          width: "232px",
          flexShrink: 0,
          padding: "26px 16px",
          background: "#090e1a",
          borderRight: "1px solid #202a3d",
          boxSizing: "border-box",
        }}
      >
        <a
          href="/dashboard"
          style={{
            display: "block",
            padding: "0 10px",
            color: "#fff",
            textDecoration: "none",
            fontSize: "27px",
            fontWeight: 850,
            letterSpacing: "-1.3px",
          }}
        >
          YAQQA<span style={{ color: "#a78bfa" }}>.</span>
        </a>

        <div
          style={{
            ...mutedStyle,
            fontSize: "12px",
            margin: "6px 10px 34px",
          }}
        >
          Your AI business mate.
        </div>

        <div
          style={{
            ...mutedStyle,
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "1.4px",
            padding: "0 12px",
            marginBottom: "12px",
          }}
        >
          WORKSPACE
        </div>

        <nav style={{ display: "grid", gap: "5px" }}>
          {navItems.map((item) => {
            const active = item.href === "/settings";

            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  color: active ? "#fff" : "#9aa8bc",
                  background: active
                    ? "linear-gradient(100deg, #292143, #1a1b32)"
                    : "transparent",
                  border: active
                    ? "1px solid #40345f"
                    : "1px solid transparent",
                  fontSize: "13px",
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span
                  style={{
                    width: "19px",
                    textAlign: "center",
                    fontSize: "17px",
                    color: active ? "#c4b5fd" : "#8290a5",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </a>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: "38px",
            padding: "16px",
            borderRadius: "13px",
            border: "1px solid #2c2945",
            background: "linear-gradient(145deg, #19172b, #101626)",
          }}
        >
          <div
            style={{
              color: "#c4b5fd",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            YOUR WORKSPACE
          </div>

          <p
            style={{
              ...mutedStyle,
              fontSize: "12px",
              lineHeight: 1.6,
              margin: "8px 0 0",
            }}
          >
            Keep your business details up to date so YAQQA can assist you
            more effectively.
          </p>
        </div>
      </aside>

      <section
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: "1100px",
          padding: "34px",
          boxSizing: "border-box",
        }}
      >
        <header style={{ marginBottom: "28px" }}>
          <div
            style={{
              ...mutedStyle,
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "1.2px",
              marginBottom: "8px",
            }}
          >
            WORKSPACE PREFERENCES
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(27px, 3vw, 35px)",
              letterSpacing: "-1px",
              fontWeight: 800,
            }}
          >
            Settings
          </h1>

          <p
            style={{
              ...mutedStyle,
              fontSize: "14px",
              lineHeight: 1.7,
              margin: "10px 0 0",
              maxWidth: "650px",
            }}
          >
            Manage the business information YAQQA uses to tailor its
            assistance to your needs.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              padding: "15px 16px",
              marginBottom: "20px",
              borderRadius: "12px",
              background: "#301b27",
              border: "1px solid #713348",
              color: "#fecdd3",
              fontSize: "13px",
              lineHeight: 1.6,
              overflowWrap: "anywhere",
            }}
          >
            <strong style={{ display: "block", marginBottom: "4px" }}>
              Something needs attention
            </strong>
            {error}
            <button
              onClick={() => void loadSettings()}
              style={{
                display: "block",
                marginTop: "12px",
                padding: "9px 12px",
                background: "#172033",
                color: "#fff",
                border: "1px solid #334155",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Reload settings
            </button>
          </div>
        )}

        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                display: "grid",
                placeItems: "center",
                borderRadius: "12px",
                background: "#292143",
                border: "1px solid #44365f",
                color: "#c4b5fd",
                fontSize: "18px",
              }}
            >
              ◈
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: "17px" }}>
                Business profile
              </h2>
              <p
                style={{
                  ...mutedStyle,
                  margin: "5px 0 0",
                  fontSize: "12px",
                }}
              >
                Your core business information.
              </p>
            </div>
          </div>

          <div
            style={{
              height: "1px",
              background: "#253047",
              marginBottom: "24px",
            }}
          />

          {loading ? (
            <p style={mutedStyle}>Loading your business settings…</p>
          ) : (
            <>
              <label style={labelStyle}>
                Business name
                <input
                  value={businessName}
                  onChange={(event) => {
                    setBusinessName(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="e.g. YAQQA Test Business"
                  maxLength={120}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Business description
                <textarea
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="Describe your business and the customers you serve."
                  rows={5}
                  maxLength={3000}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    lineHeight: 1.7,
                    fontFamily: "inherit",
                  }}
                />
              </label>

              <label style={labelStyle}>
                Country
                <select
                  value={country}
                  onChange={(event) => {
                    setCountry(event.target.value);
                    setSaved(false);
                  }}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">Select country</option>
                  {countries.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => void saveSettings()}
                disabled={saving}
                style={{
                  padding: "12px 19px",
                  background: saving ? "#5b4b83" : "#8b5cf6",
                  color: "#fff",
                  border: "1px solid #8b5cf6",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 750,
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.8 : 1,
                }}
              >
                {saving ? "Saving changes…" : "Save changes"}
              </button>

              {saved && (
                <p
                  role="status"
                  style={{
                    color: "#86efac",
                    fontSize: "13px",
                    fontWeight: 650,
                    marginTop: "16px",
                  }}
                >
                  ✓ Settings saved successfully.
                </p>
              )}
            </>
          )}
        </section>

        <section style={{ ...cardStyle, marginTop: "20px" }}>
          <h2 style={{ marginTop: 0, fontSize: "17px" }}>
            YAQQA account
          </h2>
          <p
            style={{
              ...mutedStyle,
              fontSize: "13px",
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            Your business profile is connected to your signed-in YAQQA
            account. Subscription management, billing, and integrations
            can be added as those features become available.
          </p>
        </section>

        <a
          href="/dashboard"
          style={{
            display: "inline-block",
            marginTop: "24px",
            color: "#c4b5fd",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 650,
          }}
        >
          ← Back to dashboard
        </a>
      </section>
    </main>
  );
}