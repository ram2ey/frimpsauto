"use client";

import { useState } from "react";
import { ClipboardList, ListChecks, Package, FileText, ReceiptText } from "lucide-react";

export type TabKey = "overview" | "checklist" | "parts" | "diagnostics" | "billing";

interface JobTabsProps {
  overview: React.ReactNode;
  checklist: React.ReactNode;
  parts: React.ReactNode;
  diagnostics: React.ReactNode;
  billing: React.ReactNode;
  counts: {
    checklist?: string;
    parts?: number;
    diagnostics?: number;
    billing?: string;
  };
  defaultTab?: TabKey;
}

const TABS: { id: TabKey; label: string; icon: typeof ClipboardList }[] = [
  { id: "overview", label: "Overview & Vehicle", icon: ClipboardList },
  { id: "checklist", label: "Inspection Checklist", icon: ListChecks },
  { id: "parts", label: "Parts Requests", icon: Package },
  { id: "diagnostics", label: "Diagnostics & Files", icon: FileText },
  { id: "billing", label: "Invoice & Billing", icon: ReceiptText },
];

export function JobTabs({
  overview,
  checklist,
  parts,
  diagnostics,
  billing,
  counts,
  defaultTab = "overview",
}: JobTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % TABS.length;
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
      e.preventDefault();
    } else if (e.key === "Home") {
      nextIndex = 0;
      e.preventDefault();
    } else if (e.key === "End") {
      nextIndex = TABS.length - 1;
      e.preventDefault();
    }
    if (nextIndex !== index) {
      const nextTab = TABS[nextIndex].id;
      setActiveTab(nextTab);
      document.getElementById(`tab-${nextTab}`)?.focus();
    }
  };

  const renderBadge = (id: TabKey) => {
    if (id === "checklist" && counts.checklist) {
      return <span className="pill">{counts.checklist}</span>;
    }
    if (id === "parts" && typeof counts.parts === "number" && counts.parts > 0) {
      return <span className="pill">{counts.parts}</span>;
    }
    if (id === "diagnostics" && typeof counts.diagnostics === "number" && counts.diagnostics > 0) {
      return <span className="pill">{counts.diagnostics}</span>;
    }
    if (id === "billing" && counts.billing) {
      return <span className="pill">{counts.billing}</span>;
    }
    return null;
  };

  return (
    <div className="job-workspace">
      <div className="job-tabs" role="tablist" aria-label="Job operational sections">
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`job-tab-btn${isActive ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={e => handleKeyDown(e, index)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
              {renderBadge(tab.id)}
            </button>
          );
        })}
      </div>

      <div
        id="panel-overview"
        role="tabpanel"
        aria-labelledby="tab-overview"
        className="job-tab-panel"
        hidden={activeTab !== "overview"}
      >
        {overview}
      </div>

      <div
        id="panel-checklist"
        role="tabpanel"
        aria-labelledby="tab-checklist"
        className="job-tab-panel"
        hidden={activeTab !== "checklist"}
      >
        {checklist}
      </div>

      <div
        id="panel-parts"
        role="tabpanel"
        aria-labelledby="tab-parts"
        className="job-tab-panel"
        hidden={activeTab !== "parts"}
      >
        {parts}
      </div>

      <div
        id="panel-diagnostics"
        role="tabpanel"
        aria-labelledby="tab-diagnostics"
        className="job-tab-panel"
        hidden={activeTab !== "diagnostics"}
      >
        {diagnostics}
      </div>

      <div
        id="panel-billing"
        role="tabpanel"
        aria-labelledby="tab-billing"
        className="job-tab-panel"
        hidden={activeTab !== "billing"}
      >
        {billing}
      </div>
    </div>
  );
}
