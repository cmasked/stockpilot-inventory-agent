"use client";

export type TabId = "dashboard" | "products" | "orders" | "agent";

interface NavigationTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  lowStockCount?: number;
  draftOrderCount?: number;
}

export default function NavigationTabs({
  activeTab,
  onTabChange,
  lowStockCount = 0,
  draftOrderCount = 0,
}: NavigationTabsProps) {
  const tabs = [
    {
      id: "dashboard" as TabId,
      label: "Dashboard",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "products" as TabId,
      label: "Inventory & Stock",
      badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
      badgeColor: "bg-amber-100 text-amber-800",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "orders" as TabId,
      label: "Purchase Orders",
      badge: draftOrderCount > 0 ? `${draftOrderCount} draft` : undefined,
      badgeColor: "bg-blue-100 text-blue-800",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      id: "agent" as TabId,
      label: "Restock Agent",
      badge: "AI",
      badgeColor: "bg-emerald-100 text-emerald-800 font-semibold",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="flex space-x-1 border-b border-slate-200 bg-white px-2 py-1.5 rounded-lg shadow-xs mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center space-x-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              isActive
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`ml-1.5 px-2 py-0.5 text-xs rounded-full ${
                  isActive ? "bg-slate-800 text-slate-200" : tab.badgeColor
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

