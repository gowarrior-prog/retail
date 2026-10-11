'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, PackageX, ShoppingBag, Layers, CheckCircle2 } from 'lucide-react';
import AnalyticsHeader from '@/components/analytics/AnalyticsHeader';
import AnalyticsKPICards from '@/components/analytics/AnalyticsKPICards';
import SalesProfitTrendChart from '@/components/analytics/SalesProfitTrendChart';
import CategoryShareDonutChart from '@/components/analytics/CategoryShareDonutChart';
import SettlementAndMarginSection from '@/components/analytics/SettlementAndMarginSection';
import AnalyticalReportsTable from '@/components/analytics/AnalyticalReportsTable';
import { fetchBillingHistory, fetchKhata, fetchPurchases, fetchEmployees, fetchProducts } from '@/lib/api';

export default function AnalyticsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('This Month');
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'inventory' | 'salesmen' | 'customers' | 'returns'>('inventory');

  // Real API Data states from database
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [khataCustomers, setKhataCustomers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [history, khata, purList, empList, prodList] = await Promise.all([
        fetchBillingHistory().catch(() => []),
        fetchKhata().catch(() => []),
        fetchPurchases().catch(() => []),
        fetchEmployees().catch(() => []),
        fetchProducts().catch(() => []),
      ]);
      if (Array.isArray(history)) setBillingRecords(history);
      if (Array.isArray(khata)) setKhataCustomers(khata);
      if (Array.isArray(purList)) setPurchases(purList);
      if (Array.isArray(empList)) setEmployees(empList);
      if (Array.isArray(prodList)) setProducts(prodList);
    } catch (e) {
      console.error('Analytics page fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    loadData();

    const handleLiveUpdate = () => loadData();
    window.addEventListener('pos-data-updated', handleLiveUpdate);
    return () => window.removeEventListener('pos-data-updated', handleLiveUpdate);
  }, [loadData]);

  // Out of Stock Products filtering
  const outOfStockProducts = useMemo(() => {
    return products.filter((p: any) => {
      const qty = p.stock ?? p.quantity ?? 0;
      return qty <= 0;
    });
  }, [products]);

  // Compute real dynamic financial metrics from database
  const metrics = useMemo(() => {
    const totalRev = billingRecords.reduce((sum, r) => sum + (Number(r.total_amount) || Number(r.grand_total) || 0), 0);
    const invoiceCount = billingRecords.length;
    const avgTicket = invoiceCount > 0 ? Math.round(totalRev / invoiceCount) : 0;

    const totalPurchasesCost = purchases.reduce((sum, p) => sum + (Number(p.total_cost) || 0), 0);
    const totalSalariesCost = employees.reduce((sum, e) => sum + (Number(e.base_salary) || 0), 0);

    const grossProfit = Math.max(0, totalRev - (totalPurchasesCost * 0.7));
    const netProfit = Math.max(0, totalRev - (totalPurchasesCost * 0.7) - totalSalariesCost);

    const khataBalance = khataCustomers.reduce((sum, c) => sum + (Number(c.total_balance) || Number(c.balance) || 0), 0);
    const khataActiveCount = khataCustomers.filter(c => (Number(c.total_balance) || Number(c.balance) || 0) > 0).length;

    let totalSuitsSold = 0;
    billingRecords.forEach(r => {
      try {
        const items = typeof r.item_details_json === 'string' ? JSON.parse(r.item_details_json) : (r.items || []);
        items.forEach((item: any) => {
          totalSuitsSold += Number(item.quantity) || 1;
        });
      } catch {}
    });

    return {
      totalRevenue: totalRev,
      invoiceCount: invoiceCount,
      avgTicket,
      grossProfit: Math.round(grossProfit),
      netProfit: Math.round(netProfit),
      fabricSuits: totalSuitsSold,
      fabricMeters: totalSuitsSold * 7,
      khataBalance: khataBalance,
      khataActiveCount: khataActiveCount,
      outOfStockCount: outOfStockProducts.length,
    };
  }, [billingRecords, khataCustomers, purchases, employees, outOfStockProducts]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#F8FAFC] text-slate-400 font-sans text-xs min-h-[400px]">
        Loading Analytics Portal...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-full bg-[#F8FAFC] font-sans text-slate-800 antialiased p-4 lg:p-6 space-y-6">
      {/* 1. Header & Controls */}
      <AnalyticsHeader
        selectedPreset={selectedPreset}
        onSelectPreset={setSelectedPreset}
        compareEnabled={compareEnabled}
        onToggleCompare={setCompareEnabled}
      />

      {/* 2. Top KPI Cards */}
      <AnalyticsKPICards
        totalRevenue={metrics.totalRevenue}
        invoiceCount={metrics.invoiceCount}
        avgTicket={metrics.avgTicket}
        netProfit={metrics.netProfit}
        grossProfit={metrics.grossProfit}
        fabricSuits={metrics.fabricSuits}
        fabricMeters={metrics.fabricMeters}
        khataBalance={metrics.khataBalance}
        khataActiveCount={metrics.khataActiveCount}
      />

      {/* 3. Out of Stock Inventory Alert Section (Real-Time DB Alert) */}
      <div className="bg-white rounded-2xl border border-red-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl text-red-600">
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                Out of Stock Inventory Section
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-100 text-red-700 rounded-full border border-red-300/60">
                  {outOfStockProducts.length} Items Khatam
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Products with 0 or negative stock quantity requiring restock intake.
              </p>
            </div>
          </div>
        </div>

        {outOfStockProducts.length === 0 ? (
          <div className="p-4 text-center bg-emerald-50/60 rounded-xl border border-emerald-200/60 flex items-center justify-center gap-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Sub In-Stock! Catalog mein koi product out of stock nahi hai.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {outOfStockProducts.map((p: any, idx: number) => {
              const qty = p.stock ?? p.quantity ?? 0;
              return (
                <div
                  key={p.id || idx}
                  className="p-3 bg-red-50/50 rounded-xl border border-red-200/70 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase text-red-500">
                        {p.category || 'General'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {p.name}
                      </h4>
                    </div>
                    <span className="bg-red-600 text-white text-[9px] font-mono font-black px-1.5 py-0.5 rounded">
                      OUT OF STOCK
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 pt-1 border-t border-red-100">
                    <span>Stock: <strong className="text-red-700 font-bold">{qty}</strong></span>
                    <span>Rs. {Number(p.price || 0).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Trend Chart & Category Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SalesProfitTrendChart />
        <CategoryShareDonutChart />
      </div>

      {/* 5. Settlement Breakdown & Fabric Margin Intelligence */}
      <SettlementAndMarginSection />

      {/* 6. Analytical Reports Tabbed Table */}
      <AnalyticalReportsTable
        activeTab={activeAnalyticsTab}
        onTabChange={setActiveAnalyticsTab}
      />
    </div>
  );
}
