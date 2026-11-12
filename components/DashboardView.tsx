"use client";

import { useEffect, useState } from "react";
import type { TabId } from "./NavigationTabs";

interface DashboardMetrics {
  total_products: number;
  low_stock_count: number;
  critical_runway_count: number;
  estimated_restock_cost: number;
  suppliers_count: number;
  total_orders: number;
  draft_orders_count: number;
  sent_orders_count: number;
}

interface UrgentItem {
  sku: string;
  name: string;
  category: string;
  stock_qty: number;
  reorder_level: number;
  reorder_qty: number;
  days_left: number | null;
  supplier_id: string;
  supplier_name: string;
}

interface RecentOrder {
  id: number;
  status: string;
  total_cost: number;
  created_at: string;
}

interface DashboardViewProps {
  refreshKey: number;
  onNavigateToTab: (tab: TabId, prefillPrompt?: string) => void;
}

export default function DashboardView({ refreshKey, onNavigateToTab }: DashboardViewProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
          setUrgentItems(data.urgent_items || []);
          setRecentOrders(data.recent_orders || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard metrics", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshKey]);

  if (loading && !metrics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500 animate-pulse">Loading FreshMart Velachery dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Branch & Store Banner */}
      <div className="bg-linear-to-r from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Store Manager Console</span>
          </div>
          <h2 className="text-xl font-bold mt-1">FreshMart — Velachery Branch</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Autonomous stock monitoring, depletion tracking, and supplier PO generation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigateToTab("agent", "Identify all critically low items and generate draft purchase orders for their suppliers.")}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>✨</span>
            <span>Auto-Draft All POs</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Inventory</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics?.total_products ?? 80}</div>
          <div className="text-xs text-slate-500 mt-1">
            Across {metrics?.suppliers_count ?? 10} suppliers
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <div className="text-xs font-medium text-amber-700 uppercase tracking-wider flex items-center justify-between">
            <span>Low Stock Alert</span>
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{metrics?.low_stock_count ?? 0}</div>
          <div className="text-xs text-amber-700 mt-1">
            ≤ reorder thresholds
          </div>
        </div>

        {/* Critical Runway */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs">
          <div className="text-xs font-medium text-rose-700 uppercase tracking-wider flex items-center justify-between">
            <span>Critical Runway</span>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{metrics?.critical_runway_count ?? 0}</div>
          <div className="text-xs text-rose-700 mt-1">
            ≤ 2 days of stock left
          </div>
        </div>

        {/* Estimated Reorder Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Restock Value</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ₹{metrics?.estimated_restock_cost?.toLocaleString("en-IN") ?? "0"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {metrics?.draft_orders_count ?? 0} draft POs pending
          </div>
        </div>
      </div>

      {/* Main Grid: Urgent Items + Recent POs */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Urgent Restock List */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Top Urgent Depletions</h3>
              <p className="text-xs text-slate-500">Items below reorder level sorted by lowest current stock</p>
            </div>
            <button
              onClick={() => onNavigateToTab("products")}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              View all →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {urgentItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No urgent depletions found.</div>
            ) : (
              urgentItems.map((item) => (
                <div key={item.sku} className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">{item.name}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                        {item.sku}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>Supplier: {item.supplier_name}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs">
                      <span className="font-bold text-rose-600">{item.stock_qty} in stock</span>
                      <span className="text-slate-400"> / {item.reorder_level} min</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.days_left !== null ? (
                        <span className={`font-semibold ${item.days_left <= 2 ? "text-rose-600" : "text-amber-600"}`}>
                          ~{item.days_left}d runway
                        </span>
                      ) : (
                        "Low sales velocity"
                      )}
                      <span> · Reorder {item.reorder_qty}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders & AI Quick Actions */}
        <div className="space-y-6">
          {/* Quick AI Prompts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h3 className="font-semibold text-slate-900 text-sm mb-1">Restock Copilot</h3>
            <p className="text-xs text-slate-500 mb-3">Ask StockPilot to automate store workflows</p>
            <div className="space-y-2">
              <button
                onClick={() => onNavigateToTab("agent", "Which items are critically low on stock today?")}
                className="w-full text-left text-xs p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                🔍 Which items are critically low today?
              </button>
              <button
                onClick={() => onNavigateToTab("agent", "Estimate days of stock remaining for all Dairy and Bakery products.")}
                className="w-full text-left text-xs p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                ⏱️ Estimate stock runway for Dairy & Bakery
              </button>
              <button
                onClick={() => onNavigateToTab("agent", "Draft purchase orders for all low stock items grouped by supplier.")}
                className="w-full text-left text-xs p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                📋 Draft POs for all depleted suppliers
              </button>
            </div>
          </div>

          {/* Recent Purchase Orders Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm">Recent Orders</h3>
              <button
                onClick={() => onNavigateToTab("orders")}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                View all →
              </button>
            </div>
            {recentOrders.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center">No orders recorded yet.</div>
            ) : (
              <div className="space-y-2.5">
                {recentOrders.map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <div>
                      <span className="font-bold text-slate-800">PO #{ord.id}</span>
                      <span className="text-slate-500 ml-2">₹{ord.total_cost.toLocaleString("en-IN")}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        ord.status === "received"
                          ? "bg-emerald-100 text-emerald-800"
                          : ord.status === "sent"
                          ? "bg-blue-100 text-blue-800"
                          : ord.status === "cancelled"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

