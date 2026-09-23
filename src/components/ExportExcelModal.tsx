"use client";

import React, { useState, useMemo } from "react";
import { DashboardSummary } from "@/lib/sheets/types";
import { exportTransactionsToExcel } from "@/lib/exportExcel";
import {
  X,
  FileSpreadsheet,
  Calendar,
  CalendarDays,
  CalendarRange,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type TransactionItem = DashboardSummary["transactions"][number];

type ExportMode = "current" | "month" | "year" | "date_range";

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTransactions: TransactionItem[];
  tableFilteredTransactions: TransactionItem[];
  availableYears: string[];
  availableMonths: string[];
  activeDashboardFilterCount: number;
  activeDashboardPeriodLabel: string;
}

const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Helper ekstraksi bulan dan tahun dari nama sheet atau tanggal
function parseTxYearAndMonth(sheetName?: string, tanggalTerimaBarang?: string) {
  let month = "";
  let year = "";

  if (sheetName) {
    const parts = sheetName.trim().split(/\s+/);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      if (/^\d{4}$/.test(last)) {
        year = last;
        month = parts.slice(0, parts.length - 1).join(" ");
      } else {
        month = sheetName.trim();
      }
    } else if (parts.length === 1) {
      month = parts[0];
    }
  }

  if (!year && tanggalTerimaBarang) {
    const dParts = tanggalTerimaBarang.split("-");
    if (dParts.length >= 1 && /^\d{4}$/.test(dParts[0])) {
      year = dParts[0];
    }
  }

  if (!month && tanggalTerimaBarang) {
    const dParts = tanggalTerimaBarang.split("-");
    if (dParts.length >= 2) {
      const mIdx = parseInt(dParts[1], 10) - 1;
      if (mIdx >= 0 && mIdx < INDONESIAN_MONTHS.length) {
        month = INDONESIAN_MONTHS[mIdx];
      }
    }
  }

  return { month, year };
}

