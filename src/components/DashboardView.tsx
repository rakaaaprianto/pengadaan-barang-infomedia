"use client";

import React, { useState, useEffect, useMemo, useDeferredValue } from "react";
import dynamic from "next/dynamic";
import { DashboardSummary } from "@/lib/sheets/types";
import {
  RefreshCw,
  Search,
  Filter,
  Box,
  PieChart as PieChartIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
} from "lucide-react";
import { ExportExcelModal } from "./ExportExcelModal";

// Code-split heavy Recharts components (reduces initial bundle size and speeds up FCP)
const DynamicCapexDonutChart = dynamic(
  () => import("./charts/CapexDonutChart"),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />,
  }
);

const DynamicMonthlyTrendBarChart = dynamic(
  () => import("./charts/MonthlyTrendBarChart"),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />,
  }
);

// Indonesian Months list and order index map for chronological sorting
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
] as const;

const MONTH_ORDER_MAP: Record<string, number> = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

function parseYearAndMonth(sheetName?: string, tanggalTerimaBarang?: string) {
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

export function DashboardView() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedMitra, setSelectedMitra] = useState<string>("ALL");
  const [selectedPIC, setSelectedPIC] = useState<string>("ALL");
  const [selectedAnggaran, setSelectedAnggaran] = useState<string>("ALL");
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("ALL");
  const [selectedIO, setSelectedIO] = useState<string>("ALL");

  // Table Search & Pagination & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  type SortField =
    | "no"
    | "tanggalTerimaBarang"
    | "nomorDo"
    | "namaMitra"
    | "namaBarang"
    | "jumlah"
    | "totalHarga"
    | null;
  type SortDirection = "asc" | "desc";

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("Hari ini, 10:45 WIB");
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const fetchDashboardData = async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/dashboard${refresh ? "?refresh=1" : ""}`);
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} WIB`;
        setLastUpdatedTime(`Hari ini, ${timeStr}`);
      } else {
        throw new Error(json.error || "Gagal memuat data dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data dashboard";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter options derived from transactions & metadata
  const availableYears = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.transactions.forEach((tx) => {
      const { year } = parseYearAndMonth(tx.sheetName, tx.tanggalTerimaBarang);
      if (year) set.add(year);
    });
    data.monthlyTrend.forEach((m) => {
      if (m.year) set.add(String(m.year));
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [data]);

  const availableMonths = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();

    data.transactions.forEach((tx) => {
      const { month, year } = parseYearAndMonth(tx.sheetName, tx.tanggalTerimaBarang);
      if (!month) return;
      if (selectedYear === "ALL" || year === selectedYear) {
        set.add(month);
      }
    });

    data.monthlyTrend.forEach((m) => {
      if (!m.month) return;
      if (selectedYear === "ALL" || String(m.year) === selectedYear) {
        set.add(m.month);
      }
    });

    return Array.from(set).sort((a, b) => {
      const idxA = MONTH_ORDER_MAP[a.toLowerCase()] ?? 99;
      const idxB = MONTH_ORDER_MAP[b.toLowerCase()] ?? 99;
      return idxA - idxB;
    });
  }, [data, selectedYear]);

  // Handle year change with month adjustment
  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    setCurrentPage(1);

    if (selectedMonth !== "ALL" && newYear !== "ALL") {
      const monthsInNewYear = new Set<string>();
      data?.transactions.forEach((tx) => {
        const { month, year } = parseYearAndMonth(tx.sheetName, tx.tanggalTerimaBarang);
        if (year === newYear && month) monthsInNewYear.add(month.toLowerCase());
      });
      data?.monthlyTrend.forEach((m) => {
        if (String(m.year) === newYear && m.month) monthsInNewYear.add(m.month.toLowerCase());
      });
      if (!monthsInNewYear.has(selectedMonth.toLowerCase())) {
        setSelectedMonth("ALL");
      }
    }
  };

  const filterOptions = useMemo(() => {
    if (!data) return { mitras: [], pics: [], ccs: [], ios: [] };
    const mitras = Array.from(new Set(data.transactions.map((t) => t.namaMitra))).filter(Boolean).sort();
    const pics = Array.from(new Set(data.transactions.map((t) => t.pic))).filter(Boolean).sort();
    const ccs = Array.from(new Set(data.transactions.map((t) => t.costCenter))).filter(Boolean).sort();
    const ios = Array.from(new Set(data.transactions.map((t) => t.internalOrder))).filter(Boolean).sort();

    return { mitras, pics, ccs, ios };
  }, [data]);

  // Filtered transactions based on global filters (Used for KPIs & Charts - NOT affected by table search)
  const filteredBaseTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((tx) => {
      const { month, year } = parseYearAndMonth(tx.sheetName, tx.tanggalTerimaBarang);

      if (selectedYear !== "ALL" && year !== selectedYear) return false;
      if (selectedMonth !== "ALL" && month.toLowerCase() !== selectedMonth.toLowerCase()) return false;
      if (selectedMitra !== "ALL" && tx.namaMitra !== selectedMitra) return false;
      if (selectedPIC !== "ALL" && tx.pic !== selectedPIC) return false;
      if (selectedAnggaran !== "ALL" && tx.anggaran !== selectedAnggaran) return false;
      if (selectedCostCenter !== "ALL" && tx.costCenter !== selectedCostCenter) return false;
      if (selectedIO !== "ALL" && tx.internalOrder !== selectedIO) return false;

      return true;
    });
  }, [
    data,
    selectedYear,
    selectedMonth,
    selectedMitra,
    selectedPIC,
    selectedAnggaran,
    selectedCostCenter,
    selectedIO,
  ]);

  // Table search decoupled using React 19 useDeferredValue (prevents UI freeze on keystrokes)
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const tableFilteredTransactions = useMemo(() => {
    if (!deferredSearchQuery.trim()) return filteredBaseTransactions;
    const q = deferredSearchQuery.toLowerCase().trim();
    return filteredBaseTransactions.filter((tx) => {
      return (
        tx.namaBarang.toLowerCase().includes(q) ||
        tx.namaMitra.toLowerCase().includes(q) ||
        tx.namaProject.toLowerCase().includes(q) ||
        tx.pic.toLowerCase().includes(q) ||
        tx.internalOrder.toLowerCase().includes(q) ||
        tx.costCenter.toLowerCase().includes(q) ||
        (tx.nomorDo && tx.nomorDo.toLowerCase().includes(q)) ||
        (tx.keterangan && tx.keterangan.toLowerCase().includes(q))
      );
    });
  }, [filteredBaseTransactions, deferredSearchQuery]);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    if (!sortField) return tableFilteredTransactions;

    return [...tableFilteredTransactions].sort((a, b) => {
      let comparison = 0;
      if (sortField === "no") {
        comparison = (a.no || 0) - (b.no || 0);
      } else if (sortField === "tanggalTerimaBarang") {
        comparison = (a.tanggalTerimaBarang || "").localeCompare(b.tanggalTerimaBarang || "");
      } else if (sortField === "nomorDo") {
        comparison = (a.nomorDo || "").localeCompare(b.nomorDo || "");
      } else if (sortField === "namaMitra") {
        comparison = (a.namaMitra || "").localeCompare(b.namaMitra || "");
      } else if (sortField === "namaBarang") {
        comparison = (a.namaBarang || "").localeCompare(b.namaBarang || "");
      } else if (sortField === "jumlah") {
        comparison = (a.jumlah || 0) - (b.jumlah || 0);
      } else if (sortField === "totalHarga") {
        comparison = (a.totalHarga || 0) - (b.totalHarga || 0);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [tableFilteredTransactions, sortField, sortDirection]);

  // Active filter count & reset handler
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedYear !== "ALL") count++;
    if (selectedMonth !== "ALL") count++;
    if (selectedMitra !== "ALL") count++;
    if (selectedPIC !== "ALL") count++;
    if (selectedAnggaran !== "ALL") count++;
    if (selectedCostCenter !== "ALL") count++;
    if (selectedIO !== "ALL") count++;
    return count;
  }, [
    selectedYear,
    selectedMonth,
    selectedMitra,
    selectedPIC,
    selectedAnggaran,
    selectedCostCenter,
    selectedIO,
  ]);

  const handleResetFilters = () => {
    setSelectedYear("ALL");
    setSelectedMonth("ALL");
    setSelectedMitra("ALL");
    setSelectedPIC("ALL");
    setSelectedAnggaran("ALL");
    setSelectedCostCenter("ALL");
    setSelectedIO("ALL");
    setSearchQuery("");
    setSortField(null);
    setCurrentPage(1);
  };

  // Filtered KPIs
  const filteredKPIs = useMemo(() => {
    let totalAmount = 0;
    let totalItems = 0;
    let capexAmount = 0;
    let opexAmount = 0;
    const uniqueMitras = new Set<string>();

    filteredBaseTransactions.forEach((tx) => {
      totalAmount += tx.totalHarga;
      totalItems += tx.jumlah;
      if (tx.namaMitra) uniqueMitras.add(tx.namaMitra);
      if (tx.anggaran === "Capex") capexAmount += tx.totalHarga;
      else if (tx.anggaran === "Opex") opexAmount += tx.totalHarga;
    });

    const grand = totalAmount || 1;
    const capexPct = ((capexAmount / grand) * 100).toFixed(1);
    const opexPct = ((opexAmount / grand) * 100).toFixed(1);

    return {
      totalAmount,
      totalItems,
      totalTransactions: filteredBaseTransactions.length,
      uniqueMitraCount: uniqueMitras.size,
      capexAmount,
      opexAmount,
      capexPct: parseFloat(capexPct),
      opexPct: parseFloat(opexPct),
    };
  }, [filteredBaseTransactions]);

  // All periods found in data
  const allPeriods = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { month: string; year: number; label: string; timeVal: number }>();

    data.monthlyTrend.forEach((m) => {
      const key = `${m.month} ${m.year}`;
      const mIdx = MONTH_ORDER_MAP[m.month.toLowerCase()] ?? 0;
      map.set(key, {
        month: m.month,
        year: m.year,
        label: m.label || key,
        timeVal: m.year * 12 + mIdx,
      });
    });

    data.transactions.forEach((tx) => {
      const { month, year } = parseYearAndMonth(tx.sheetName, tx.tanggalTerimaBarang);
      if (month && year) {
        const yrNum = parseInt(year, 10);
        const key = `${month} ${year}`;
        if (!map.has(key)) {
          const mIdx = MONTH_ORDER_MAP[month.toLowerCase()] ?? 0;
          map.set(key, {
            month,
            year: yrNum,
            label: tx.sheetName || key,
            timeVal: yrNum * 12 + mIdx,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.timeVal - b.timeVal);
  }, [data]);

  // Dynamic monthly trend that adapts dynamically to all filters
  const dynamicMonthlyTrend = useMemo(() => {
    if (!data || allPeriods.length === 0) return [];

    let relevantPeriods = allPeriods;
    if (selectedYear !== "ALL") {
      relevantPeriods = relevantPeriods.filter((p) => String(p.year) === selectedYear);
    }
    if (selectedMonth !== "ALL") {
      relevantPeriods = relevantPeriods.filter((p) => p.month.toLowerCase() === selectedMonth.toLowerCase());
    }

    // Filter transactions by non-time criteria (Mitra, PIC, Anggaran, CC, IO)
    const nonTimeFilteredTransactions = data.transactions.filter((tx) => {
      if (selectedMitra !== "ALL" && tx.namaMitra !== selectedMitra) return false;
      if (selectedPIC !== "ALL" && tx.pic !== selectedPIC) return false;
      if (selectedAnggaran !== "ALL" && tx.anggaran !== selectedAnggaran) return false;
      if (selectedCostCenter !== "ALL" && tx.costCenter !== selectedCostCenter) return false;
      if (selectedIO !== "ALL" && tx.internalOrder !== selectedIO) return false;
      return true;
    });

    const isMultipleYears = selectedYear === "ALL" && new Set(relevantPeriods.map((p) => p.year)).size > 1;

    return relevantPeriods.map((period) => {
      let totalAmount = 0;
      let transactionCount = 0;
      let capexAmount = 0;
      let opexAmount = 0;

      nonTimeFilteredTransactions.forEach((tx) => {
        const { month, year } = parseYearAndMonth(tx.sheetName, tx.tanggalTerimaBarang);
        if (month.toLowerCase() === period.month.toLowerCase() && parseInt(year || "2026", 10) === period.year) {
          totalAmount += tx.totalHarga;
          transactionCount += 1;
          if (tx.anggaran === "Capex") capexAmount += tx.totalHarga;
          else if (tx.anggaran === "Opex") opexAmount += tx.totalHarga;
        }
      });

      let displayMonth = period.month;
      if (isMultipleYears) {
        const shortYear = String(period.year).slice(-2);
        displayMonth = `${period.month} '${shortYear}`;
      }

      return {
        month: displayMonth,
        fullMonth: period.month,
        year: period.year,
        label: period.label || `${period.month} ${period.year}`,
        totalAmount,
        transactionCount,
        capexAmount,
        opexAmount,
      };
    });
  }, [
    data,
    allPeriods,
    selectedYear,
    selectedMonth,
    selectedMitra,
    selectedPIC,
    selectedAnggaran,
    selectedCostCenter,
    selectedIO,
  ]);

  // Top Mitra with dynamic proportion
  const dynamicTopMitra = useMemo(() => {
    const mitraMap = new Map<string, { totalAmount: number; count: number }>();
    filteredBaseTransactions.forEach((tx) => {
      const name = tx.namaMitra || "Tanpa Mitra";
      const current = mitraMap.get(name) || { totalAmount: 0, count: 0 };
      current.totalAmount += tx.totalHarga;
      current.count += 1;
      mitraMap.set(name, current);
    });

    const grand = filteredKPIs.totalAmount || 1;
    return Array.from(mitraMap.entries())
      .map(([name, stat]) => ({
        name,
        totalAmount: stat.totalAmount,
        transactionCount: stat.count,
        portionPct: parseFloat(((stat.totalAmount / grand) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 4);
  }, [filteredBaseTransactions, filteredKPIs.totalAmount]);

  const grandTotalSafe = filteredKPIs.totalAmount || 1;

  // Donut chart data with explicit slice colors for Recharts Cell mapping
  const donutChartData = useMemo(() => {
    if (filteredKPIs.totalAmount > 0) {
      return [
        { name: "CAPEX", value: filteredKPIs.capexAmount, color: "#E11D48" },
        { name: "OPEX", value: filteredKPIs.opexAmount, color: "#334155" },
      ];
    }
    return [{ name: "Tidak ada data", value: 1, color: "#E2E8F0" }];
  }, [filteredKPIs.totalAmount, filteredKPIs.capexAmount, filteredKPIs.opexAmount]);

  // Format short currency (e.g. Rp 58.85M)
  const formatShortM = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toFixed(2)}B`;
    }
    if (amount >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (amount >= 1_000) {
      return `Rp ${(amount / 1_000).toFixed(0)}K`;
    }
    return `Rp ${amount}`;
  };

  // Pagination with sliding window
  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);

    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) {
      pages.push(i);
    }
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  // Active period label for badges & notes
  const activePeriodLabel = useMemo(() => {
    if (selectedYear !== "ALL" && selectedMonth !== "ALL") {
      return `${selectedMonth} ${selectedYear}`;
    }
    if (selectedYear !== "ALL") {
      return `Realisasi ${selectedYear}`;
    }
    if (selectedMonth !== "ALL") {
      return `Bulan ${selectedMonth}`;
    }
    return "Semua Periode";
  }, [selectedYear, selectedMonth]);

  // Helper render ikon sort
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline-block opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-3.5 h-3.5 text-rose-600 ml-1 inline-block stroke-[2.5]" />;
    }
    return <ArrowDown className="w-3.5 h-3.5 text-rose-600 ml-1 inline-block stroke-[2.5]" />;
  };



  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="h-28 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-80 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
          <div className="lg:col-span-7 h-80 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-white rounded-2xl border border-rose-200 shadow-sm text-center">
        <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
        <h2 className="text-lg font-heading font-bold text-slate-900">Gagal Memuat Dashboard</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={() => fetchDashboardData(true)}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Muat Ulang
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BEGIN: PageHeader */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          {/* Breadcrumb & Tags */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
              Analitik &amp; Laporan
            </span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-xs font-medium text-slate-500">
              Asset Management
            </span>
          </div>
          {/* Main Title & Subtitle */}
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Dashboard Pengadaan Asset
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan data transaksi pembelian seluruh sheet bulanan Google Sheets
          </p>
        </div>

        {/* Action Buttons & Timestamp */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-right hidden lg:block mr-1">
            <p className="text-xs text-slate-400">Terakhir diperbarui</p>
            <p className="text-xs font-semibold text-slate-600">{lastUpdatedTime}</p>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs group disabled:opacity-60"
            type="button"
          >
            <RefreshCw className={`w-4 h-4 mr-2 text-slate-500 ${isRefreshing ? "animate-spin text-rose-600" : "group-hover:rotate-180 transition-transform duration-500"}`} />
            Perbarui Data
          </button>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-2xs shadow-emerald-600/20 group"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </button>
        </div>
      </section>
      {/* END: PageHeader */}

      {/* BEGIN: FilterSection */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Filter className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 font-heading">
              Filter Data Transaksi
            </h2>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                {activeFilterCount} Aktif
              </span>
            )}
          </div>
          {(activeFilterCount > 0 || searchQuery.trim() !== "") && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50/70 border border-rose-200/70 hover:bg-rose-100 hover:text-rose-700 transition shadow-2xs"
              type="button"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Tahun Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="filter-tahun">
              Tahun
            </label>
            <select
              id="filter-tahun"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 py-2 pl-3 pr-8 transition"
            >
              <option value="ALL">Semua Tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Bulan Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="filter-bulan">
              Bulan
            </label>
            <select
              id="filter-bulan"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 py-2 pl-3 pr-8 transition"
            >
              <option value="ALL">Semua Bulan</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Nama Mitra Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="filter-mitra">
              Nama Mitra
            </label>
            <select
              id="filter-mitra"
              value={selectedMitra}
              onChange={(e) => {
                setSelectedMitra(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 py-2 pl-3 pr-8 transition truncate"
            >
              <option value="ALL">Semua Mitra</option>
              {filterOptions.mitras.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* PIC Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="filter-pic">
              PIC
            </label>
            <select
              id="filter-pic"
              value={selectedPIC}
              onChange={(e) => {
                setSelectedPIC(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 py-2 pl-3 pr-8 transition truncate"
            >
              <option value="ALL">Semua PIC</option>
              {filterOptions.pics.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Anggaran Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="filter-anggaran">
              Anggaran
            </label>
            <select
              id="filter-anggaran"
              value={selectedAnggaran}
              onChange={(e) => {
                setSelectedAnggaran(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 py-2 pl-3 pr-8 transition"
            >
              <option value="ALL">Semua Anggaran</option>
              <option value="Capex">Capex</option>
              <option value="Opex">Opex</option>
              <option value="Capex/Opex">Capex/Opex</option>
            </select>
          </div>

          {/* Cost Center Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="filter-cc">
              Cost Center
            </label>
            <select
              id="filter-cc"
              value={selectedCostCenter}
              onChange={(e) => {
                setSelectedCostCenter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 py-2 pl-3 pr-8 transition truncate"
            >
              <option value="ALL">Semua CC</option>
              {filterOptions.ccs.map((cc) => (
                <option key={cc} value={cc}>
                  {cc}
                </option>
              ))}
            </select>
          </div>

          {/* Internal Order Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1" htmlFor="filter-io">
              Internal Order
            </label>
            <select
              id="filter-io"
              value={selectedIO}
              onChange={(e) => {
                setSelectedIO(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 py-2 pl-3 pr-8 transition truncate"
            >
              <option value="ALL">Semua IO</option>
              {filterOptions.ios.map((io) => (
                <option key={io} value={io}>
                  {io}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
      {/* END: FilterSection */}

      {/* BEGIN: KPICardsGrid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="metrics-summary">
        {/* KPI Card 1: Total Pengadaan */}
        <article className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-center items-center text-center hover:border-slate-300 transition group min-h-[135px]">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <div className="h-6 w-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
              Rp
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Pengadaan
            </span>
          </div>
          <div className="text-2xl font-heading font-extrabold text-slate-900 tracking-tight tabular-nums">
            Rp {new Intl.NumberFormat("id-ID").format(filteredKPIs.totalAmount)}
          </div>
        </article>

        {/* KPI Card 2: Total Kuantitas Item */}
        <article className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-center items-center text-center hover:border-slate-300 transition group min-h-[135px]">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <div className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Box className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Kuantitas Item
            </span>
          </div>
          <div className="text-2xl font-heading font-extrabold text-slate-900 tracking-tight tabular-nums">
            {new Intl.NumberFormat("id-ID").format(filteredKPIs.totalItems)} Unit
          </div>
        </article>

        {/* KPI Card 3: Proporsi Anggaran (Dipertahankan sesuai permintaan) */}
        <article className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-center hover:border-slate-300 transition group min-h-[135px]">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <PieChartIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Proporsi Anggaran
            </span>
          </div>
          <div className="text-center text-lg font-heading font-extrabold text-slate-900 tracking-tight tabular-nums flex items-center justify-center gap-1.5">
            <span className="text-rose-600">Capex {filteredKPIs.capexPct}%</span>
            <span className="text-slate-300 font-light">/</span>
            <span className="text-slate-700">Opex {filteredKPIs.opexPct}%</span>
          </div>
          {/* Segmented Progress Bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 w-full">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-rose-500 h-full rounded-l-full transition-all duration-500"
                style={{ width: `${filteredKPIs.capexPct}%` }}
                title={`Capex: ${filteredKPIs.capexPct}%`}
              />
              <div
                className="bg-slate-700 h-full rounded-r-full transition-all duration-500"
                style={{ width: `${filteredKPIs.opexPct}%` }}
                title={`Opex: ${filteredKPIs.opexPct}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium px-1">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> Capex
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 inline-block" /> Opex
              </span>
            </div>
          </div>
        </article>

        {/* KPI Card 4: Mitra Terlibat */}
        <article className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-center items-center text-center hover:border-slate-300 transition group min-h-[135px]">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mitra Terlibat
            </span>
          </div>
          <div className="text-2xl font-heading font-extrabold text-slate-900 tracking-tight tabular-nums">
            {filteredKPIs.uniqueMitraCount} Mitra
          </div>
        </article>
      </section>
      {/* END: KPICardsGrid */}

      {/* BEGIN: VisualChartsSection */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart Left: Donut Chart Capex vs Opex */}
        <article className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Chart Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <PieChartIcon className="w-4 h-4" />
                </span>
                <h3 className="font-heading font-bold text-slate-800 text-sm">
                  Breakdown Nilai: Capex vs Opex
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {activePeriodLabel}
              </span>
            </div>

            {/* Donut Graphic Container via DynamicCapexDonutChart */}
            <DynamicCapexDonutChart
              data={donutChartData}
              totalAmount={filteredKPIs.totalAmount}
              capexAmount={filteredKPIs.capexAmount}
              opexAmount={filteredKPIs.opexAmount}
              capexPct={filteredKPIs.capexPct}
              opexPct={filteredKPIs.opexPct}
              formatShortM={formatShortM}
            />
          </div>
        </article>

        {/* Chart Right: Bar Chart Tren Bulanan */}
        <article className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Chart Header without kuartalan toggle */}
            <div className="flex items-center space-x-2 mb-6">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="font-heading font-bold text-slate-800 text-sm">
                Tren Nilai Pengadaan Bulanan
              </h3>
            </div>

            {/* Dynamic Monthly Trend Bar Chart */}
            <DynamicMonthlyTrendBarChart
              data={dynamicMonthlyTrend}
              activePeriodLabel={activePeriodLabel}
            />
          </div>
        </article>
      </section>
      {/* END: VisualChartsSection */}

      {/* BEGIN: TopVendorsSection */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Section Header */}
        <div className="p-5 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-heading font-bold text-slate-900 text-sm sm:text-base">
                Top 5 Mitra dengan Nilai Pengadaan Terbesar
              </h3>
              <p className="text-xs text-slate-500">Peringkat mitra berdasarkan total kontribusi nilai transaksi</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">
              Menampilkan {dynamicTopMitra.length} dari {filterOptions.mitras.length} entitas terdaftar
            </span>
          </div>
        </div>

        {/* Top Mitra List / Cards Grid */}
        <div className="p-5 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dynamicTopMitra.map((mitra, index) => {
            const isTopOne = index === 0;
            return (
              <div
                key={mitra.name}
                className={`p-4 rounded-xl border relative flex flex-col justify-between transition ${
                  isTopOne
                    ? "border-rose-100 bg-gradient-to-b from-rose-50/40 to-white hover:border-rose-200 hover:shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-heading font-bold text-xs ${
                      isTopOne
                        ? "bg-rose-600 text-white shadow-xs"
                        : index === 1
                        ? "bg-slate-800 text-white"
                        : index === 2
                        ? "bg-slate-700 text-white"
                        : "bg-slate-600 text-white"
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                    {mitra.transactionCount} transaksi
                  </span>
                </div>

                <div className="mt-4">
                  <h4
                    className={`font-heading font-bold text-slate-900 text-sm leading-tight transition line-clamp-1 ${
                      isTopOne ? "group-hover:text-rose-600" : ""
                    }`}
                    title={mitra.name}
                  >
                    {mitra.name}
                  </h4>
                  <div className="mt-2 text-base font-extrabold text-slate-900 tabular-nums">
                    Rp {new Intl.NumberFormat("id-ID").format(mitra.totalAmount)}
                  </div>
                  {/* Value Proportion Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Porsi Nilai</span>
                      <span className={`font-semibold ${isTopOne ? "text-rose-600" : "text-slate-700"}`}>
                        {mitra.portionPct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isTopOne ? "bg-rose-500" : index === 1 ? "bg-slate-700" : index === 2 ? "bg-slate-500" : "bg-slate-400"
                        }`}
                        style={{ width: `${mitra.portionPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {/* END: TopVendorsSection */}

      {/* BEGIN: DataTableSection */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-heading font-bold text-slate-900">Tabel Transaksi Pengadaan</h2>
              {sortField && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Urutan: {sortField} ({sortDirection.toUpperCase()})
                  <button
                    type="button"
                    onClick={() => setSortField(null)}
                    className="hover:text-rose-900 ml-0.5"
                    title="Reset urutan"
                  >
                    &times;
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {sortedTransactions.length} baris data sesuai kriteria filter &amp; pencarian
            </p>
          </div>

          {/* Action Tools: Search & Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari barang, mitra, project, PIC..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:border-rose-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  title="Hapus pencarian"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Quick Export Button in Table */}
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition shadow-2xs group shrink-0"
              title="Export data ke Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Responsive Table Container with Horizontal Scroll */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] font-heading select-none">
                <th
                  onClick={() => handleSort("no")}
                  className="py-3.5 px-3 w-14 text-center cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center justify-center">
                    <span>No.</span>
                    {renderSortIcon("no")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("tanggalTerimaBarang")}
                  className="py-3.5 px-3 w-28 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Tanggal</span>
                    {renderSortIcon("tanggalTerimaBarang")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("nomorDo")}
                  className="py-3.5 px-3 w-28 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Nomor DO</span>
                    {renderSortIcon("nomorDo")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("namaMitra")}
                  className="py-3.5 px-4 w-44 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Nama Mitra</span>
                    {renderSortIcon("namaMitra")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("namaBarang")}
                  className="py-3.5 px-4 min-w-[180px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center">
                    <span>Nama Barang</span>
                    {renderSortIcon("namaBarang")}
                  </div>
                </th>
                <th className="py-3.5 px-3 w-36">Nama Project</th>
                <th className="py-3.5 px-3 w-28">PIC</th>
                <th className="py-3.5 px-3 w-40">Internal Order</th>
                <th className="py-3.5 px-3 w-40">Cost Center</th>
                <th className="py-3.5 px-3 w-28 text-right">Harga Satuan</th>
                <th
                  onClick={() => handleSort("jumlah")}
                  className="py-3.5 px-2 w-16 text-center cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center justify-center">
                    <span>Qty</span>
                    {renderSortIcon("jumlah")}
                  </div>
                </th>
                <th className="py-3.5 px-2 w-16 text-center">Satuan</th>
                <th className="py-3.5 px-2 w-20 text-center">Anggaran</th>
                <th
                  onClick={() => handleSort("totalHarga")}
                  className="py-3.5 px-4 w-32 text-right cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center justify-end">
                    <span>Total Harga</span>
                    {renderSortIcon("totalHarga")}
                  </div>
                </th>
                <th className="py-3.5 px-4 min-w-[150px]">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-heading font-bold text-slate-800 text-sm">Tidak ada transaksi yang cocok</p>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        Coba periksa kata kunci pencarian atau bersihkan filter yang aktif.
                      </p>
                      {(activeFilterCount > 0 || searchQuery.trim() !== "") && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-2xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Bersihkan Pencarian &amp; Reset Filter</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 text-center font-medium text-slate-400 tabular-nums">{tx.no}</td>
                    <td className="py-3 px-3 whitespace-nowrap tabular-nums text-slate-600">{tx.tanggalTerimaBarang}</td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {tx.nomorDo || "—"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{tx.namaMitra}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{tx.namaBarang}</td>
                    <td className="py-3 px-3 text-slate-600">{tx.namaProject}</td>
                    <td className="py-3 px-3 text-slate-600">{tx.pic}</td>
                    <td className="py-3 px-3 font-mono text-[11px]" title={tx.internalOrderName}>
                      {tx.internalOrder ? (
                        <div>
                          <span className="font-semibold text-slate-800">{tx.internalOrder}</span>
                          {tx.internalOrderName && tx.internalOrderName !== tx.internalOrder && (
                            <span className="block text-[10px] text-slate-400 truncate max-w-[140px]">
                              {tx.internalOrderName}
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]" title={tx.costCenterName}>
                      {tx.costCenter ? (
                        <div>
                          <span className="font-semibold text-slate-800">{tx.costCenter}</span>
                          {tx.costCenterName && tx.costCenterName !== tx.costCenter && (
                            <span className="block text-[10px] text-slate-400 truncate max-w-[140px]">
                              {tx.costCenterName}
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap font-medium tabular-nums">
                      Rp {new Intl.NumberFormat("id-ID").format(tx.hargaSatuan)}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-800 tabular-nums">{tx.jumlah}</td>
                    <td className="py-3 px-2 text-center text-slate-500">{tx.satuan}</td>
                    <td className="py-3 px-2 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          tx.anggaran === "Capex"
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : tx.anggaran === "Opex"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {tx.anggaran}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 tabular-nums">
                      Rp {new Intl.NumberFormat("id-ID").format(tx.totalHarga)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[220px] truncate" title={tx.keterangan}>
                      {tx.keterangan || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Tampilkan per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 p-1 text-xs text-slate-800 focus:outline-hidden bg-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (Total {sortedTransactions.length} data)
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition text-xs font-semibold text-slate-700 shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {paginationRange.map((page, idx) => {
                if (page === "...") {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400">
                      ...
                    </span>
                  );
                }
                const isCurrent = page === currentPage;
                return (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => setCurrentPage(Number(page))}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                      isCurrent
                        ? "bg-rose-600 text-white shadow-2xs"
                        : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition text-xs font-semibold text-slate-700 shadow-2xs"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
      {/* END: DataTableSection */}

      {/* BEGIN: ExportExcelModal */}
      {data && (
        <ExportExcelModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          allTransactions={data.transactions}
          tableFilteredTransactions={sortedTransactions}
          availableYears={availableYears}
          availableMonths={availableMonths}
          activeDashboardFilterCount={activeFilterCount}
          activeDashboardPeriodLabel={activePeriodLabel}
        />
      )}
      {/* END: ExportExcelModal */}
    </div>
  );
}
