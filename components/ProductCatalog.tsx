"use client";

import { useEffect, useState, useMemo } from "react";
import type { TabId } from "./NavigationTabs";

interface ProductRow {
  sku: string;
  name: string;
  category: string;
  supplier_id: string;
  unit: string;
  stock_qty: number;
  reorder_level: number;
  reorder_qty: number;
  avg_daily_sales: number;
  unit_cost: number;
  selling_price: number;
  days_left: number | null;
  is_low_stock: boolean;
  suppliers?: {
    name: string;
    lead_time_days: number;
    min_order_value: number;
  } | null;
}

interface ProductCatalogProps {
  refreshKey: number;
  onNavigateToTab: (tab: TabId, prefillPrompt?: string) => void;
}

export default function ProductCatalog({ refreshKey, onNavigateToTab }: ProductCatalogProps) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load products", err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [refreshKey]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (lowStockOnly && !p.is_low_stock) return false;
      if (category !== "all" && p.category.toLowerCase() !== category.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }
      return true;
    });
  }, [products, lowStockOnly, category, search]);

  const lowStockTotal = useMemo(() => products.filter((p) => p.is_low_stock).length, [products]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Low Stock Toggle Button */}
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 shrink-0 ${
            lowStockOnly
              ? "bg-amber-500 text-white border-amber-600 shadow-xs"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span>⚠️</span>
          <span>Low Stock Only ({lowStockTotal})</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">SKU / Product</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Current Stock</th>
                <th className="py-3 px-3 text-right">Reorder Threshold</th>
                <th className="py-3 px-3 text-center">Runway</th>
                <th className="py-3 px-3 text-right">Unit Cost</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 animate-pulse">
                    Loading inventory records from FreshMart database...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stockRatio = Math.min(100, Math.round((p.stock_qty / (p.reorder_level * 2 || 1)) * 100));

                  return (
                    <tr
                      key={p.sku}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        p.is_low_stock ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* SKU & Name */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku} · {p.unit}</div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium">
                          {p.category}
                        </span>
                      </td>

                      {/* Stock Level with mini health bar */}
                      <td className="py-2.5 px-3 text-right">
                        <div className={`font-bold ${p.is_low_stock ? "text-rose-600" : "text-slate-800"}`}>
                          {p.stock_qty}
                        </div>
                        <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden ml-auto mt-1">
                          <div
                            className={`h-full ${
                              p.is_low_stock ? "bg-rose-500" : stockRatio < 50 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${stockRatio}%` }}
                          />
                        </div>
                      </td>

                      {/* Reorder Level / Qty */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-medium text-slate-600">{p.reorder_level}</span>
                        <span className="text-[10px] text-slate-400 block">+ {p.reorder_qty} {p.unit}</span>
                      </td>

                      {/* Runway (Days of Stock) */}
                      <td className="py-2.5 px-3 text-center">
                        {p.days_left !== null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              p.days_left <= 2
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : p.days_left <= 5
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            ~{p.days_left} days
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        ₹{p.unit_cost.toFixed(2)}
                      </td>

                      {/* Supplier */}
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-medium truncate max-w-[130px]" title={p.suppliers?.name}>
                          {p.suppliers?.name || p.supplier_id}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.suppliers?.lead_time_days ? `${p.suppliers.lead_time_days}d lead time` : p.supplier_id}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right">
                        {p.is_low_stock ? (
                          <button
                            onClick={() =>
                              onNavigateToTab(
                                "agent",
                                `Draft a purchase order for ${p.name} (${p.sku}) from supplier ${p.supplier_id} for ${p.reorder_qty} units.`
                              )
                            }
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[11px] font-medium shadow-2xs transition-colors whitespace-nowrap"
                          >
                            Restock PO
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              onNavigateToTab(
                                "agent",
                                `How many days of stock do we have left for ${p.name} (${p.sku})?`
                              )
                            }
                            className="px-2 py-1 text-slate-400 hover:text-slate-700 text-[11px]"
                          >
                            Check
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
