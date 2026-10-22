"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Home", href: "/dashboard", icon: "⌂" },
  { label: "AI Chat", href: "/chat", icon: "✧" },
  { label: "AI Writer", href: "/writer", icon: "✎" },
  { label: "Leads & Customers", href: "/leads", icon: "♧" },
  { label: "Business Knowledge", href: "/files", icon: "▤" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 250,
        minHeight: "100vh",
        flexShrink: 0,
        padding: "30px 18px",
        background: "#0a0f1c",
        borderRight: "1px solid #253047",
        boxSizing: "border-box",
      }}
    >
      <Link
        href="/dashboard"
        style={{
          display: "block",
          color: "#ffffff",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-1px",
          textDecoration: "none",
        }}
      >
        YAQQA
      </Link>

      <p
        style={{
          color: "#94a3b8",
          fontSize: 13,
          marginTop: 6,
          marginBottom: 34,
        }}
      >
        Your AI business mate.
      </p>

      <nav style={{ display: "grid", gap: 7 }}>
        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                color: active ? "#ffffff" : "#94a3b8",
                background: active ? "#172033" : "transparent",
                border: active
                  ? "1px solid #293750"
                  : "1px solid transparent",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 20,
                  textAlign: "center",
                  fontSize: 17,
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: 36,
          padding: 14,
          borderRadius: 12,
          border: "1px solid #253047",
          background: "#111827",
        }}
      >
        <div
          style={{
            color: "#e2e8f0",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Your AI business mate
        </div>

        <p
          style={{
            color: "#94a3b8",
            fontSize: 12,
            lineHeight: 1.6,
            marginBottom: 0,
          }}
        >
          Keep your business organised with YAQQA.
        </p>
      </div>
    </aside>
  );
}
