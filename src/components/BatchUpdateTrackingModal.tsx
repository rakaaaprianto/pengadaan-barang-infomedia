"use client";

import React, { useState } from "react";
import {
  X,
  Layers,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  Truck,
  QrCode,
  Clock,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { DashboardSummary } from "@/lib/sheets/types";
import { useToast } from "@/components/ui/Toast";

type TransactionItem = DashboardSummary["transactions"][number];

interface BatchUpdateTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: TransactionItem[];
  onSuccess: () => void;
}

export function BatchUpdateTrackingModal({
  isOpen,
  onClose,
  selectedItems,
  onSuccess,
}: BatchUpdateTrackingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Field states
  const [updateProsesStatus, setUpdateProsesStatus] = useState(false);
  const [prosesStatus, setProsesStatus] = useState("Proses Labeling");

  const [updateTerimaBarcode, setUpdateTerimaBarcode] = useState(false);
  const [tanggalTerimaBarcode, setTanggalTerimaBarcode] = useState("");

  const [updateProsesBarcode, setUpdateProsesBarcode] = useState(false);
  const [tanggalProsesBarcode, setTanggalProsesBarcode] = useState("");

  const [updateKirimBarang, setUpdateKirimBarang] = useState(false);
  const [tanggalKirimBarang, setTanggalKirimBarang] = useState("");

  const [updateUserPemakai, setUpdateUserPemakai] = useState(false);
  const [userPemakai, setUserPemakai] = useState("");

  const [updateTujuanPengiriman, setUpdateTujuanPengiriman] = useState(false);
  const [tujuanPengiriman, setTujuanPengiriman] = useState("");

  const [updateKeterangan, setUpdateKeterangan] = useState(false);
  const [keterangan, setKeterangan] = useState("");

  if (!isOpen || selectedItems.length === 0) return null;

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !updateProsesStatus &&
      !updateTerimaBarcode &&
      !updateProsesBarcode &&
      !updateKirimBarang &&
      !updateUserPemakai &&
      !updateTujuanPengiriman &&
      !updateKeterangan
    ) {
      setError("Silakan pilih minimal satu kolom untuk diperbarui massal.");
      return;
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: selectedItems.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      try {
        const payload: Record<string, unknown> = {
          sheetName: item.sheetName,
          rowNumber: item.rowNumber,
          tanggalTerimaBarcode: updateTerimaBarcode
            ? tanggalTerimaBarcode
            : item.tanggalTerimaBarcode || "",
          tanggalProsesBarcode: updateProsesBarcode
            ? tanggalProsesBarcode
            : item.tanggalProsesBarcode || "",
          tanggalKirimBarang: updateKirimBarang
            ? tanggalKirimBarang
            : item.tanggalKirimBarang || "",
          userPemakai: updateUserPemakai ? userPemakai : item.userPemakai || "",
          tujuanPengiriman: updateTujuanPengiriman
            ? tujuanPengiriman
            : item.tujuanPengiriman || "",
          prosesStatus: updateProsesStatus ? prosesStatus : item.prosesStatus || "Diterima",
          keterangan: updateKeterangan ? keterangan : item.keterangan || "",
          evidenceBaUrl: item.evidenceBaUrl || "",
          evidenceBaFileName: item.evidenceBaFileName || "",
        };

        const res = await fetch("/api/tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
      setProgress({ current: i + 1, total: selectedItems.length });
    }

    setLoading(false);
    setProgress(null);

    if (successCount > 0) {
      toast.success(
        `${successCount} dari ${selectedItems.length} aset berhasil diperbarui simultan ke Google Sheets!`,
        "Pembaruan Massal Berhasil"
      );
      onSuccess();
      onClose();
    } else {
      setError(`Gagal memperbarui aset. ${failCount} item gagal diproses.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-600/30 border border-rose-500/40 rounded-xl text-rose-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <span>Update Status Massal (Batch)</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-rose-600/40 text-rose-200 border border-rose-500/50">
                  {selectedItems.length} Aset Dipilih
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Centang kolom yang ingin diperbarui secara serentak untuk seluruh item yang dipilih.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleBatchSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Selected Items Preview Pill */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wide">
              Ringkasan Item Terpilih ({selectedItems.length}):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {selectedItems.map((item) => (
                <span
                  key={item.id}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium"
                >
                  {item.namaBarang} ({item.nomorDo || "No DO"})
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Options Checklist */}
          <div className="space-y-4">
            {/* Status Alur */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                <input
                  type="checkbox"
                  checked={updateProsesStatus}
                  onChange={(e) => setUpdateProsesStatus(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <Tag className="w-3.5 h-3.5 text-rose-600" />
                <span>Ubah Status Alur Proses</span>
              </label>
              {updateProsesStatus && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pl-6">
                  {["Diterima", "Proses Labeling", "Siap Kirim", "Selesai"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setProsesStatus(st)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition border text-center ${
                        prosesStatus === st
                          ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Labeling Barcode Section */}
            <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-3">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
                <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pembaruan Tahap Labeling Barcode</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 mb-1">
                    <input
                      type="checkbox"
                      checked={updateTerimaBarcode}
                      onChange={(e) => setUpdateTerimaBarcode(e.target.checked)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300"
                    />
                    <span>Tgl Terima Barcode</span>
                  </label>
                  <input
                    type="date"
                    disabled={!updateTerimaBarcode}
                    value={tanggalTerimaBarcode}
                    onChange={(e) => setTanggalTerimaBarcode(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:opacity-60"
                  />
                  {updateTerimaBarcode && (
                    <button
                      type="button"
                      onClick={() => setTanggalTerimaBarcode(todayStr)}
                      className="mt-1 text-[10px] text-indigo-600 hover:underline"
                    >
                      + Hari Ini
                    </button>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 mb-1">
                    <input
                      type="checkbox"
                      checked={updateProsesBarcode}
                      onChange={(e) => setUpdateProsesBarcode(e.target.checked)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300"
                    />
                    <span>Tgl Selesai Barcode</span>
                  </label>
                  <input
                    type="date"
                    disabled={!updateProsesBarcode}
                    value={tanggalProsesBarcode}
                    onChange={(e) => setTanggalProsesBarcode(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:opacity-60"
                  />
                  {updateProsesBarcode && (
                    <button
                      type="button"
                      onClick={() => setTanggalProsesBarcode(todayStr)}
                      className="mt-1 text-[10px] text-indigo-600 hover:underline"
                    >
                      + Hari Ini
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Pengiriman & Distribusi Section */}
            <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-3">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pembaruan Tahap Distribusi & Serah Terima</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-2">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 mb-1">
                    <input
                      type="checkbox"
                      checked={updateKirimBarang}
                      onChange={(e) => setUpdateKirimBarang(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300"
                    />
                    <span>Tgl Kirim Barang</span>
                  </label>
                  <input
                    type="date"
                    disabled={!updateKirimBarang}
                    value={tanggalKirimBarang}
                    onChange={(e) => setTanggalKirimBarang(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:opacity-60"
                  />
                  {updateKirimBarang && (
                    <button
                      type="button"
                      onClick={() => setTanggalKirimBarang(todayStr)}
                      className="mt-1 text-[10px] text-emerald-600 hover:underline"
                    >
                      + Hari Ini
                    </button>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 mb-1">
                    <input
                      type="checkbox"
                      checked={updateUserPemakai}
                      onChange={(e) => setUpdateUserPemakai(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300"
                    />
                    <span>User Pemakai</span>
                  </label>
                  <input
                    type="text"
                    disabled={!updateUserPemakai}
                    placeholder="Contoh: Tim IT / Bu Sari"
                    value={userPemakai}
                    onChange={(e) => setUserPemakai(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 mb-1">
                    <input
                      type="checkbox"
                      checked={updateTujuanPengiriman}
                      onChange={(e) => setUpdateTujuanPengiriman(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300"
                    />
                    <span>Tujuan Lokasi</span>
                  </label>
                  <input
                    type="text"
                    disabled={!updateTujuanPengiriman}
                    placeholder="Contoh: Gedung A Lt. 3"
                    value={tujuanPengiriman}
                    onChange={(e) => setTujuanPengiriman(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Keterangan */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                <input
                  type="checkbox"
                  checked={updateKeterangan}
                  onChange={(e) => setUpdateKeterangan(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300"
                />
                <span>Ubah Keterangan</span>
              </label>
              {updateKeterangan && (
                <div className="pl-6 pt-1">
                  <input
                    type="text"
                    placeholder="Catatan baru untuk seluruh aset yang dipilih..."
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          {loading && progress && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  <span>Sedang memperbarui transaksi ke Sheets...</span>
                </span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-rose-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-600 transition-all duration-200"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses ({progress?.current || 0}/{selectedItems.length})...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Terapkan ke {selectedItems.length} Aset</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
