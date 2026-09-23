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
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { DashboardSummary } from "@/lib/sheets/types";
import { UpdateTrackingModal } from "./UpdateTrackingModal";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("ALL");
  const [selectedSheet, setSelectedSheet] = useState<string>("ALL");
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<TransactionItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Daftar sheet unik (bulan)
  const availableSheets = useMemo(() => {
    const sheets = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.sheetName) sheets.add(tx.sheetName);
    });
    return Array.from(sheets);
  }, [transactions]);

  // Statistik Metrik KPI
  const stats = useMemo(() => {
    let pendingBarcode = 0;
    let inLabeling = 0;
    let readyToShip = 0;
    let completed = 0;

    transactions.forEach((tx) => {
      const status = (tx.prosesStatus || "Diterima").toLowerCase();
      if (status.includes("selesai") || status.includes("done") || tx.tanggalKirimBarang) {
        completed++;
      } else if (status.includes("siap") || (tx.tanggalProsesBarcode && !tx.tanggalKirimBarang)) {
        readyToShip++;
      } else if (status.includes("labeling") || (tx.tanggalTerimaBarcode && !tx.tanggalProsesBarcode)) {
        inLabeling++;
      } else {
        pendingBarcode++;
      }
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
      const status = (tx.prosesStatus || "Diterima").toLowerCase();
      const isCompleted = status.includes("selesai") || status.includes("done") || Boolean(tx.tanggalKirimBarang);
      const isReadyToShip = !isCompleted && (status.includes("siap") || (Boolean(tx.tanggalProsesBarcode) && !tx.tanggalKirimBarang));
      const isInLabeling = !isCompleted && !isReadyToShip && (status.includes("labeling") || (Boolean(tx.tanggalTerimaBarcode) && !tx.tanggalProsesBarcode));
      const isPendingBarcode = !isCompleted && !isReadyToShip && !isInLabeling;

      if (selectedStatusTab === "PENDING" && !isPendingBarcode) return false;
      if (selectedStatusTab === "LABELING" && !isInLabeling) return false;
      if (selectedStatusTab === "READY" && !isReadyToShip) return false;
      if (selectedStatusTab === "DONE" && !isCompleted) return false;

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
    <div className="space-y-6 animate-in fade-in duration-300">
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

        <div className="flex items-center gap-2.5 self-start md:self-auto">
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

      {/* Control Bar: Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
            <button
              type="button"
              onClick={() => setSelectedStatusTab("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedStatusTab === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab("PENDING")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedStatusTab === "PENDING"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              Menunggu Barcode ({stats.pendingBarcode})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab("LABELING")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedStatusTab === "LABELING"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
            >
              Sedang Labeling ({stats.inLabeling})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab("READY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedStatusTab === "READY"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
            >
              Siap Kirim ({stats.readyToShip})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab("DONE")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedStatusTab === "DONE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
            >
              Selesai Didistribusikan ({stats.completed})
            </button>
          </div>

          {/* Month selector dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Sheet/Bulan:</span>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="text-xs font-medium px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
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

        {/* Search & Quick Status */}
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

          <div className="text-xs text-slate-500 self-end sm:self-auto font-medium">
            Menampilkan <strong className="text-slate-900">{filteredTransactions.length}</strong> dari{" "}
            <strong className="text-slate-900">{data?.transactions.length || 0}</strong> aset
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">No</th>
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
                  <td colSpan={7} className="py-12 text-center text-slate-400">
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
                  const status = (tx.prosesStatus || "Diterima").toLowerCase();
                  const isDone = status.includes("selesai") || status.includes("done") || Boolean(tx.tanggalKirimBarang);
                  const isReady = !isDone && (status.includes("siap") || (Boolean(tx.tanggalProsesBarcode) && !tx.tanggalKirimBarang));
                  const isLabeling = !isDone && !isReady && (status.includes("labeling") || (Boolean(tx.tanggalTerimaBarcode) && !tx.tanggalProsesBarcode));

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-400">
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
                        {isDone ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selesai</span>
                          </span>
                        ) : isReady ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Siap Kirim</span>
                          </span>
                        ) : isLabeling ? (
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

      {/* Update Tracking Modal */}
      <UpdateTrackingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaction={selectedItemForEdit}
        onSuccess={() => fetchData(true)}
      />
    </div>
  );
}
