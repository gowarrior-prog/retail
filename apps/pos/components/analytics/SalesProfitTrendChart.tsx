'use client';

import React, { useMemo } from 'react';

interface SalesProfitTrendChartProps {
  billingRecords?: any[];
}

export default function SalesProfitTrendChart({ billingRecords = [] }: SalesProfitTrendChartProps) {
  const chartData = useMemo(() => {
    if (!billingRecords || billingRecords.length === 0) return null;

    // Group bills by day
    const dayMap = new Map<string, { label: string; sales: number; profit: number; count: number }>();
    
    // Last 7 days buckets or transaction dates
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
      dayMap.set(key, { label, sales: 0, profit: 0, count: 0 });
    }

    billingRecords.forEach((r) => {
      const rawDate = r.billing_date || r.created_at || r.timestamp;
      const key = rawDate ? new Date(rawDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const amount = Number(r.total_amount || r.grand_total || 0);
      const profit = Math.round(amount * 0.35); // 35% fabric gross retail margin

      if (dayMap.has(key)) {
        const item = dayMap.get(key)!;
        item.sales += amount;
        item.profit += profit;
        item.count += 1;
      } else {
        const d = new Date(key);
        const label = !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) : key;
        dayMap.set(key, { label, sales: amount, profit, count: 1 });
      }
    });

    const points = Array.from(dayMap.values()).slice(-7);
    const maxVal = Math.max(...points.map((p) => p.sales), 1000);

    return { points, maxVal };
  }, [billingRecords]);

  const hasData = chartData && chartData.points.some((p) => p.sales > 0);

  return (
    <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col justify-between font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">
            Sales & Realized Profit Trend
          </h4>
          <p className="text-xs text-slate-400 font-medium">Daily trajectory (PKR in Thousands)</p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
            <span className="text-slate-700">Gross Sales</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-400 inline-block"></span>
            <span className="text-slate-700">Net Margin (~35%)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-64 select-none flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 p-4">
        <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 700 240">
          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="700" y1="40" y2="40" />
          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="700" y1="90" y2="90" />
          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="700" y1="140" y2="140" />
          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="700" y1="190" y2="190" />
          <line stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="700" y1="190" y2="190" />

          {hasData && chartData && (
            <>
              {/* Bars for Gross Sales & Net Margin */}
              {chartData.points.map((pt, idx) => {
                const totalPoints = chartData.points.length;
                const colWidth = 700 / totalPoints;
                const x = idx * colWidth + colWidth / 2;
                const barHeight = Math.min(180, (pt.sales / chartData.maxVal) * 160);
                const marginHeight = Math.min(180, (pt.profit / chartData.maxVal) * 160);
                const ySales = 190 - barHeight;
                const yMargin = 190 - marginHeight;

                return (
                  <g key={idx}>
                    {/* Sales Bar */}
                    <rect
                      x={x - 22}
                      y={ySales}
                      width={20}
                      height={Math.max(4, barHeight)}
                      rx={4}
                      fill="#059669"
                      opacity={0.85}
                    />
                    {/* Margin Bar */}
                    <rect
                      x={x + 2}
                      y={yMargin}
                      width={20}
                      height={Math.max(4, marginHeight)}
                      rx={4}
                      fill="#2dd4bf"
                      opacity={0.9}
                    />
                    {/* Amount Label */}
                    {pt.sales > 0 && (
                      <text
                        x={x}
                        y={Math.max(25, ySales - 6)}
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Rs. {(pt.sales / 1000).toFixed(1)}k
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}
        </svg>

        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider">
              No Sales Transactions Recorded
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Real-time sales trajectory will populate as counter checkouts are processed
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2 px-1 font-mono">
        {chartData ? (
          chartData.points.map((pt, idx) => (
            <span key={idx} className="text-center">
              {pt.label}
            </span>
          ))
        ) : (
          <>
            <span>Day 1</span>
            <span>Day 2</span>
            <span>Day 3</span>
            <span>Day 4</span>
            <span>Day 5</span>
            <span>Day 6</span>
            <span>Today</span>
          </>
        )}
      </div>
    </div>
  );
}
