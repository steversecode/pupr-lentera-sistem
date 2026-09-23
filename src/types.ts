/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum RoadCondition {
  MANTAP = "Mantap",
  SEDANG = "Sedang",
  RUSAK_RINGAN = "Rusak Ringan",
  RUSAK_BERAT = "Rusak Berat"
}

export enum SurfaceType {
  ASPHALT = "Aspal",
  HOTMIX_AC_WC = "Hotmix AC-WC",
  HOTMIX_AC_BC = "Hotmix AC-BC",
  RIGID_PAVEMENT = "Rigid Pavement",
  TELFORD = "Telford / Makadam"
}

export interface RoadSegment {
  id: string;
  code: string;
  name: string;
  district: string; // e.g. "Kota Kupang", "Kab. Sikka", "Kab. Manggarai Barat", "Kab. Timor Tengah Selatan"
  kecamatan: string; // e.g. "Kec. Oebobo"
  lengthKm: number;
  widthM: number;
  surfaceType: SurfaceType;
  condition: RoadCondition;
  constYear: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  description?: string;
  lastUpdated: string; // Date string
  surveyor: string;
  path?: [number, number][]; // Array of [lat, lng] coordinates representing the road curve
}

export interface MaintenanceActivity {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  iconType: "construction" | "survey" | "task_alt";
  date: string;
}

export interface LegerDocument {
  id: string;
  segmentId: string;
  type: "kartu_leger" | "sertifikat_jalan";
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  uploadedBy: string;
  documentNo: string;
  issueDate: string;
  status: "Pending" | "Tervalidasi" | "Ditolak";
  notes?: string;
  fileUrl?: string; // Simulated URL or base64
}

export interface GuidelineDocument {
  id: string;
  title: string;
  documentNo: string;
  year: string;
  category: "Undang-Undang" | "Peraturan Menteri" | "Keputusan Gubernur" | "Panduan Teknis" | "SOP" | "Lainnya";
  publisher: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  summary: string;
  isOfficial: boolean;
  fileUrl?: string;
}

export type UtilityType =
  | "Listrik (PLN)"
  | "Telekomunikasi / Fiber Optik"
  | "Air Bersih (PDAM)"
  | "Saluran Gas / BBM"
  | "Gorong-gorong Utilitas"
  | "Lainnya";

export type UtilityPosition =
  | "Bawah Tanah (Underground)"
  | "Atas Tanah / Udara (Overhead)"
  | "Menyeberang Jalan (Crossing)"
  | "Bahu Jalan (Shoulder)";

export type UtilityStatus =
  | "Aktif (Izin Berlaku)"
  | "Dalam Proses Izin"
  | "Masa Berlaku Habis"
  | "Tanpa Izin (Ilegal)";

export interface UtilityInventoryItem {
  id: string;
  code: string; // e.g. "UTL-PLN-001"
  providerName: string; // e.g. "PT PLN (Persero) UIW NTT"
  utilityType: UtilityType;
  segmentId: string; // reference to road segment ID
  segmentName: string;
  district: string;
  lengthUsedMeter: number; // Panjang penggunaan ruang milik jalan (dalam meter)
  position: UtilityPosition;
  status: UtilityStatus;
  installYear: number;
  description?: string;
  lastChecked: string;
}

export interface UtilityRetributionItem {
  id: string;
  invoiceNo: string; // e.g. "RET/2026/07/001"
  utilityId?: string; // link to inventory item ID if applicable
  providerName: string;
  utilityType: string;
  segmentName: string;
  lengthUsedMeter: number; // Panjang penggunaan (meter)
  ratePerMeterYear: number; // Tarif dasar (Rp / meter / tahun)
  durationYears: number; // Durasi (Tahun)
  locationIndex: number; // Koefisien / Indeks Lokasi
  totalRetributionRp: number; // Hasil hitung: length * rate * duration * index
  status: "Belum Dibayar" | "Lunas" | "Jatuh Tempo";
  issueDate: string;
  dueDate: string;
  notes?: string;
}

export interface UtilityRequest {
  id: string;
  providerName: string;
  utilityType: UtilityType;
  segmentId: string;
  segmentName?: string;
  letterNumber: string;
  letterDate: string;
  documentUrl?: string;
  status: "Pending" | "Disetujui" | "Ditolak";
  notes?: string;
  uploadedBy?: string;
  uploadedAt: string;
}
