"use client";

import type { ComponentType } from "react";
import { FiFileText, FiSend, FiClock } from "react-icons/fi";
import { cn } from "@/lib/utils";

type WhatsAppTab = "templates" | "send" | "logs";

interface WhatsAppTabsProps {
  activeTab: WhatsAppTab;
  onChange: (tab: WhatsAppTab) => void;
}

export default function WhatsAppTabs({ activeTab, onChange }: WhatsAppTabsProps) {
  const tabs: Array<{ key: WhatsAppTab; label: string; icon: ComponentType<{ className?: string }> }> = [
    { key: "templates", label: "Templates", icon: FiFileText },
    { key: "send", label: "Send Message", icon: FiSend },
    { key: "logs", label: "Message Logs", icon: FiClock },
  ];

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "inline-flex min-w-[120px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none",
              isActive
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
