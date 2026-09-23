"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";

interface MonthlyTrendItem {
  month: string;
  year?: number;
  label?: string;
  totalAmount: number;
}

interface MonthlyTrendBarChartProps {
  data: MonthlyTrendItem[];
  activePeriodLabel: string;
}

export default function MonthlyTrendBarChart({
  data,
  activePeriodLabel,
}: MonthlyTrendBarChartProps) {
  return (
    <div className="w-full flex flex-col justify-between">
      <div className="w-full relative h-64">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <p>Tidak ada data pengadaan untuk periode ini</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 25, right: 10, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="septemberBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E11D48" />
                  <stop offset="100%" stopColor="#BE123C" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" }}
                axisLine={{ stroke: "#CBD5E1" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" }}
                tickFormatter={(val) => `${(val / 1_000_000).toFixed(0)} jt`}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                cursor={{ fill: "#F8FAFC" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const val = Number(payload[0].value) || 0;
                    const label = payload[0].payload?.label || "";
                    return (
                      <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-sans">
                        <span className="text-[10px] text-slate-400 block">{label}</span>
                        <span className="font-extrabold font-heading text-rose-300">
                          Rp {new Intl.NumberFormat("id-ID").format(val)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="totalAmount"
                fill="url(#septemberBarGradient)"
                radius={[8, 8, 0, 0]}
                maxBarSize={64}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.totalAmount > 0 ? "url(#septemberBarGradient)" : "#E2E8F0"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer note matching requirement */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>* Menampilkan akumulasi transaksi bulanan sesuai filter</span>
        <span className="text-rose-600 font-medium">Periode: {activePeriodLabel}</span>
      </div>
    </div>
  );
}
