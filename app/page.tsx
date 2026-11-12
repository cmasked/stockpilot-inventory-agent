"use client";

import { useState, useEffect } from "react";
import NavigationTabs, { type TabId } from "@/components/NavigationTabs";
import DashboardView from "@/components/DashboardView";
import ProductCatalog from "@/components/ProductCatalog";
import PurchaseOrdersView from "@/components/PurchaseOrdersView";
import AgentChat from "@/components/AgentChat";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [prefillPrompt, setPrefillPrompt] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [headerMetrics, setHeaderMetrics] = useState<{
    lowStockCount: number;
    draftOrderCount: number;
  }>({ lowStockCount: 0, draftOrderCount: 0 });

  // Fetch quick indicator badges
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setHeaderMetrics({
            lowStockCount: data.metrics?.low_stock_count ?? 0,
            draftOrderCount: data.metrics?.draft_orders_count ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to load header metrics", err);
      }
    }
    fetchCounts();
  }, [refreshKey]);

  function handleDataChanged() {
    setRefreshKey((k) => k + 1);
  }

  function handleNavigateToTab(tab: TabId, prompt?: string) {
    if (prompt) {
      setPrefillPrompt(prompt);
    }
    setActiveTab(tab);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6 min-h-screen flex flex-col">
      {/* Header */}
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">StockPilot</h1>
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              FreshMart · Velachery
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Autonomous Inventory Restocking Agent & Purchase Order Engine (PS2)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-900 font-medium px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lowStockCount={headerMetrics.lowStockCount}
        draftOrderCount={headerMetrics.draftOrderCount}
      />

      {/* Tab Panels */}
      <div className="flex-1">
        {activeTab === "dashboard" && (
          <DashboardView
            refreshKey={refreshKey}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === "products" && (
          <ProductCatalog
            refreshKey={refreshKey}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === "orders" && (
          <PurchaseOrdersView
            refreshKey={refreshKey}
            onOrderUpdated={handleDataChanged}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === "agent" && (
          <div className="grid md:grid-cols-5 gap-6">
            <div className="md:col-span-3">
              <AgentChat
                onDataChanged={handleDataChanged}
                prefillPrompt={prefillPrompt}
              />
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Store Restocking Guardrails
                </h3>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                  <li>
                    <strong className="text-slate-900">Low Stock Trigger:</strong> When current stock ≤ reorder level.
                  </li>
                  <li>
                    <strong className="text-slate-900">Order Quantity:</strong> Automatically set to each product&apos;s specified reorder quantity.
                  </li>
                  <li>
                    <strong className="text-slate-900">Supplier Grouping:</strong> Exactly one Purchase Order drafted per supplier.
                  </li>
                  <li>
                    <strong className="text-slate-900">Expected Delivery:</strong> Calculated from today + supplier lead time days.
                  </li>
                  <li>
                    <strong className="text-slate-900">Stock Safety:</strong> Stock levels are never altered on PO drafting — only updated upon arrival.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Sample Prompts for Velachery Branch
                </h3>
                <div className="space-y-1.5">
                  {[
                    "Which products need restocking today?",
                    "Draft purchase orders for low stock Dairy items.",
                    "Estimate days of stock remaining for Staples.",
                    "What is the total restock expenditure for pending items?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setPrefillPrompt(prompt)}
                      className="w-full text-left text-[11px] p-2 rounded bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      💬 {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
