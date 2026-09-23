export interface MasterIOItem {
  code: string;
  description: string;
  status: string;
  costCenter: string;
  department: string;
  division: string;
  directorate: string;
  profitCenterName: string;
}

export interface MasterCostCenterItem {
  code: string;
  name: string;
  division: string;
  directorate: string;
}

export interface MasterMitraItem {
  name: string;
  addedByForm?: string;
  addedAt?: string;
}

export interface MasterDataResponse {
  mitra: string[];
  internalOrders: Array<{
    code: string;
    description: string;
    costCenter: string;
  }>;
  costCenters: Array<{
    code: string;
    name: string;
    division: string;
    directorate: string;
  }>;
}

export interface DashboardSummary {
  totalPurchaseAmount: number;
  totalItems: number;
  totalTransactions: number;
  uniqueMitraCount: number;
  capexTotal: number;
  opexTotal: number;
  capexOpexTotal: number;
  capexPercentage: number;
  opexPercentage: number;
  monthlyTrend: Array<{
    month: string;
    year: number;
    label: string;
    totalAmount: number;
    transactionCount: number;
    capexAmount: number;
    opexAmount: number;
  }>;
  topMitra: Array<{
    name: string;
    totalAmount: number;
    itemCount: number;
    transactionCount: number;
  }>;
  transactions: Array<{
    id: string;
    no: number;
    sheetName: string;
    rowNumber: number;
    tanggalTerimaBarang: string;
    nomorDo: string;
    namaMitra: string;
    namaBarang: string;
    namaProject: string;
    pic: string;
    internalOrder: string;
    internalOrderName?: string;
    costCenter: string;
    costCenterName?: string;
    hargaSatuan: number;
    jumlah: number;
    satuan: string;
    anggaran: string;
    totalHarga: number;
    keterangan?: string;
    tanggalTerimaBarcode?: string;
    tanggalProsesBarcode?: string;
    tanggalKirimBarang?: string;
    userPemakai?: string;
    tujuanPengiriman?: string;
    prosesStatus?: string;
    evidenceBaUrl?: string;
    evidenceBaFileName?: string;
  }>;
}
