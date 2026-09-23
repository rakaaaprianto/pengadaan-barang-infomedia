"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";

interface DonutItem {
  name: string;
  value: number;
  color: string;
}

interface CapexDonutChartProps {
  data: DonutItem[];
  totalAmount: number;
  capexAmount: number;
  opexAmount: number;
  capexPct: number;
  opexPct: number;
  formatShortM: (amount: number) => string;
}

export default function CapexDonutChart({
  data,
  totalAmount,
  capexAmount,
  opexAmount,
  capexPct,
  opexPct,
  formatShortM,
}: CapexDonutChartProps) {
  const grandTotalSafe = totalAmount || 1;

  return (
    <div className="relative py-4 flex flex-col items-center justify-center">
      <div className="w-full h-56 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={82}
              paddingAngle={totalAmount > 0 ? 2 : 0}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`donut-cell-${index}`}
                  fill={entry.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  if (totalAmount <= 0) {
                    return (
                      <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl text-xs z-50 pointer-events-none">
                        <span className="text-slate-400">Tidak ada transaksi</span>
                      </div>
                    );
                  }
                  const item = payload[0];
                  const val = Number(item.value) || 0;
                  const pct = ((val / grandTotalSafe) * 100).toFixed(1);
                  return (
                    <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-xl text-xs z-50 pointer-events-none">
                      <span
                        className="font-bold flex items-center gap-1.5"
                        style={{ color: item.payload?.color === "#E11D48" ? "#fda4af" : "#94a3b8" }}
                      >
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: item.payload?.color }}
                        />
                        {item.name}
                      </span>
                      <span className="font-heading font-extrabold text-sm block mt-1 text-white">
                        Rp {new Intl.NumberFormat("id-ID").format(val)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {pct}% dari total
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
        {/* Center Label in Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xs font-semibold text-slate-400">Total Nilai</span>
          <span className="text-xl font-heading font-extrabold text-slate-900 tabular-nums">
            {formatShortM(totalAmount)}
          </span>
        </div>
      </div>

      {/* Metric Details Cards below Donut */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 w-full">
        {/* Capex Breakdown */}
        <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 flex flex-col">
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">CAPEX</span>
          </div>
          <span className="text-base font-extrabold text-rose-600 tabular-nums">
            Rp {new Intl.NumberFormat("id-ID").format(capexAmount)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {capexPct}% dari total
          </span>
        </div>

        {/* Opex Breakdown */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col">
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">OPEX</span>
          </div>
          <span className="text-base font-extrabold text-slate-800 tabular-nums">
            Rp {new Intl.NumberFormat("id-ID").format(opexAmount)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {opexPct}% dari total
          </span>
        </div>
      </div>
    </div>
  );
}
