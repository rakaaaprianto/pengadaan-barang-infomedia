"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  QrCode,
  Truck,
  CheckCircle2,
  Calendar,
  User,
  MapPin,
  FileText,
  Loader2,
  AlertCircle,
  Tag,
  UploadCloud,
  ExternalLink,
  Trash2,
  Paperclip,
} from "lucide-react";
import { format } from "date-fns";
import { DashboardSummary } from "@/lib/sheets/types";

type TransactionItem = DashboardSummary["transactions"][number];

interface UpdateTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
  onSuccess: () => void;
}

export function UpdateTrackingModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: UpdateTrackingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [tanggalTerimaBarcode, setTanggalTerimaBarcode] = useState("");
  const [tanggalProsesBarcode, setTanggalProsesBarcode] = useState("");
  const [tanggalKirimBarang, setTanggalKirimBarang] = useState("");
  const [userPemakai, setUserPemakai] = useState("");
  const [tujuanPengiriman, setTujuanPengiriman] = useState("");
  const [prosesStatus, setProsesStatus] = useState("Diterima");
  const [keterangan, setKeterangan] = useState("");
  const [evidenceBaUrl, setEvidenceBaUrl] = useState("");
  const [evidenceBaFileName, setEvidenceBaFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setTanggalTerimaBarcode(transaction.tanggalTerimaBarcode || "");
      setTanggalProsesBarcode(transaction.tanggalProsesBarcode || "");
      setTanggalKirimBarang(transaction.tanggalKirimBarang || "");
      setUserPemakai(transaction.userPemakai || "");
      setTujuanPengiriman(transaction.tujuanPengiriman || "");
      setProsesStatus(transaction.prosesStatus || "Diterima");
      setKeterangan(transaction.keterangan || "");
      setEvidenceBaUrl(transaction.evidenceBaUrl || "");
      setEvidenceBaFileName(transaction.evidenceBaFileName || "");
      setError(null);
      setSuccessMsg(null);
      setUploadError(null);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sheetName", transaction.sheetName);
      formData.append("rowNumber", String(transaction.rowNumber));

      const res = await fetch("/api/upload-evidence", {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.message || "Gagal mengunggah berkas evidence");
      }

      setEvidenceBaUrl(resData.data.fileUrl);
      setEvidenceBaFileName(resData.data.originalName || file.name);

      // Jika ada file BA diunggah, otomatis sarankan status menjadi Selesai (atau Siap Kirim)
      if (prosesStatus === "Diterima" || prosesStatus === "Proses Labeling") {
        setProsesStatus("Selesai");
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setUploadError(errorObj.message || "Terjadi kesalahan saat mengunggah berkas");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        sheetName: transaction.sheetName,
        rowNumber: transaction.rowNumber,
        tanggalTerimaBarcode,
        tanggalProsesBarcode,
        tanggalKirimBarang,
        userPemakai,
        tujuanPengiriman,
        prosesStatus,
        keterangan,
        evidenceBaUrl,
        evidenceBaFileName,
      };

      const res = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan pembaruan status proses.");
      }

      setSuccessMsg(data.message || "Status proses berhasil diperbarui!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Terjadi kesalahan saat menyimpan status proses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-linear-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-600/30 border border-rose-500/40 rounded-xl text-rose-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
                Pembaruan Sub Proses Operasional
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 border border-slate-600">
                  {transaction.sheetName} &bull; Baris {transaction.rowNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Kelola Sub Proses Labeling (Barcode) dan Sub Proses Distribusi/Pengiriman
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors focus:outline-hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Item Context Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                  Identitas Aset Terdata
                </span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {transaction.namaBarang}
                </h3>
              </div>
              <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                {transaction.jumlah} {transaction.satuan} &bull; {transaction.anggaran}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-slate-600 border-t border-slate-200/60">
              <div>
                <span className="text-slate-400 block text-[10px]">Nomor DO / SJ:</span>
                <span className="font-medium text-slate-800">{transaction.nomorDo || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Mitra / Vendor:</span>
                <span className="font-medium text-slate-800 truncate block">{transaction.namaMitra}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tgl Terima Vendor:</span>
                <span className="font-medium text-slate-800">{transaction.tanggalTerimaBarang || "-"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">PIC Pemohon:</span>
                <span className="font-medium text-slate-800">{transaction.pic || "-"}</span>
              </div>
            </div>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SUB-PROSES 1: LABELING BARCODE */}
          <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    1. Sub Proses Labeling (Barcode)
                  </h4>
                  <p className="text-[11px] text-slate-500">Penerimaan fisik barcode cetak dan penempelan pada fisik aset</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Tanggal Terima Barcode
                </label>
                <input
                  type="date"
                  value={tanggalTerimaBarcode}
                  onChange={(e) => {
                    setTanggalTerimaBarcode(e.target.value);
                    if (prosesStatus === "Diterima" && e.target.value) {
                      setProsesStatus("Proses Labeling");
                    }
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTanggalTerimaBarcode(todayStr);
                    if (prosesStatus === "Diterima") setProsesStatus("Proses Labeling");
                  }}
                  className="mt-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  + Isi Hari Ini
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  Tanggal Selesai Barcode (Tgl Proses)
                </label>
                <input
                  type="date"
                  value={tanggalProsesBarcode}
                  onChange={(e) => {
                    setTanggalProsesBarcode(e.target.value);
                    if (e.target.value && (prosesStatus === "Diterima" || prosesStatus === "Proses Labeling")) {
                      setProsesStatus("Siap Kirim");
                    }
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTanggalProsesBarcode(todayStr);
                    if (!tanggalTerimaBarcode) setTanggalTerimaBarcode(todayStr);
                    if (prosesStatus === "Diterima" || prosesStatus === "Proses Labeling") setProsesStatus("Siap Kirim");
                  }}
                  className="mt-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  + Selesai Labeling Hari Ini
                </button>
              </div>
            </div>
          </div>

          {/* SUB-PROSES 2: PENGIRIMAN & DISTRIBUSI */}
          <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/30 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  2. Sub Proses Pengiriman (Distribusi Barang)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Pendistribusian dan serah terima aset kepada user pemakai / unit tujuan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Tanggal Kirim Barang
                </label>
                <input
                  type="date"
                  value={tanggalKirimBarang}
                  onChange={(e) => {
                    setTanggalKirimBarang(e.target.value);
                    if (e.target.value) setProsesStatus("Selesai");
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTanggalKirimBarang(todayStr);
                    setProsesStatus("Selesai");
                  }}
                  className="mt-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer"
                >
                  + Kirim Hari Ini
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  User Pemakai (PIC Penerima)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. Hendra / Bu Sari"
                  value={userPemakai}
                  onChange={(e) => setUserPemakai(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Tujuan / Lokasi Distribusi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gedung A Lt. 3 / Divisi IT"
                  value={tujuanPengiriman}
                  onChange={(e) => setTujuanPengiriman(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-800"
                />
              </div>
            </div>

            {/* EVIDENCE BA PENGELUARAN (TTD PM & FAM) */}
            <div className="pt-3 border-t border-emerald-200/60 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-rose-600" />
                  Evidence BA Pengeluaran (Sudah TTD PM & FAM)
                </label>
                <span className="text-[11px] text-slate-400">PDF, JPG, PNG (Maks. 15MB)</span>
              </div>

              {evidenceBaUrl ? (
                <div className="p-3 bg-white border border-emerald-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                          {evidenceBaFileName || "Evidence_BA_Pengeluaran.pdf"}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Terlampir
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">
                        Bukti tanda tangan PM & FAM siap ditinjau
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <a
                      href={evidenceBaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Lihat Berkas</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setEvidenceBaUrl("");
                        setEvidenceBaFileName("");
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus Lampiran"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-center gap-2.5 bg-white cursor-pointer transition-colors group">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="hidden"
                    />
                    {isUploading ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 py-1">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Mengunggah berkas evidence...</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-2 bg-slate-100 group-hover:bg-emerald-50 text-slate-600 group-hover:text-emerald-700 rounded-lg transition-colors">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div className="text-center sm:text-left">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block">
                            Pilih atau Drag & Drop Berkas BA (PDF)
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            Lampirkan Form Pengeluaran Perangkat Project yang sudah bertanda tangan PM & FAM
                          </span>
                        </div>
                      </>
                    )}
                  </label>
                  {uploadError && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {uploadError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* STATUS & CATATAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Alur Proses
              </label>
              <select
                value={prosesStatus}
                onChange={(e) => setProsesStatus(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800 font-medium"
              >
                <option value="Diterima">Diterima (Menunggu Barcode)</option>
                <option value="Proses Labeling">Proses Labeling (Sedang Diproses)</option>
                <option value="Siap Kirim">Siap Kirim (Barcode Selesai)</option>
                <option value="Selesai">Selesai (Terkirim / Done)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Pilih status terkini untuk pelacakan alur aset.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Catatan / Keterangan Tambahan
              </label>
              <input
                type="text"
                placeholder="Catatan kendala, serial number, atau detail serah terima..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan ke Spreadsheet...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
