"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Truck,
  QrCode,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Check,
  AlertCircle,
  FileText,
  ExternalLink,
  LayoutGrid,
  List,
  MapPin,
  User,
  Building2,
  CheckSquare,
  Square,
} from "lucide-react";
import { DashboardSummary } from "@/lib/sheets/types";
import { UpdateTrackingModal } from "./UpdateTrackingModal";
import { BatchUpdateTrackingModal } from "./BatchUpdateTrackingModal";
import { exportTransactionsToExcel } from "@/lib/exportExcel";

type TransactionItem = DashboardSummary["transactions"][number];

interface TrackingViewProps {
  initialData?: DashboardSummary;
}

export function TrackingView({ initialData }: TrackingViewProps) {
  const [data, setData] = useState<DashboardSummary | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Table or Kanban Board
  const [viewMode, setViewMode] = useState<"TABLE" | "KANBAN">("TABLE");

  // Selection state for Batch Actions
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("ALL");
  const [selectedSheet, setSelectedSheet] = useState<string>("ALL");

  // Modals state
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<TransactionItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Fetch data dari /api/dashboard
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch(`/api/dashboard${isRefresh ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
      } else if (json.transactions) {
        setData(json);
      } else {
        throw new Error(json.error || "Gagal memuat data tracking aset");
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Terjadi kendala saat mengambil data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData]);

  const transactions = useMemo(() => data?.transactions || [], [data?.transactions]);

  // Helper row key
  const getRowKey = (tx: TransactionItem) => tx.id || `${tx.sheetName}_${tx.rowNumber}`;

  // Daftar sheet unik (bulan)
  const availableSheets = useMemo(() => {
    const sheets = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.sheetName) sheets.add(tx.sheetName);
    });
    return Array.from(sheets);
  }, [transactions]);

  // Stage categorizer
  const getItemStage = (tx: TransactionItem): "PENDING" | "LABELING" | "READY" | "DONE" => {
    const status = (tx.prosesStatus || "Diterima").toLowerCase();
    if (status.includes("selesai") || status.includes("done") || Boolean(tx.tanggalKirimBarang)) {
      return "DONE";
    }
    if (status.includes("siap") || (Boolean(tx.tanggalProsesBarcode) && !tx.tanggalKirimBarang)) {
      return "READY";
    }
    if (status.includes("labeling") || (Boolean(tx.tanggalTerimaBarcode) && !tx.tanggalProsesBarcode)) {
      return "LABELING";
    }
    return "PENDING";
  };

  // Statistik Metrik KPI
  const stats = useMemo(() => {
    let pendingBarcode = 0;
    let inLabeling = 0;
    let readyToShip = 0;
    let completed = 0;

    transactions.forEach((tx) => {
      const stage = getItemStage(tx);
      if (stage === "DONE") completed++;
      else if (stage === "READY") readyToShip++;
      else if (stage === "LABELING") inLabeling++;
      else pendingBarcode++;
    });

    return {
      total: transactions.length,
      pendingBarcode,
      inLabeling,
      readyToShip,
      completed,
    };
  }, [transactions]);

  // Filter transaksi berdasarkan search, sheet, dan status tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Filter Sheet / Bulan
      if (selectedSheet !== "ALL" && tx.sheetName !== selectedSheet) {
        return false;
      }

      // 2. Filter Status Tab
      const stage = getItemStage(tx);
      if (selectedStatusTab === "PENDING" && stage !== "PENDING") return false;
      if (selectedStatusTab === "LABELING" && stage !== "LABELING") return false;
      if (selectedStatusTab === "READY" && stage !== "READY") return false;
      if (selectedStatusTab === "DONE" && stage !== "DONE") return false;

      // 3. Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (tx.namaBarang || "").toLowerCase().includes(q) ||
        (tx.nomorDo || "").toLowerCase().includes(q) ||
        (tx.namaMitra || "").toLowerCase().includes(q) ||
        (tx.pic || "").toLowerCase().includes(q) ||
        (tx.userPemakai || "").toLowerCase().includes(q) ||
        (tx.tujuanPengiriman || "").toLowerCase().includes(q) ||
        (tx.namaProject || "").toLowerCase().includes(q) ||
        (tx.keterangan || "").toLowerCase().includes(q)
      );
    });
  }, [transactions, selectedSheet, selectedStatusTab, searchQuery]);

  // Selection logic
  const toggleSelectRow = (key: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isAllSelected = useMemo(() => {
    if (filteredTransactions.length === 0) return false;
    return filteredTransactions.every((tx) => selectedRowIds.has(getRowKey(tx)));
  }, [filteredTransactions, selectedRowIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds(new Set());
    } else {
      const next = new Set<string>();
      filteredTransactions.forEach((tx) => next.add(getRowKey(tx)));
      setSelectedRowIds(next);
    }
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  const selectedItemsForBatch = useMemo(() => {
    return transactions.filter((tx) => selectedRowIds.has(getRowKey(tx)));
  }, [transactions, selectedRowIds]);

  // Kanban Columns grouping
  const kanbanColumns = useMemo(() => {
    const pending: TransactionItem[] = [];
    const labeling: TransactionItem[] = [];
    const ready: TransactionItem[] = [];
    const done: TransactionItem[] = [];

    filteredTransactions.forEach((tx) => {
      const stage = getItemStage(tx);
      if (stage === "DONE") done.push(tx);
      else if (stage === "READY") ready.push(tx);
      else if (stage === "LABELING") labeling.push(tx);
      else pending.push(tx);
    });

    return [
      {
        id: "PENDING",
        title: "Menunggu Barcode",
        count: pending.length,
        headerBg: "bg-slate-100 text-slate-800 border-slate-200",
        badgeBg: "bg-slate-200 text-slate-700",
        colBg: "bg-slate-50/60 border-slate-200",
        icon: Clock,
        items: pending,
      },
      {
        id: "LABELING",
        title: "Proses Labeling",
        count: labeling.length,
        headerBg: "bg-amber-50 text-amber-900 border-amber-200",
        badgeBg: "bg-amber-100 text-amber-800",
        colBg: "bg-amber-50/20 border-amber-200/70",
        icon: QrCode,
        items: labeling,
      },
      {
        id: "READY",
        title: "Siap Dikirim",
        count: ready.length,
        headerBg: "bg-blue-50 text-blue-900 border-blue-200",
        badgeBg: "bg-blue-100 text-blue-800",
        colBg: "bg-blue-50/20 border-blue-200/70",
        icon: Truck,
        items: ready,
      },
      {
        id: "DONE",
        title: "Selesai / Terdistribusi",
        count: done.length,
        headerBg: "bg-emerald-50 text-emerald-900 border-emerald-200",
        badgeBg: "bg-emerald-100 text-emerald-800",
        colBg: "bg-emerald-50/20 border-emerald-200/70",
        icon: CheckCircle2,
        items: done,
      },
    ];
  }, [filteredTransactions]);

  const handleOpenEdit = (tx: TransactionItem) => {
    setSelectedItemForEdit(tx);
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    if (!filteredTransactions.length) return;
    const periodLabel = selectedSheet !== "ALL" ? selectedSheet : "Semua_Periode_2026";
    exportTransactionsToExcel({
      transactions: filteredTransactions,
      periodLabel: `Tracking_Distribusi_${periodLabel}`,
      filename: `Laporan_Distribusi_Asset_${periodLabel}.xlsx`,
    });
  };

  if (loading && !data) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4 py-16">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <Truck className="w-7 h-7 animate-bounce" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-slate-800">Memuat Data Sub Proses...</h3>
          <p className="text-xs text-slate-400 mt-1">Mengambil data dari Google Sheets & Database</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3 max-w-md mx-auto my-12">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-sm font-bold text-rose-800">Gagal Memuat Data</h3>
        <p className="text-xs text-rose-600">{error}</p>
        <button
          type="button"
          onClick={() => fetchData()}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-rose-700 cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-2">
            <Truck className="w-3.5 h-3.5" />
            <span>Alur Sub Proses Operasional Logistik</span>
          </div>
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
            Pelacakan Labeling & Pengiriman Aset
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Monitoring proses penempelan barcode fisik dan pendistribusian barang ke user pemakai unit kerja secara terintegrasi dengan Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredTransactions.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel ({filteredTransactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-rose-600" : ""}`} />
            <span>{refreshing ? "Memperbarui..." : "Perbarui Data"}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Terdata</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-400">Aset</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Seluruh pengadaan masuk</p>
        </div>

        {/* Card 2: Menunggu Barcode */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Menunggu Barcode</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-slate-700">{stats.pendingBarcode}</span>
            <span className="text-xs text-slate-400">Aset</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Belum terima barcode fisik</p>
        </div>

        {/* Card 3: Sedang Labeling */}
        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Sedang Labeling</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-amber-900">{stats.inLabeling}</span>
            <span className="text-xs text-amber-600">Aset</span>
          </div>
          <p className="text-[11px] text-amber-600 mt-1">Barcode sedang ditempel</p>
        </div>

        {/* Card 4: Siap Kirim */}
        <div className="bg-white p-4 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Siap Kirim</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-blue-900">{stats.readyToShip}</span>
            <span className="text-xs text-blue-600">Aset</span>
          </div>
          <p className="text-[11px] text-blue-600 mt-1">Barcode selesai, siap distribusi</p>
        </div>

        {/* Card 5: Selesai */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Selesai (Done)</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-heading text-emerald-900">{stats.completed}</span>
            <span className="text-xs text-emerald-600">Aset</span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Telah diserahterimakan</p>
        </div>
      </div>

      {/* Control Bar: View Switcher, Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Status Filter Tabs & View Switcher Row */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
            <button
              type="button"
              onClick={() => setSelectedStatusTab("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatusTab === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab("PENDING")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatusTab === "PENDING"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Menunggu Barcode ({stats.pendingBarcode})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab("LABELING")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatusTab === "LABELING"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Sedang Labeling ({stats.inLabeling})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab("READY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatusTab === "READY"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              Siap Kirim ({stats.readyToShip})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab("DONE")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatusTab === "DONE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Selesai Didistribusikan ({stats.completed})
            </button>
          </div>

          {/* Right Controls: View Switcher & Month Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Switcher Pill */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "TABLE"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Tampilan Tabel Data"
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("KANBAN")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "KANBAN"
                    ? "bg-white text-rose-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Tampilan Papan Alur Kanban Pipeline"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban Pipeline</span>
              </button>
            </div>

            {/* Month selector dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Sheet:</span>
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="text-xs font-medium px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">Semua Periode ({stats.total})</option>
                {availableSheets.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search & Selection Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari barang, nomor DO, vendor, user pemakai, tujuan, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 text-xs border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 self-end sm:self-auto font-medium">
            {selectedRowIds.size > 0 && (
              <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                {selectedRowIds.size} baris dipilih
              </span>
            )}
            <span>
              Menampilkan <strong className="text-slate-900">{filteredTransactions.length}</strong> dari{" "}
              <strong className="text-slate-900">{data?.transactions.length || 0}</strong> aset
            </span>
          </div>
        </div>
      </div>

      {/* CONDITIONAL VIEW: TABLE OR KANBAN PIPELINE */}
      {viewMode === "KANBAN" ? (
        /* KANBAN PIPELINE BOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => (
            <div
              key={col.id}
              className={`rounded-2xl border ${col.colBg} flex flex-col max-h-[850px] overflow-hidden shadow-2xs`}
            >
              {/* Kanban Column Header */}
              <div className={`p-3.5 border-b flex items-center justify-between ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <col.icon className="w-4 h-4 shrink-0" />
                  <span className="font-heading font-bold text-xs uppercase tracking-wide">
                    {col.title}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeBg}`}>
                  {col.count}
                </span>
              </div>

              {/* Kanban Cards Container */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
                {col.items.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs italic bg-white/40 rounded-xl border border-dashed border-slate-200">
                    Tidak ada aset di tahap ini
                  </div>
                ) : (
                  col.items.map((tx) => {
                    const txKey = getRowKey(tx);
                    const isSelected = selectedRowIds.has(txKey);

                    return (
                      <div
                        key={txKey}
                        className={`bg-white p-3.5 rounded-xl border transition-all duration-200 space-y-2.5 shadow-2xs hover:shadow-md ${
                          isSelected
                            ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {/* Top meta row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(txKey)}
                              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                              title="Pilih item ini"
                            />
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold truncate max-w-[120px]">
                              {tx.nomorDo || "No DO"}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              tx.anggaran === "Capex"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {tx.anggaran}
                          </span>
                        </div>

                        {/* Title & Vendor */}
                        <div>
                          <h4 className="font-heading font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                            {tx.namaBarang}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {tx.namaMitra} &bull;{" "}
                            <strong className="text-slate-800">
                              {tx.jumlah} {tx.satuan}
                            </strong>
                          </p>
                        </div>

                        {/* Milestone details */}
                        <div className="text-[10px] space-y-1 pt-1.5 border-t border-slate-100 text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Sheet:</span>
                            <span className="font-medium text-slate-700">{tx.sheetName}</span>
                          </div>
                          {tx.tanggalTerimaBarcode && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Terima BC:</span>
                              <span className="font-medium text-slate-700">{tx.tanggalTerimaBarcode}</span>
                            </div>
                          )}
                          {tx.tanggalProsesBarcode && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Selesai BC:</span>
                              <span className="font-medium text-slate-700">{tx.tanggalProsesBarcode}</span>
                            </div>
                          )}
                          {tx.tanggalKirimBarang && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tgl Kirim:</span>
                              <span className="font-bold text-emerald-700">{tx.tanggalKirimBarang}</span>
                            </div>
                          )}
                          {tx.userPemakai && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">User:</span>
                              <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                                {tx.userPemakai}
                              </span>
                            </div>
                          )}
                          {tx.tujuanPengiriman && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tujuan:</span>
                              <span className="font-medium text-slate-700 truncate max-w-[130px]">
                                {tx.tujuanPengiriman}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Evidence BA Badge */}
                        {tx.evidenceBaUrl && (
                          <div className="pt-0.5">
                            <a
                              href={tx.evidenceBaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span>Evidence BA Terlampir</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}

                        {/* Action row */}
                        <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tx)}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW WITH CHECKBOX MULTI-SELECT */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  {/* Checkbox All */}
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                      title="Pilih seluruh baris"
                    />
                  </th>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-4 min-w-[240px]">Identitas Aset & Pengadaan</th>
                  <th className="py-3 px-4 min-w-[140px]">Status Alur</th>
                  <th className="py-3 px-4 min-w-[190px]">Sub Proses Labeling</th>
                  <th className="py-3 px-4 min-w-[230px]">Sub Proses Distribusi</th>
                  <th className="py-3 px-4 min-w-[140px]">Keterangan</th>
                  <th className="py-3 px-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="p-3 bg-slate-100 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-slate-400">
                          <Truck className="w-6 h-6" />
                        </div>
                        <p className="font-semibold text-slate-700 text-sm">Tidak ada data aset ditemukan</p>
                        <p className="text-xs text-slate-400">
                          Coba ubah kata kunci pencarian atau ubah tab status filter di atas.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, idx) => {
                    const txKey = getRowKey(tx);
                    const isSelected = selectedRowIds.has(txKey);
                    const stage = getItemStage(tx);

                    return (
                      <tr
                        key={txKey}
                        className={`transition-colors group ${
                          isSelected ? "bg-rose-50/50 hover:bg-rose-50/70" : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Checkbox Row */}
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(txKey)}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                        </td>

                        {/* No */}
                        <td className="py-3.5 px-3 text-center font-medium text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Identitas Aset & Pengadaan */}
                        <td className="py-3.5 px-4 space-y-1">
                          <div className="font-bold text-slate-900 text-[13px] leading-snug">
                            {tx.namaBarang}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-slate-500 text-[11px]">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              DO: {tx.nomorDo || "-"}
                            </span>
                            <span>&bull;</span>
                            <span className="font-medium text-slate-700 truncate max-w-[160px] inline-block">
                              {tx.namaMitra}
                            </span>
                            <span>&bull;</span>
                            <span className="text-rose-600 font-semibold">
                              {tx.jumlah} {tx.satuan}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span>Sheet: {tx.sheetName}</span>
                            <span>&bull;</span>
                            <span>Tgl Terima: {tx.tanggalTerimaBarang || "-"}</span>
                          </div>
                        </td>

                        {/* Status Alur */}
                        <td className="py-3.5 px-4">
                          {stage === "DONE" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Selesai</span>
                            </span>
                          ) : stage === "READY" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Siap Kirim</span>
                            </span>
                          ) : stage === "LABELING" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <QrCode className="w-3.5 h-3.5 text-amber-600" />
                              <span>Proses Labeling</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Diterima</span>
                            </span>
                          )}
                        </td>

                        {/* Sub-Proses Labeling */}
                        <td className="py-3.5 px-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="text-[10px] text-slate-400 w-16 inline-block">Terima:</span>
                            <span className="font-medium text-slate-800">
                              {tx.tanggalTerimaBarcode || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="text-[10px] text-slate-400 w-16 inline-block">Selesai:</span>
                            <span className="font-medium text-slate-800">
                              {tx.tanggalProsesBarcode || "-"}
                            </span>
                          </div>
                        </td>

                        {/* Sub-Proses Distribusi */}
                        <td className="py-3.5 px-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 w-16 inline-block">Tgl Kirim:</span>
                            <span className="font-medium text-slate-800">
                              {tx.tanggalKirimBarang || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 w-16 inline-block">User/PIC:</span>
                            <span className="font-semibold text-slate-900 truncate max-w-[150px]">
                              {tx.userPemakai || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 w-16 inline-block">Tujuan:</span>
                            <span className="text-slate-600 truncate max-w-[150px]">
                              {tx.tujuanPengiriman || "-"}
                            </span>
                          </div>
                          {tx.evidenceBaUrl ? (
                            <div className="pt-1">
                              <a
                                href={tx.evidenceBaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                                title="Buka Berkas Bukti BA Pengeluaran bertanda tangan PM & FAM"
                              >
                                <FileText className="w-3 h-3 text-rose-600" />
                                <span>Lihat Evidence BA</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          ) : (
                            <div className="pt-0.5">
                              <span className="text-[10px] text-slate-400 italic">
                                Belum ada Evidence BA
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Keterangan */}
                        <td className="py-3.5 px-4">
                          <p className="text-slate-600 text-[11px] line-clamp-2" title={tx.keterangan || "-"}>
                            {tx.keterangan || "-"}
                          </p>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tx)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-all cursor-pointer active:scale-95"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FLOATING BATCH ACTION BAR */}
      {selectedRowIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom duration-200 max-w-lg w-[92%] sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedRowIds.size}
            </span>
            <span className="text-xs font-semibold whitespace-nowrap">Aset Terpilih</span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Update Batch</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition whitespace-nowrap cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Single Item Update Modal */}
      <UpdateTrackingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaction={selectedItemForEdit}
        onSuccess={() => fetchData(true)}
      />

      {/* Batch Items Update Modal */}
      <BatchUpdateTrackingModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedItems={selectedItemsForBatch}
        onSuccess={() => {
          fetchData(true);
          setSelectedRowIds(new Set());
        }}
      />
    </div>
  );
}
