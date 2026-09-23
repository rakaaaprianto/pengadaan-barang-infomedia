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
} from "lucide-react";
import Link from "next/link";

const SATUAN_SUGGESTIONS = ["Unit", "Pcs", "Set", "Pack", "Paket", "Box", "Roll", "Lisensi"];

export function AssetRegisterForm() {
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
      const res = await fetch(`/api/master${refresh ? "?refresh=1" : ""}`);
      const json = await res.json();
      if (json.success && json.data) {
        setMasterData(json.data);
      } else {
        throw new Error(json.error || "Gagal mengambil data master");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat master data";
      setMasterError(msg);
    } finally {
      setIsLoadingMaster(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  // Opsi Mitra untuk Combobox
  const mitraOptions: ComboboxOption[] = useMemo(() => {
    if (!masterData) return [];
    return masterData.mitra.map((m) => ({
      value: m,
      label: m,
    }));
  }, [masterData]);

  // Opsi Cost Center untuk Combobox
  const costCenterOptions: ComboboxOption[] = useMemo(() => {
    if (!masterData) return [];
    return masterData.costCenters.map((cc) => ({
      value: cc.code,
      label: `${cc.code} — ${cc.name}`,
      description: cc.division ? `${cc.division} (${cc.directorate})` : cc.directorate,
    }));
  }, [masterData]);

  // Opsi Internal Order untuk Combobox (difilter jika Cost Center sudah dipilih duluan)
  const ioOptions: ComboboxOption[] = useMemo(() => {
    if (!masterData) return [];
    let list = masterData.internalOrders;
    if (watchCC) {
      list = list.filter((io) => io.costCenter.toUpperCase() === watchCC.toUpperCase());
    }
    return list.map((io) => ({
      value: io.code,
      label: `${io.code} — ${io.description}`,
      description: `Cost Center: ${io.costCenter}`,
    }));
  }, [masterData, watchCC]);

  // Hubungan IO ↔ Cost Center:
  // 1. Pilih IO -> Cost Center otomatis terisi
  const handleIOChange = (newIO: string) => {
    setValue("internalOrder", newIO, { shouldValidate: true });
    if (newIO && masterData) {
      const found = masterData.internalOrders.find(
        (item) => item.code.toLowerCase() === newIO.toLowerCase()
      );
      if (found && found.costCenter) {
        setValue("costCenter", found.costCenter, { shouldValidate: true });
      }
    }
  };

  // 2. Pilih Cost Center -> jika IO yang dipilih sebelumnya tidak cocok dengan CC baru, kosongkan IO
  const handleCCChange = (newCC: string) => {
    setValue("costCenter", newCC, { shouldValidate: true });
    if (watchIO && masterData && newCC) {
      const currentIO = masterData.internalOrders.find(
        (item) => item.code.toLowerCase() === watchIO.toLowerCase()
      );
      if (currentIO && currentIO.costCenter.toUpperCase() !== newCC.toUpperCase()) {
        setValue("internalOrder", "", { shouldValidate: true });
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

      // Scroll ke atas agar notifikasi terlihat
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat submit form";
      setSubmitError(msg);
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
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* Header Banner Form matching Dashboard */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
              Form Input
            </span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-xs font-medium text-slate-500">Asset Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Input Transaksi Pengadaan Asset
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Catat transaksi pengadaan barang/asset per Surat Jalan. Mendukung banyak jenis barang sekaligus.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-semibold text-white shadow-xs hover:shadow transition shrink-0"
        >
          <LayoutDashboard className="w-4 h-4 mr-2 text-rose-200" />
          Lihat Dashboard Analitik
        </Link>
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
        <div role="alert" className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-heading font-bold text-emerald-900">Transaksi Berhasil Disimpan!</h3>
            <p className="text-xs text-emerald-800 mt-1">{submitSuccess.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-emerald-900 bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-200">
              <div>
                Sheet Bulanan: <span className="underline font-bold">{submitSuccess.sheetName}</span>
              </div>
              <div>
                Jumlah Item: <span className="font-bold">{submitSuccess.itemCount} Jenis ({submitSuccess.totalQty} Unit)</span>
              </div>
              <div>
                Total Nilai: <span className="font-heading font-bold">Rp {new Intl.NumberFormat("id-ID").format(submitSuccess.totalHarga)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubmitSuccess(null)}
              className="mt-3 text-xs font-semibold text-emerald-700 hover:underline"
            >
              Tutup Notifikasi
            </button>
          </div>
        </div>
      )}

      {/* Notifikasi Gagal / Error Submit */}
      {submitError && (
        <div role="alert" className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-heading font-bold text-rose-900">Gagal Menyimpan Transaksi</h3>
            <p className="text-xs text-rose-800 mt-1 leading-relaxed">{submitError}</p>
            <p className="text-[11px] text-rose-700 mt-2">
              Periksa kembali kelengkapan field di bawah atau pastikan spreadsheet Google terhubung.
            </p>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 space-y-8">
          {/* SECTION 1: Informasi Penerimaan & Mitra */}
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <Calendar className="w-4 h-4" />
              </span>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 font-heading">
                1. Informasi Penerimaan &amp; Mitra
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* Tanggal Terima Barang */}
              <div>
                <label htmlFor="tanggalTerimaBarang" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Tanggal Terima Barang <span className="text-rose-500">*</span>
                </label>
                <input
                  id="tanggalTerimaBarang"
                  type="date"
                  {...register("tanggalTerimaBarang")}
                  className={`w-full text-xs font-medium text-slate-800 bg-slate-50/70 border rounded-xl py-2.5 px-3 shadow-2xs transition focus:outline-hidden focus:ring-1 focus:bg-white ${errors.tanggalTerimaBarang
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                    }`}
                />
                {errors.tanggalTerimaBarang && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.tanggalTerimaBarang.message}</p>
                )}
                <span className="block text-[11px] text-slate-400 mt-1">
                  Menentukan nama sheet bulanan tujuan (misal: September 2026)
                </span>
              </div>

              {/* Nomor DO */}
              <div>
                <label htmlFor="nomorDo" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nomor DO (Delivery Order) / Surat Jalan
                </label>
                <input
                  id="nomorDo"
                  type="text"
                  placeholder="Contoh: DO/2026/09/0012"
                  {...register("nomorDo")}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl py-2.5 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:border-rose-500 focus:ring-rose-500 focus:bg-white"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Opsional — nomor surat jalan dari vendor untuk transaksi ini
                </span>
              </div>

              {/* Nama Mitra (Combobox) */}
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
                      placeholder="Pilih atau ketik untuk mencari mitra..."
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
                <span className="block text-[11px] text-slate-400 mt-1">
                  Ketik nama mitra jika belum ada di daftar untuk menambahkannya secara otomatis ke MASTER_MITRA
                </span>
              </div>

              {/* Nama Project */}
              <div>
                <label htmlFor="namaProject" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nama Project / Keperluan <span className="text-rose-500">*</span>
                </label>
                <input
                  id="namaProject"
                  type="text"
                  placeholder="Contoh: Refreshing PC Asset Operasional 2026"
                  {...register("namaProject")}
                  className={`w-full text-xs font-medium text-slate-800 bg-slate-50/70 border rounded-xl py-2.5 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:bg-white ${errors.namaProject
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                    }`}
                />
                {errors.namaProject && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.namaProject.message}</p>
                )}
              </div>

              {/* PIC */}
              <div>
                <label htmlFor="pic" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  PIC / Pemohon <span className="text-rose-500">*</span>
                </label>
                <input
                  id="pic"
                  type="text"
                  placeholder="Contoh: Budi Santoso / Tim IT Asset"
                  {...register("pic")}
                  className={`w-full text-xs font-medium text-slate-800 bg-slate-50/70 border rounded-xl py-2.5 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:bg-white ${errors.pic
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                    : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                    }`}
                />
                {errors.pic && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.pic.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Pembebanan Anggaran (IO, Cost Center, Jenis Anggaran) */}
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <Building2 className="w-4 h-4" />
              </span>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 font-heading">
                2. Alokasi Anggaran (Internal Order, Cost Center &amp; Jenis Anggaran)
              </h2>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Pilih salah satu atau keduanya. Memilih <strong>Internal Order</strong> akan otomatis mengisi <strong>Cost Center</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
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
                <span className="block text-[11px] text-slate-400 mt-1">
                  Format 12 digit (contoh: 26CIN10A0033).
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
                      placeholder="Pilih atau cari Cost Center..."
                      error={errors.costCenter?.message}
                    />
                  )}
                />
                {errors.costCenter && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.costCenter.message}</p>
                )}
                <span className="block text-[11px] text-slate-400 mt-1">
                  Format awalan IN0... (contoh: IN0C0802).
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
                  className={`w-full text-xs font-semibold text-slate-800 bg-slate-50/70 border rounded-xl py-2.5 px-3 shadow-2xs transition focus:outline-hidden focus:ring-1 focus:bg-white ${errors.anggaran
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
                <span className="block text-[11px] text-slate-400 mt-1">
                  Klasifikasi pos belanja asset
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: Detail Barang & Spesifikasi (Multi-Barang) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Package className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 font-heading">
                    3. Daftar Barang &amp; Spesifikasi
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Satu surat jalan dapat memuat lebih dari satu jenis barang pengadaan
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
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition shadow-2xs shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Barang
              </button>
            </div>

            {errors.items?.root && (
              <p className="mt-2 text-xs text-rose-600 font-medium">{errors.items.root.message}</p>
            )}

            {/* List Kartu Barang */}
            <div className="space-y-4 mt-4">
              {fields.map((field, index) => {
                const itemSubtotal =
                  (Number(watchedItems[index]?.hargaSatuan) || 0) * (Number(watchedItems[index]?.jumlah) || 0);

                return (
                  <div
                    key={field.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition shadow-2xs space-y-4"
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-rose-600 text-white font-heading font-bold text-xs">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 font-heading">
                          Barang ke-{index + 1}
                        </span>
                      </div>

                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition"
                          title="Hapus barang ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    {/* Form Input Item */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Nama Barang & Spesifikasi */}
                      <div className="sm:col-span-12">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Nama Barang &amp; Spesifikasi <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Laptop Lenovo ThinkPad T14 Gen 4 Core i7 16GB"
                          {...register(`items.${index}.namaBarang` as const)}
                          className={`w-full text-xs font-medium text-slate-800 bg-white border rounded-xl py-2 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 ${errors.items?.[index]?.namaBarang
                            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                            : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                            }`}
                        />
                        {errors.items?.[index]?.namaBarang && (
                          <p className="mt-1 text-xs text-rose-600 font-medium">
                            {errors.items[index]?.namaBarang?.message}
                          </p>
                        )}
                      </div>

                      {/* Harga Satuan */}
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Harga Satuan (Rp) <span className="text-rose-500">*</span>
                        </label>
                        <Controller
                          name={`items.${index}.hargaSatuan` as const}
                          control={control}
                          render={({ field: cField }) => (
                            <CurrencyInput
                              id={`item-harga-${index}`}
                              value={cField.value}
                              onChange={cField.onChange}
                              placeholder="0"
                              error={errors.items?.[index]?.hargaSatuan?.message}
                              required={true}
                            />
                          )}
                        />
                        {errors.items?.[index]?.hargaSatuan && (
                          <p className="mt-1 text-xs text-rose-600 font-medium">
                            {errors.items[index]?.hargaSatuan?.message}
                          </p>
                        )}
                      </div>

                      {/* Jumlah Qty */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Jumlah (Qty) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          {...register(`items.${index}.jumlah` as const, { valueAsNumber: true })}
                          className={`w-full text-xs font-semibold tabular-nums text-slate-800 bg-white border rounded-xl py-2 px-3 shadow-2xs transition focus:outline-hidden focus:ring-1 ${errors.items?.[index]?.jumlah
                            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                            : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                            }`}
                        />
                        {errors.items?.[index]?.jumlah && (
                          <p className="mt-1 text-xs text-rose-600 font-medium">
                            {errors.items[index]?.jumlah?.message}
                          </p>
                        )}
                      </div>

                      {/* Satuan */}
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Satuan <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Unit, Pcs, Set..."
                          {...register(`items.${index}.satuan` as const)}
                          className={`w-full text-xs font-medium text-slate-800 bg-white border rounded-xl py-2 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 ${errors.items?.[index]?.satuan
                            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                            : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
                            }`}
                        />
                        {errors.items?.[index]?.satuan && (
                          <p className="mt-1 text-xs text-rose-600 font-medium">
                            {errors.items[index]?.satuan?.message}
                          </p>
                        )}
                        {/* Chip suggestions */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {SATUAN_SUGGESTIONS.slice(0, 4).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setValue(`items.${index}.satuan` as const, s, { shouldValidate: true })}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Subtotal Item Card */}
                      <div className="sm:col-span-12 mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-slate-400">
                          Subtotal Barang #{index + 1} ({watchedItems[index]?.jumlah || 0} {watchedItems[index]?.satuan || "Unit"} × Rp {new Intl.NumberFormat("id-ID").format(Number(watchedItems[index]?.hargaSatuan) || 0)}):
                        </span>
                        <span className="font-heading font-extrabold text-slate-900 tabular-nums">
                          Rp {new Intl.NumberFormat("id-ID").format(itemSubtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Button */}
            <div className="mt-3">
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
                className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-rose-400 hover:bg-rose-50/30 rounded-2xl text-xs font-semibold text-slate-600 hover:text-rose-600 transition flex items-center justify-center gap-2 group"
              >
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                <span>+ Tambah Jenis Barang Lainnya dalam Surat Jalan Ini</span>
              </button>
            </div>
          </div>

          {/* SECTION 4: Keterangan & Ringkasan Total Gabungan */}
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-700 font-heading">
                4. Keterangan &amp; Ringkasan Total Pengadaan
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* Field Keterangan */}
              <div>
                <label htmlFor="keterangan" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Keterangan / Catatan Tambahan
                </label>
                <textarea
                  id="keterangan"
                  rows={4}
                  placeholder="Catatan tambahan terkait transaksi ini, nomor referensi kontrak, lokasi penempatan, atau informasi pengiriman (opsional)..."
                  {...register("keterangan")}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl py-2.5 px-3 shadow-2xs transition placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:border-rose-500 focus:ring-rose-500 focus:bg-white resize-none"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Akan tersimpan di kolom terakhir sheet transaksi Google Sheets
                </span>
              </div>

              {/* Ringkasan Total Gabungan */}
              <div className="flex flex-col justify-between p-5 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/50 via-white to-rose-50/20 shadow-xs">
                <div>
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                    Ringkasan Total Pengadaan
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Akumulasi seluruh jenis barang dalam surat jalan ini
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-rose-100/70 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Jenis Barang</span>
                      <span className="font-heading font-extrabold text-slate-800 text-sm">
                        {fields.length} Jenis
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Kuantitas</span>
                      <span className="font-heading font-extrabold text-slate-800 text-sm tabular-nums">
                        {liveTotalQty} Unit
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-100/70 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 font-heading">
                    Total Nilai Gabungan:
                  </span>
                  <span className="text-xl sm:text-2xl font-heading font-extrabold text-rose-600 tabular-nums tracking-tight">
                    Rp {new Intl.NumberFormat("id-ID").format(liveGrandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Apakah Anda yakin ingin mereset seluruh isian form?")) {
                reset();
              }
            }}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Reset Form
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs hover:shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Menyimpan ke Google Sheets...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>Simpan {fields.length} Barang ke Database</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