export function ExportExcelModal({
  isOpen,
  onClose,
  allTransactions,
  tableFilteredTransactions,
  availableYears,
  availableMonths,
  activeDashboardFilterCount,
  activeDashboardPeriodLabel,
}: ExportExcelModalProps) {
  const [exportMode, setExportMode] = useState<ExportMode>("current");

  // State untuk mode Bulan
  const currentYearDefault = availableYears[0] || String(new Date().getFullYear());
  const currentMonthDefault = availableMonths[0] || "Semua Bulan";
  const [selectedYearForMonth, setSelectedYearForMonth] = useState<string>(currentYearDefault);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthDefault);

  // State untuk mode Tahun
  const [selectedYear, setSelectedYear] = useState<string>(currentYearDefault);

  // State untuk mode Rentang Tanggal
  const todayISO = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(todayISO);
  const [endDate, setEndDate] = useState<string>(todayISO);

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Filter data sesuai mode yang dipilih
  const { filteredData, exportPeriodTitle, exportFilename } = useMemo(() => {
    let result: TransactionItem[] = [];
    let title = "";
    let fname = "";

    if (exportMode === "current") {
      result = tableFilteredTransactions;
      title = `Sesuai Filter Dashboard (${activeDashboardPeriodLabel})`;
      fname = `Laporan_Pengadaan_Asset_Filter_Aktif.xlsx`;
    } else if (exportMode === "month") {
      result = allTransactions.filter((tx) => {
        const { month, year } = parseTxYearAndMonth(tx.sheetName, tx.tanggalTerimaBarang);
        if (selectedYearForMonth !== "ALL" && year !== selectedYearForMonth) return false;
        if (selectedMonth !== "ALL" && selectedMonth !== "Semua Bulan") {
          if (month.toLowerCase() !== selectedMonth.toLowerCase()) return false;
        }
        return true;
      });

      const monthLabel = selectedMonth === "ALL" || selectedMonth === "Semua Bulan" ? "Seluruh Bulan" : selectedMonth;
      title = `Bulan ${monthLabel} Tahun ${selectedYearForMonth}`;
      fname = `Laporan_Pengadaan_Asset_${monthLabel}_${selectedYearForMonth}.xlsx`;
    } else if (exportMode === "year") {
      result = allTransactions.filter((tx) => {
        const { year } = parseTxYearAndMonth(tx.sheetName, tx.tanggalTerimaBarang);
        if (selectedYear !== "ALL" && year !== selectedYear) return false;
        return true;
      });

      const yrLabel = selectedYear === "ALL" ? "Semua Tahun" : `Tahun ${selectedYear}`;
      title = `Tahun ${selectedYear === "ALL" ? "Semua" : selectedYear}`;
      fname = `Laporan_Pengadaan_Asset_${yrLabel.replace(/\s+/g, "_")}.xlsx`;
    } else if (exportMode === "date_range") {
      result = allTransactions.filter((tx) => {
        if (!tx.tanggalTerimaBarang) return false;
        // Tanggal format YYYY-MM-DD
        const txDate = tx.tanggalTerimaBarang.slice(0, 10);
        if (startDate && txDate < startDate) return false;
        if (endDate && txDate > endDate) return false;
        return true;
      });

      title = `Rentang Tanggal ${startDate} s.d. ${endDate}`;
      fname = `Laporan_Pengadaan_Asset_${startDate}_sd_${endDate}.xlsx`;
    }

    return {
      filteredData: result,
      exportPeriodTitle: title,
      exportFilename: fname,
    };
  }, [
    exportMode,
    allTransactions,
    tableFilteredTransactions,
    activeDashboardPeriodLabel,
    selectedYearForMonth,
    selectedMonth,
    selectedYear,
    startDate,
    endDate,
  ]);

  // Kalkulasi statistik data yang akan diekspor
  const { totalAmount, totalQty } = useMemo(() => {
    let amount = 0;
    let qty = 0;
    filteredData.forEach((tx) => {
      amount += Number(tx.totalHarga) || 0;
      qty += Number(tx.jumlah) || 0;
    });
    return { totalAmount: amount, totalQty: qty };
  }, [filteredData]);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    try {
      setIsExporting(true);
      setExportSuccess(false);

      exportTransactionsToExcel({
        transactions: filteredData,
        periodLabel: exportPeriodTitle,
        filename: exportFilename,
      });

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Export error:", err);
      alert("Gagal mengekspor file Excel. Silakan coba kembali.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-slate-900 text-base">
                Export Data ke Excel (.xlsx)
              </h3>
              <p className="text-xs text-slate-500">
                Pilih kriteria periode data yang ingin Anda unduh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Pilihan Mode Export Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 font-heading">
              Kriteria Ekspor:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 1: Sesuai Filter Dashboard */}
              <button
                type="button"
                onClick={() => setExportMode("current")}
                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                  exportMode === "current"
                    ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-xs"
                    : "border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg mt-0.5 ${
                    exportMode === "current" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Filter Dashboard
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Data aktif di layar ({tableFilteredTransactions.length} baris)
                  </span>
                </div>
              </button>

              {/* Option 2: Per Bulan */}
              <button
                type="button"
                onClick={() => setExportMode("month")}
                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                  exportMode === "month"
                    ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-xs"
                    : "border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg mt-0.5 ${
                    exportMode === "month" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Per Bulan
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Pilih bulan &amp; tahun tertentu
                  </span>
                </div>
              </button>

              {/* Option 3: Per Tahun */}
              <button
                type="button"
                onClick={() => setExportMode("year")}
                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                  exportMode === "year"
                    ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-xs"
                    : "border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg mt-0.5 ${
                    exportMode === "year" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Per Tahun
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Semua transaksi dalam 1 tahun
                  </span>
                </div>
              </button>

              {/* Option 4: Rentang Tanggal */}
              <button
                type="button"
                onClick={() => setExportMode("date_range")}
                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                  exportMode === "date_range"
                    ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-xs"
                    : "border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg mt-0.5 ${
                    exportMode === "date_range" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Rentang Tanggal
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Kustom tanggal awal &amp; akhir
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Configuration Panel berdasarkan Mode */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60">
            {exportMode === "current" && (
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  Data Sesuai Filter Dashboard Saat Ini:
                </p>
                <p className="text-slate-500">
                  Akan mengekspor baris data yang sedang tampil di tabel setelah disaring oleh filter tahun, bulan, mitra, PIC, IO, Cost Center, serta kata kunci pencarian.
                </p>
                {activeDashboardFilterCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 mt-1">
                    {activeDashboardFilterCount} Filter Aktif di Dashboard
                  </span>
                )}
              </div>
            )}

            {exportMode === "month" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Tahun
                  </label>
                  <select
                    value={selectedYearForMonth}
                    onChange={(e) => setSelectedYearForMonth(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Bulan
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Semua Bulan">Semua Bulan</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {exportMode === "year" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Pilih Tahun
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Tahun (Seluruh Transaksi)</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      Tahun {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {exportMode === "date_range" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Ringkasan Data Preview Card */}
          <div className="p-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Ringkasan Data yang Akan Diekspor
            </span>
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-emerald-100/70 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Baris</span>
                <span className="font-heading font-extrabold text-slate-800 text-sm">
                  {filteredData.length} Transaksi
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Kuantitas</span>
                <span className="font-heading font-extrabold text-slate-800 text-sm tabular-nums">
                  {totalQty} Unit
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Nilai</span>
                <span className="font-heading font-extrabold text-emerald-700 text-sm tabular-nums truncate block" title={`Rp ${new Intl.NumberFormat("id-ID").format(totalAmount)}`}>
                  Rp {new Intl.NumberFormat("id-ID").format(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {filteredData.length === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Tidak ditemukan transaksi pada kriteria yang dipilih. File Excel akan kosong.</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={isExporting || filteredData.length === 0}
            onClick={handleExecuteExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs group"
          >
            {exportSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce" />
                <span>Berhasil Diunduh!</span>
              </>
            ) : isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyiapkan File...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                <span>Unduh File Excel (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
