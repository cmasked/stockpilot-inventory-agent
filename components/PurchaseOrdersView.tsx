"use client";

import { useEffect, useState } from "react";
import type { TabId } from "./NavigationTabs";

interface OrderItem {
  id: number;
  sku: string;
  name: string;
  category?: string;
  unit?: string;
  quantity: number;
  unit_cost: number;
}

interface PurchaseOrderData {
  id: number;
  supplier_id: string;
  supplier_name: string;
  supplier_city?: string;
  status: "draft" | "sent" | "received" | "cancelled";
  total_cost: number;
  expected_date: string | null;
  notes: string | null;
  created_at: string;
  items: OrderItem[];
}

interface PurchaseOrdersViewProps {
  refreshKey: number;
  onOrderUpdated: () => void;
  onNavigateToTab: (tab: TabId, prefillPrompt?: string) => void;
}

export default function PurchaseOrdersView({
  refreshKey,
  onOrderUpdated,
  onNavigateToTab,
}: PurchaseOrdersViewProps) {
  const [orders, setOrders] = useState<PurchaseOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPoId, setExpandedPoId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const res = await fetch("/api/orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
          if (data.orders?.length > 0 && expandedPoId === null) {
            setExpandedPoId(data.orders[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load purchase orders", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [refreshKey]);

  async function handleStatusChange(orderId: number, newStatus: string) {
    try {
      setUpdatingId(orderId);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onOrderUpdated();
      } else {
        const err = await res.json();
        alert(`Failed to update order status: ${err.error}`);
      }
    } catch (e) {
      alert("Network error updating order");
    } finally {
      setUpdatingId(null);
    }
  }

  const totalCommittedSpend = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total_cost, 0);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Purchase Orders & Replenishment Tracking</h2>
          <p className="text-xs text-slate-500">
            Total active commitments: <span className="font-semibold text-slate-900">₹{totalCommittedSpend.toLocaleString("en-IN")}</span> ({orders.length} total orders)
          </p>
        </div>
        <button
          onClick={() =>
            onNavigateToTab(
              "agent",
              "Check all depleted products and draft new purchase orders grouped by supplier."
            )
          }
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
        >
          <span>✨</span>
          <span>Draft PO with AI</span>
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-xl border border-slate-200 animate-pulse">
            Loading purchase orders from Supabase...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-xl border border-slate-200">
            No purchase orders found. Ask StockPilot to draft replenishment orders!
          </div>
        ) : (
          orders.map((po) => {
            const isExpanded = expandedPoId === po.id;
            const isUpdating = updatingId === po.id;

            return (
              <div
                key={po.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                  className="p-4 cursor-pointer hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">PO #{po.id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        po.status === "received"
                          ? "bg-emerald-100 text-emerald-800"
                          : po.status === "sent"
                          ? "bg-blue-100 text-blue-800"
                          : po.status === "cancelled"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {po.status}
                    </span>
                    <span className="text-xs font-medium text-slate-700">{po.supplier_name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Total:</span>{" "}
                      <span className="font-bold text-slate-900">₹{po.total_cost.toLocaleString("en-IN")}</span>
                    </div>

                    {po.expected_date && (
                      <div className="hidden sm:block">
                        <span className="text-slate-400">Expected:</span>{" "}
                        <span className="font-medium text-slate-700">{po.expected_date}</span>
                      </div>
                    )}

                    <div className="text-slate-400">
                      <span>{po.items?.length || 0} items</span>
                    </div>

                    <span className="text-slate-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded Details & Line Items */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/40 space-y-3">
                    {po.notes && (
                      <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-700">Notes:</span> {po.notes}
                      </div>
                    )}

                    {/* Items Table */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3">Item Name</th>
                            <th className="py-2 px-3 text-right">Quantity</th>
                            <th className="py-2 px-3 text-right">Unit Cost</th>
                            <th className="py-2 px-3 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {po.items.map((item) => (
                            <tr key={item.sku} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{item.sku}</td>
                              <td className="py-2 px-3 font-medium text-slate-900">{item.name}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-700">{item.quantity}</td>
                              <td className="py-2 px-3 text-right text-slate-600">₹{item.unit_cost.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                ₹{(item.quantity * item.unit_cost).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action buttons based on status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <div className="text-[11px] text-slate-400">
                        Created on {new Date(po.created_at).toLocaleDateString()}
                      </div>

                      <div className="flex items-center gap-2">
                        {po.status === "draft" && (
                          <>
                            <button
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(po.id, "sent")}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors"
                            >
                              {isUpdating ? "Updating..." : "Mark as Sent to Supplier"}
                            </button>
                            <button
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(po.id, "cancelled")}
                              className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-medium rounded-md transition-colors"
                            >
                              Cancel PO
                            </button>
                          </>
                        )}

                        {po.status === "sent" && (
                          <button
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(po.id, "received")}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors"
                          >
                            {isUpdating ? "Receiving..." : "✓ Receive Delivery & Update Stock"}
                          </button>
                        )}

                        {po.status === "received" && (
                          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                            <span>✓</span>
                            <span>Stock physically received and updated in inventory</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

