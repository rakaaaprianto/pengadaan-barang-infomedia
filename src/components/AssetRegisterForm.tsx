"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  assetRegisterSchema,
  AssetRegisterInput,
  ANGGARAN_OPTIONS,
} from "@/lib/schemas/asset-register";
import { MasterDataResponse } from "@/lib/sheets/types";
import { Combobox, ComboboxOption } from "./Combobox";
import { CurrencyInput } from "./CurrencyInput";
import { useToast } from "@/components/ui/Toast";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Send,
  Calendar,
  Building2,
  LayoutDashboard,
  Plus,
  Trash2,
  FileText,
  Package,
  Truck,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

const SATUAN_SUGGESTIONS = ["Unit", "Pcs", "Set", "Pack", "Paket", "Box", "Roll", "Lisensi"];

export function AssetRegisterForm() {
  const { toast } = useToast();
  const [masterData, setMasterData] = useState<MasterDataResponse | null>(null);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);

  const [submitSuccess, setSubmitSuccess] = useState<{
    message: string;
    sheetName: string;
    startRowNumber: number;
    itemCount: number;
    totalHarga: number;
    totalQty: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Default values
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssetRegisterInput>({
    resolver: zodResolver(assetRegisterSchema) as any,
    defaultValues: {
      tanggalTerimaBarang: todayStr,
      nomorDo: "",
      namaMitra: "",
      isNewMitra: false,
      namaProject: "",
      pic: "",
      internalOrder: "",
      costCenter: "",
      anggaran: "Capex",
      items: [
        {
          namaBarang: "",
          hargaSatuan: 0,
          jumlah: 1,
          satuan: "Unit",
          totalHarga: 0,
        },
      ],
      keterangan: "",
      totalHargaGabungan: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({
    control,
    name: "items",
  }) || [];
  const watchIO = watch("internalOrder");
  const watchCC = watch("costCenter");
  const watchIsNewMitra = watch("isNewMitra");
  const watchMitra = watch("namaMitra");
  const watchAnggaran = watch("anggaran");
  const watchDo = watch("nomorDo");

  // Kalkulasi live Total Kuantitas dan Grand Total Nilai Pengadaan
  const { liveGrandTotal, liveTotalQty } = useMemo(() => {
    let totalVal = 0;
    let totalQty = 0;
    watchedItems.forEach((item) => {
      const hs = Number(item?.hargaSatuan) || 0;
      const jm = Number(item?.jumlah) || 0;
      totalVal += hs * jm;
      totalQty += jm;
    });
    return {
      liveGrandTotal: isNaN(totalVal) || totalVal < 0 ? 0 : totalVal,
      liveTotalQty: isNaN(totalQty) || totalQty < 0 ? 0 : totalQty,
    };
  }, [watchedItems]);

  useEffect(() => {
    setValue("totalHargaGabungan", liveGrandTotal);
  }, [liveGrandTotal, setValue]);

  // Load master data dari /api/master
  const fetchMasterData = async (refresh = false) => {
    try {
      setIsLoadingMaster(true);
      setMasterError(null);

      const url = `/api/master${refresh ? "?refresh=true" : ""}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memuat master data");
      }

      setMasterData(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan koneksi";
      setMasterError(msg);
      toast.error(msg, "Gagal Memuat Master Data");
    } finally {
      setIsLoadingMaster(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  // Format options combobox
  const mitraOptions: ComboboxOption[] = useMemo(() => {
    if (!masterData?.mitra) return [];
    return masterData.mitra.map((m) => ({
      value: m,
      label: m,
    }));
  }, [masterData]);

  const ioOptions: ComboboxOption[] = useMemo(() => {
    if (!masterData?.internalOrders) return [];
    return masterData.internalOrders.map((io) => ({
      value: io.code,
      label: `${io.code} - ${io.description}`,
      description: `CC: ${io.costCenter}${io.description ? ` | ${io.description}` : ""}`,
      badge: io.costCenter,
    }));
  }, [masterData]);

  const costCenterOptions: ComboboxOption[] = useMemo(() => {
    if (!masterData?.costCenters) return [];
    return masterData.costCenters.map((cc) => ({
      value: cc.code,
      label: `${cc.code} - ${cc.name}`,
    }));
  }, [masterData]);

  // Auto-fill Cost Center & Project saat Internal Order dipilih
  const handleIOChange = (ioCode: string) => {
    setValue("internalOrder", ioCode, { shouldValidate: true });

    if (!ioCode) return;

    const matched = masterData?.internalOrders?.find((item) => item.code === ioCode);
    if (matched) {
      if (matched.costCenter) {
        setValue("costCenter", matched.costCenter, { shouldValidate: true });
      }
      if (matched.description) {
        setValue("namaProject", matched.description, { shouldValidate: true });
      }
    }
  };

  // Auto-fill Project saat Cost Center dipilih
  const handleCCChange = (ccCode: string) => {
    setValue("costCenter", ccCode, { shouldValidate: true });

    if (!ccCode) return;

    if (!watchIO) {
      const relatedIO = masterData?.internalOrders?.find((item) => item.costCenter === ccCode);
      if (relatedIO?.description) {
        setValue("namaProject", relatedIO.description, { shouldValidate: true });
      }
    }
  };

  // Submit Handler
  const onSubmit = async (data: AssetRegisterInput) => {
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menyimpan data ke server");
      }

      setSubmitSuccess({
        message: json.message,
        sheetName: json.data?.sheetName || "",
        startRowNumber: json.data?.startRowNumber || 1,
        itemCount: json.data?.itemCount || data.items.length,
        totalHarga: json.data?.totalHarga || liveGrandTotal,
        totalQty: json.data?.totalQty || liveTotalQty,
      });

      toast.success(
        `Berhasil menyimpan ${data.items.length} barang ke sheet ${json.data?.sheetName || ""}`,
        "Transaksi Berhasil Disimpan"
      );

      // Reset form ke default setelah berhasil
      reset({
        tanggalTerimaBarang: todayStr,
        nomorDo: "",
        namaMitra: "",
        isNewMitra: false,
        namaProject: "",
        pic: "",
        internalOrder: "",
        costCenter: "",
        anggaran: "Capex",
        items: [
          {
            namaBarang: "",
            hargaSatuan: 0,
            jumlah: 1,
            satuan: "Unit",
            totalHarga: 0,
          },
        ],
        keterangan: "",
        totalHargaGabungan: 0,
      });

      // Refresh master data di latar belakang jika ada penambahan mitra baru
      if (data.isNewMitra) {
        fetchMasterData(true);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat submit form";
      setSubmitError(msg);
      toast.error(msg, "Gagal Menyimpan");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (isLoadingMaster) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80 shadow-xs max-w-4xl mx-auto my-8">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin mb-4" />
        <p className="text-sm font-heading font-bold text-slate-800">Memuat master data dari Google Sheets...</p>
        <p className="text-xs text-slate-400 mt-1">Mengambil daftar Mitra, Internal Order aktif, dan Cost Center</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-6">
      {/* Header Banner Form */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
              <Sparkles className="w-3 h-3 text-rose-600" />
              <span>Workspace Input Pengadaan</span>
            </span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-xs font-semibold text-slate-500">Asset Register</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Pendaftaran &amp; Register Aset Baru
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Catat transaksi surat jalan vendor. Mendukung banyak jenis item barang sekaligus dengan kalkulasi otomatis.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/tracking"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Truck className="w-4 h-4 mr-2 text-slate-500" />
            <span>Labeling &amp; Distribusi</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-semibold text-white shadow-xs hover:shadow transition"
          >
            <LayoutDashboard className="w-4 h-4 mr-2 text-rose-200" />
            <span>Dashboard Analitik</span>
          </Link>
        </div>
      </section>

      {/* Master Data Error Alert */}
      {masterError && (
        <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold font-heading">Peringatan Master Data</h3>
            <p className="text-xs text-amber-800 mt-0.5">{masterError}</p>
            <button
              type="button"
              onClick={() => fetchMasterData(true)}
              className="mt-2 text-xs font-semibold underline text-amber-900 hover:text-amber-950"
            >
              Coba Muat Ulang Master Data
            </button>
          </div>
        </div>
      )}

      {/* Notifikasi Sukses */}
      {submitSuccess && (
        <div role="alert" className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-heading font-bold text-emerald-900">Transaksi Berhasil Disimpan ke Google Sheets!</h3>
            <p className="text-xs text-emerald-800 mt-1">{submitSuccess.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-emerald-900 bg-emerald-100/60 p-3 rounded-xl border border-emerald-200">
              <div>
                Sheet Bulanan: <span className="underline font-bold">{submitSuccess.sheetName}</span>
              </div>
              <div>
                Item Terdaftar: <span className="font-bold">{submitSuccess.itemCount} Jenis ({submitSuccess.totalQty} Unit)</span>
              </div>
              <div>
                Total Nilai: <span className="font-heading font-bold">Rp {new Intl.NumberFormat("id-ID").format(submitSuccess.totalHarga)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Link
                href="/tracking"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
              >
                <span>Lihat di Halaman Labeling &amp; Distribusi</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                type="button"
                onClick={() => setSubmitSuccess(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Tutup Notifikasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form & Split-Screen Layout */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* KOLOM KIRI (75% - 8/12 Desktop): Formulir Isian Data */}
          <div className="lg:col-span-8 space-y-6">
            {/* SECTION 1: Informasi Penerimaan & Mitra */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 font-heading">
                    1. Informasi Dokumen &amp; Vendor
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Data pengiriman barang dari surat jalan mitra penyedia
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal Terima Barang */}
                <div>
                  <label htmlFor="tanggalTerimaBarang" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Tanggal Terima Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="tanggalTerimaBarang"
                    type="date"
                    {...register("tanggalTerimaBarang")}
                    className={`w-full text-xs font-medium text-slate-800 bg-slate-50/70 border rounded-xl py-2.5 px-3 shadow-2xs transition focus:outline-hidden focus:ring-1 focus:bg-white ${
                      errors.tanggalTerimaBarang
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                        : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                    }`}
                  />
                  {errors.tanggalTerimaBarang && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.tanggalTerimaBarang.message}</p>
                  )}
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Menentukan bulan sheet target penyimpanan
                  </span>
                </div>

                {/* Nomor DO */}
                <div>
                  <label htmlFor="nomorDo" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Nomor DO / Surat Jalan
                  </label>
                  <input
                    id="nomorDo"
                    type="text"
                    placeholder="Contoh: DO/2026/09/0012"
                    {...register("nomorDo")}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl py-2.5 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:border-rose-500 focus:ring-rose-500 focus:bg-white"
                  />
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Nomor referensi pengiriman fisik dari vendor
                  </span>
                </div>

                {/* Nama Mitra */}
                <div className="sm:col-span-2">
                  <label htmlFor="namaMitra" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Nama Mitra / Vendor <span className="text-rose-500">*</span>
                  </label>
                  <Controller
                    name="namaMitra"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        id="namaMitra"
                        options={mitraOptions}
                        value={field.value}
                        onChange={(val, isNew) => {
                          field.onChange(val);
                          setValue("isNewMitra", Boolean(isNew));
                        }}
                        placeholder="Pilih atau cari nama vendor/mitra..."
                        allowCreate={true}
                        createLabelPrefix="Tambah mitra baru"
                        isNewValue={watchIsNewMitra}
                        error={errors.namaMitra?.message}
                        required={true}
                      />
                    )}
                  />
                  {errors.namaMitra && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.namaMitra.message}</p>
                  )}
                </div>

                {/* Nama Project */}
                <div>
                  <label htmlFor="namaProject" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Nama Project
                  </label>
                  <input
                    id="namaProject"
                    type="text"
                    placeholder="Contoh: Pengadaan PC graha..."
                    {...register("namaProject")}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl py-2.5 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:border-rose-500 focus:ring-rose-500 focus:bg-white"
                  />
                </div>

                {/* PIC */}
                <div>
                  <label htmlFor="pic" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    PIC (Person In Charge)
                  </label>
                  <input
                    id="pic"
                    type="text"
                    placeholder="Nama PIC pengadaan..."
                    {...register("pic")}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl py-2.5 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:border-rose-500 focus:ring-rose-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Alokasi Anggaran */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 font-heading">
                    2. Alokasi Anggaran &amp; Cost Center
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Menentukan pos belanja anggaran dan beban biaya divisi/unit
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Internal Order */}
                <div>
                  <label htmlFor="internalOrder" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Internal Order (IO)
                  </label>
                  <Controller
                    name="internalOrder"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        id="internalOrder"
                        options={ioOptions}
                        value={field.value || ""}
                        onChange={handleIOChange}
                        placeholder="Pilih atau cari kode IO..."
                        error={errors.internalOrder?.message}
                      />
                    )}
                  />
                  {errors.internalOrder && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.internalOrder.message}</p>
                  )}
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Format 12 digit (otomatis isi CC)
                  </span>
                </div>

                {/* Cost Center */}
                <div>
                  <label htmlFor="costCenter" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Cost Center
                  </label>
                  <Controller
                    name="costCenter"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        id="costCenter"
                        options={costCenterOptions}
                        value={field.value || ""}
                        onChange={handleCCChange}
                        placeholder="Pilih Cost Center..."
                        error={errors.costCenter?.message}
                      />
                    )}
                  />
                  {errors.costCenter && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.costCenter.message}</p>
                  )}
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Awalan IN0...
                  </span>
                </div>

                {/* Jenis Anggaran */}
                <div>
                  <label htmlFor="anggaran" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Jenis Anggaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="anggaran"
                    {...register("anggaran")}
                    className={`w-full text-xs font-bold text-slate-800 bg-slate-50/70 border rounded-xl py-2.5 px-3 shadow-2xs transition focus:outline-hidden focus:ring-1 focus:bg-white ${
                      errors.anggaran
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                        : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                    }`}
                  >
                    {ANGGARAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {errors.anggaran && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.anggaran.message}</p>
                  )}
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Capex (Investasi) / Opex (Operasional)
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 3: Detail Barang (Compact Inline Data-Grid) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                    <Package className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 font-heading">
                      3. Rincian Barang Pengadaan ({fields.length} Item)
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Entri cepat data barang. Subtotal dikalkulasi otomatis per baris.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    append({
                      namaBarang: "",
                      hargaSatuan: 0,
                      jumlah: 1,
                      satuan: "Unit",
                      totalHarga: 0,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-2xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Barang</span>
                </button>
              </div>

              {errors.items?.root && (
                <p className="text-xs text-rose-600 font-medium">{errors.items.root.message}</p>
              )}

              {/* TABLE INLINE DATA GRID (Responsive Unified Grid) */}
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                  <thead className="bg-slate-50/90 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[220px]">Nama Barang &amp; Spesifikasi <span className="text-rose-500">*</span></th>
                      <th className="py-2.5 px-2 w-20 text-center">Qty <span className="text-rose-500">*</span></th>
                      <th className="py-2.5 px-2 w-28">Satuan <span className="text-rose-500">*</span></th>
                      <th className="py-2.5 px-3 w-40">Harga Satuan (Rp) <span className="text-rose-500">*</span></th>
                      <th className="py-2.5 px-3 w-36 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 w-12 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {fields.map((field, index) => {
                      const itemSubtotal =
                        (Number(watchedItems[index]?.hargaSatuan) || 0) * (Number(watchedItems[index]?.jumlah) || 0);

                      return (
                        <tr key={field.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Nomor Urut */}
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                            {index + 1}
                          </td>

                          {/* Nama Barang */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="Nama & spesifikasi barang..."
                              {...register(`items.${index}.namaBarang` as const)}
                              className={`w-full text-xs font-semibold text-slate-800 bg-white border rounded-lg py-2 px-2.5 shadow-2xs transition focus:outline-hidden focus:ring-1 ${
                                errors.items?.[index]?.namaBarang
                                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                                  : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                              }`}
                            />
                            {errors.items?.[index]?.namaBarang && (
                              <span className="text-[10px] text-rose-600 block mt-0.5">
                                {errors.items[index]?.namaBarang?.message}
                              </span>
                            )}
                          </td>

                          {/* Kuantitas (Jumlah) */}
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="1"
                              {...register(`items.${index}.jumlah` as const, { valueAsNumber: true })}
                              className="w-full text-center text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg py-2 px-2 shadow-2xs transition focus:outline-hidden focus:ring-1 focus:border-rose-500 focus:ring-rose-500"
                            />
                          </td>

                          {/* Satuan */}
                          <td className="py-2 px-2">
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder="Unit"
                                {...register(`items.${index}.satuan` as const)}
                                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg py-2 px-2 shadow-2xs transition focus:outline-hidden focus:ring-1 focus:border-rose-500 focus:ring-rose-500"
                              />
                              <div className="flex flex-wrap gap-1">
                                {SATUAN_SUGGESTIONS.slice(0, 3).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setValue(`items.${index}.satuan` as const, s, { shouldValidate: true })}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold cursor-pointer"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Harga Satuan */}
                          <td className="py-2 px-3">
                            <Controller
                              name={`items.${index}.hargaSatuan` as const}
                              control={control}
                              render={({ field: f }) => (
                                <CurrencyInput
                                  value={f.value}
                                  onChange={f.onChange}
                                  placeholder="0"
                                  error={errors.items?.[index]?.hargaSatuan?.message}
                                />
                              )}
                            />
                          </td>

                          {/* Subtotal */}
                          <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                            Rp {new Intl.NumberFormat("id-ID").format(itemSubtotal)}
                          </td>

                          {/* Delete Button */}
                          <td className="py-2 px-2 text-center">
                            {fields.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus baris ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Quick Add Row Button */}
              <button
                type="button"
                onClick={() =>
                  append({
                    namaBarang: "",
                    hargaSatuan: 0,
                    jumlah: 1,
                    satuan: "Unit",
                    totalHarga: 0,
                  })
                }
                className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-slate-400" />
                <span>+ Tambah Baris Barang Lainnya</span>
              </button>
            </div>

            {/* SECTION 4: Keterangan / Catatan */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <FileText className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 font-heading">
                    4. Catatan Tambahan (Opsional)
                  </h2>
                </div>
              </div>

              <textarea
                id="keterangan"
                rows={3}
                placeholder="Catatan tambahan terkait transaksi ini, nomor referensi kontrak, lokasi penempatan, atau informasi pengiriman..."
                {...register("keterangan")}
                className="w-full text-xs font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl py-2.5 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:border-rose-500 focus:ring-rose-500 focus:bg-white resize-none"
              />
            </div>
          </div>

          {/* KOLOM KANAN (25% - 4/12 Desktop): Sticky Order Summary Rail */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-rose-600 text-white rounded-lg shadow-2xs">
                    <Package className="w-4 h-4" />
                  </span>
                  <span className="font-heading font-extrabold text-sm text-slate-900 tracking-tight">
                    Ringkasan Order
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                  {watchAnggaran || "Capex"}
                </span>
              </div>

              {/* Nilai Grand Total */}
              <div className="bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30 p-4 rounded-xl border border-rose-100/90">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                  Total Nilai Pengadaan
                </span>
                <span className="text-2xl sm:text-3xl font-heading font-extrabold text-rose-600 tabular-nums tracking-tight block mt-1">
                  Rp {new Intl.NumberFormat("id-ID").format(liveGrandTotal)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Akumulasi {fields.length} jenis item ({liveTotalQty} unit)
                </span>
              </div>

              {/* Rincian Ringkas Proyek & Vendor */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Nomor Surat Jalan:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[160px]">
                    {watchDo || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Mitra / Vendor:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[160px]">
                    {watchMitra || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Total Kuantitas:</span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {liveTotalQty} Unit
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 font-medium">Beban Biaya (CC):</span>
                  <span className="font-bold text-slate-700">
                    {watchCC || "-"}
                  </span>
                </div>
              </div>

              {/* Mini Item List Preview */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Daftar Barang ({fields.length}):
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {watchedItems.map((it, idx) => {
                    const sub = (Number(it?.hargaSatuan) || 0) * (Number(it?.jumlah) || 0);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-50/80 border border-slate-100"
                      >
                        <span className="font-medium text-slate-700 truncate max-w-[140px]">
                          {it?.namaBarang || `Barang #${idx + 1}`}
                        </span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {it?.jumlah || 1} {it?.satuan || "Unit"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Menyimpan ke Sheets...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-white" />
                      <span>Simpan Transaksi ({fields.length} Item)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Apakah Anda yakin ingin mengosongkan seluruh formulir?")) {
                      reset();
                      toast.info("Formulir telah dikosongkan.", "Reset Selesai");
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset Isian Form</span>
                </button>
              </div>

              <div className="pt-2 text-[10px] text-slate-400 text-center leading-normal">
                Terkoneksi langsung ke Google Sheets API. Data dapat dilacak secara *real-time* di menu pelacakan.
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
