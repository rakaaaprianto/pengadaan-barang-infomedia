import { z } from "zod";

export const ANGGARAN_OPTIONS = ["Capex", "Opex", "Capex/Opex"] as const;
export type AnggaranType = (typeof ANGGARAN_OPTIONS)[number];

// Skema untuk satu item barang
export const assetItemSchema = z.object({
  namaBarang: z
    .string()
    .trim()
    .min(1, "Nama barang & spesifikasi wajib diisi"),

  hargaSatuan: z.coerce
    .number()
    .positive("Harga satuan harus lebih besar dari 0"),

  jumlah: z.coerce
    .number()
    .int("Jumlah harus berupa bilangan bulat")
    .positive("Jumlah harus minimal 1"),

  satuan: z
    .string()
    .trim()
    .min(1, "Satuan wajib diisi (contoh: Unit, Pcs, Set)"),

  totalHarga: z.coerce.number().optional().default(0),
});

export type AssetItem = z.infer<typeof assetItemSchema>;

// Skema untuk form registrasi pengadaan asset (1 surat jalan / DO bisa berisi beberapa barang)
export const assetRegisterSchema = z.object({
  tanggalTerimaBarang: z
    .string()
    .min(1, "Tanggal terima barang wajib diisi"),
  
  nomorDo: z.string().optional().default(""),

  namaMitra: z
    .string()
    .trim()
    .min(1, "Nama mitra wajib diisi"),

  isNewMitra: z.boolean().optional().default(false),

  namaProject: z
    .string()
    .trim()
    .min(1, "Nama project wajib diisi"),

  pic: z
    .string()
    .trim()
    .min(1, "PIC wajib diisi"),

  internalOrder: z.string().optional().default(""),

  costCenter: z.string().optional().default(""),

  anggaran: z.enum(ANGGARAN_OPTIONS),

  items: z
    .array(assetItemSchema)
    .min(1, "Minimal harus ada 1 jenis barang"),

  keterangan: z.string().optional().default(""),

  totalHargaGabungan: z.coerce.number().optional().default(0),
});

export type AssetRegisterInput = z.infer<typeof assetRegisterSchema>;

// Skema untuk data baris transaksi yang tersimpan di Google Sheets
export interface TransactionRow {
  no: number;
  tanggalTerimaBarang: string;
  nomorDo: string;
  namaMitra: string;
  namaBarang: string;
  namaProject: string;
  pic: string;
  internalOrder: string;
  costCenter: string;
  hargaSatuan: number;
  jumlah: number;
  satuan: string;
  anggaran: AnggaranType;
  totalHarga: number;
  keterangan?: string;
  rowNumber?: number;
  tanggalTerimaBarcode?: string;
  tanggalProsesBarcode?: string;
  tanggalKirimBarang?: string;
  userPemakai?: string;
  tujuanPengiriman?: string;
  prosesStatus?: string;
  evidenceBaUrl?: string;
  evidenceBaFileName?: string;
}

// Skema untuk update status proses labeling dan pengiriman
export const trackingUpdateSchema = z.object({
  sheetName: z.string().min(1, "Nama sheet wajib diisi"),
  rowNumber: z.coerce.number().int().min(2, "Nomor baris sheet minimal 2"),
  keterangan: z.string().optional().default(""),
  tanggalTerimaBarcode: z.string().optional().default(""),
  tanggalProsesBarcode: z.string().optional().default(""),
  tanggalKirimBarang: z.string().optional().default(""),
  userPemakai: z.string().optional().default(""),
  tujuanPengiriman: z.string().optional().default(""),
  prosesStatus: z.string().optional().default("Diterima"),
  evidenceBaUrl: z.string().optional().default(""),
  evidenceBaFileName: z.string().optional().default(""),
});

export type TrackingUpdateInput = z.infer<typeof trackingUpdateSchema>;
