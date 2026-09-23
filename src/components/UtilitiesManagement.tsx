/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { useRoads } from "../context/RoadContext";
import { useAuth } from "../context/AuthContext";
import {
  UtilityInventoryItem,
  UtilityRetributionItem,
  UtilityType,
  UtilityPosition,
  UtilityStatus,
} from "../types";
import {
  Wrench,
  Layers,
  Coins,
  Calculator,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  Download,
  ArrowRight,
  Shield,
  MapPin,
  Building2,
  FileText,
  RefreshCw,
  X,
  Check,
  DollarSign,
  TrendingUp,
  HelpCircle,
  Eye,
} from "lucide-react";
import { confirmDialog } from "../lib/swal";

// ─── Default Initial Inventory Data ──────────────────────────────────────────
const INITIAL_INVENTORY_DATA: UtilityInventoryItem[] = [
  {
    id: "utl-1",
    code: "UTL-PLN-001",
    providerName: "PT PLN (Persero) UIW NTT",
    utilityType: "Listrik (PLN)",
    segmentId: "seg-1",
    segmentName: "Jl. Yos Sudarso",
    district: "Kota Kupang",
    lengthUsedMeter: 3890,
    position: "Atas Tanah / Udara (Overhead)",
    status: "Aktif (Izin Berlaku)",
    installYear: 2021,
    description: "Jaringan tegangan menengah (JTM) 20 kV di sisi kiri dan kanan jalan menuju kawasan pelabuhan.",
    lastChecked: "15 Jan 2026",
  },
  {
    id: "utl-2",
    code: "UTL-TLK-002",
    providerName: "PT Telkom Indonesia (Witel Kupang)",
    utilityType: "Telekomunikasi / Fiber Optik",
    segmentId: "seg-2",
    segmentName: "Sp. Patung Sonbai - Sp. Tiga Bundaran Oebufu",
    district: "Kota Kupang",
    lengthUsedMeter: 5100,
    position: "Bawah Tanah (Underground)",
    status: "Aktif (Izin Berlaku)",
    installYear: 2022,
    description: "Kabel serat optik (FO) bawah tanah metode boring / HDD di bawah bahu jalan raya.",
    lastChecked: "10 Feb 2026",
  },
  {
    id: "utl-3",
    code: "UTL-PDM-003",
    providerName: "PDAM Tirta Lontar Kab. Sikka",
    utilityType: "Air Bersih (PDAM)",
    segmentId: "seg-3",
    segmentName: "Koro (Bts. Kab. Ende) - Maumere",
    district: "Kab. Sikka",
    lengthUsedMeter: 4500,
    position: "Bawah Tanah (Underground)",
    status: "Aktif (Izin Berlaku)",
    installYear: 2020,
    description: "Pipa transmisi air bersih PVC berdiameter 8 inci di sepanjang sisi utara jalan provinsi.",
    lastChecked: "20 Des 2025",
  },
  {
    id: "utl-4",
    code: "UTL-BIZ-004",
    providerName: "PT Biznet Networks NTT",
    utilityType: "Telekomunikasi / Fiber Optik",
    segmentId: "seg-4",
    segmentName: "Soe - Kapan",
    district: "Kab. Timor Tengah Selatan",
    lengthUsedMeter: 2800,
    position: "Atas Tanah / Udara (Overhead)",
    status: "Dalam Proses Izin",
    installYear: 2024,
    description: "Pemasangan tiang tumpu dan kabel fiber optik untuk perluasan jaringan broadband pedesaan.",
    lastChecked: "05 Feb 2026",
  },
  {
    id: "utl-5",
    code: "UTL-PGN-005",
    providerName: "PT Pertamina Gas / Depot BBM Ende",
    utilityType: "Saluran Gas / BBM",
    segmentId: "seg-7",
    segmentName: "Detusoko - Maurole",
    district: "Kab. Ende",
    lengthUsedMeter: 1200,
    position: "Menyeberang Jalan (Crossing)",
    status: "Aktif (Izin Berlaku)",
    installYear: 2023,
    description: "Pipa penyaluran bahan bakar melintas di bawah struktur gorong-gorong beton oprit jembatan.",
    lastChecked: "28 Jan 2026",
  },
  {
    id: "utl-6",
    code: "UTL-KOM-006",
    providerName: "Dinas Kominfo Provinsi NTT",
    utilityType: "Gorong-gorong Utilitas",
    segmentId: "seg-5",
    segmentName: "Hepang - Sikka",
    district: "Kab. Sikka",
    lengthUsedMeter: 850,
    position: "Bawah Tanah (Underground)",
    status: "Aktif (Izin Berlaku)",
    installYear: 2022,
    description: "Box culvert / ducting terpadu milik pemerintah provinsi untuk penempatan kabel fiber optik bersama.",
    lastChecked: "12 Jan 2026",
  },
];

// ─── Default Initial Retribution Data ────────────────────────────────────────
const INITIAL_RETRIBUTION_DATA: UtilityRetributionItem[] = [
  {
    id: "ret-1",
    invoiceNo: "RET/2026/01/001",
    utilityId: "utl-1",
    providerName: "PT PLN (Persero) UIW NTT",
    utilityType: "Listrik (PLN)",
    segmentName: "Jl. Yos Sudarso",
    lengthUsedMeter: 3890,
    ratePerMeterYear: 10000,
    durationYears: 1,
    locationIndex: 1.25,
    totalRetributionRp: 48625000, // 3890 * 10000 * 1 * 1.25
    status: "Lunas",
    issueDate: "05 Jan 2026",
    dueDate: "05 Mar 2026",
    notes: "Pembayaran retribusi tahunan pemanfaatan Rumija jalan utama perkotaan telah diterima via Kas Daerah.",
  },
  {
    id: "ret-2",
    invoiceNo: "RET/2026/01/002",
    utilityId: "utl-2",
    providerName: "PT Telkom Indonesia (Witel Kupang)",
    utilityType: "Telekomunikasi / Fiber Optik",
    segmentName: "Sp. Patung Sonbai - Sp. Tiga Bundaran Oebufu",
    lengthUsedMeter: 5100,
    ratePerMeterYear: 10000,
    durationYears: 1,
    locationIndex: 1.5,
    totalRetributionRp: 76500000, // 5100 * 10000 * 1 * 1.5 (Bawah tanah komersial)
    status: "Belum Dibayar",
    issueDate: "10 Jan 2026",
    dueDate: "10 Apr 2026",
    notes: "Tagihan diterbitkan untuk masa pemanfaatan tahun anggaran 2026. Menunggu konfirmasi pembayaran.",
  },
  {
    id: "ret-3",
    invoiceNo: "RET/2025/11/014",
    utilityId: "utl-3",
    providerName: "PDAM Tirta Lontar Kab. Sikka",
    utilityType: "Air Bersih (PDAM)",
    segmentName: "Koro (Bts. Kab. Ende) - Maumere",
    lengthUsedMeter: 4500,
    ratePerMeterYear: 5000,
    durationYears: 1,
    locationIndex: 1.0,
    totalRetributionRp: 22500000, // 4500 * 5000 * 1 * 1.0
    status: "Lunas",
    issueDate: "15 Nov 2025",
    dueDate: "15 Jan 2026",
    notes: "Lunas via transfer Bank NTT. Bukti setor STS-2025-1192.",
  },
  {
    id: "ret-4",
    invoiceNo: "RET/2025/12/008",
    utilityId: "utl-4",
    providerName: "PT Biznet Networks NTT",
    utilityType: "Telekomunikasi / Fiber Optik",
    segmentName: "Soe - Kapan",
    lengthUsedMeter: 2800,
    ratePerMeterYear: 5000,
    durationYears: 1,
    locationIndex: 1.0,
    totalRetributionRp: 14000000, // 2800 * 5000 * 1 * 1.0
    status: "Jatuh Tempo",
    issueDate: "01 Des 2025",
    dueDate: "31 Jan 2026",
    notes: "Telah melewati tanggal jatuh tempo 31 Jan 2026. Surat peringatan pertama telah dikirimkan.",
  },
];

export const UtilitiesManagement: React.FC = () => {
  const { segments, showToast } = useRoads();
  const { appRole } = useAuth();
  const isAdmin = appRole === "admin";

  // Active sub-menu tab: 'inventory' | 'retribution'
  const [activeSubTab, setActiveSubTab] = useState<"inventory" | "retribution">("inventory");

  // Persisted state via localStorage or fallback to default
  const [inventoryList, setInventoryList] = useState<UtilityInventoryItem[]>(() => {
    const saved = localStorage.getItem("lentera_utility_inventory");
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY_DATA;
  });

  const [retributionList, setRetributionList] = useState<UtilityRetributionItem[]>(() => {
    const saved = localStorage.getItem("lentera_utility_retribution");
    return saved ? JSON.parse(saved) : INITIAL_RETRIBUTION_DATA;
  });

  useEffect(() => {
    localStorage.setItem("lentera_utility_inventory", JSON.stringify(inventoryList));
  }, [inventoryList]);

  useEffect(() => {
    localStorage.setItem("lentera_utility_retribution", JSON.stringify(retributionList));
  }, [retributionList]);

  // ─── Inventory Filter State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterDistrict, setFilterDistrict] = useState<string>("All");

  // ─── Modal State: Add/Edit Inventory ───────────────────────────────────────
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingInvItem, setEditingInvItem] = useState<UtilityInventoryItem | null>(null);
  const [invForm, setInvForm] = useState<{
    code: string;
    providerName: string;
    utilityType: UtilityType;
    segmentId: string;
    position: UtilityPosition;
    lengthUsedMeter: number | string;
    status: UtilityStatus;
    installYear: number | string;
    description: string;
  }>({
    code: "",
    providerName: "",
    utilityType: "Listrik (PLN)",
    segmentId: segments[0]?.id || "seg-1",
    position: "Atas Tanah / Udara (Overhead)",
    lengthUsedMeter: 1000,
    status: "Aktif (Izin Berlaku)",
    installYear: 2025,
    description: "",
  });

  // ─── Modal State: Quick Edit Length Only ───────────────────────────────────
  const [quickEditModal, setQuickEditModal] = useState<{
    isOpen: boolean;
    item: UtilityInventoryItem | null;
    newLength: number | string;
  }>({ isOpen: false, item: null, newLength: "" });

  // ─── Retribution Calculator State ──────────────────────────────────────────
  const [calcMode, setCalcMode] = useState<"from_inventory" | "manual">("from_inventory");
  const [selectedInvId, setSelectedInvId] = useState<string>(inventoryList[0]?.id || "");
  const [calcManualProvider, setCalcManualProvider] = useState("");
  const [calcManualSegment, setCalcManualSegment] = useState("");
  const [calcManualType, setCalcManualType] = useState<UtilityType>("Telekomunikasi / Fiber Optik");
  const [calcLengthMeter, setCalcLengthMeter] = useState<number | string>(inventoryList[0]?.lengthUsedMeter || 1000);
  const [calcRateRp, setCalcRateRp] = useState<number | string>(5000); // Rp/meter/tahun
  const [calcDurationYears, setCalcDurationYears] = useState<number | string>(1);
  const [calcLocationIndex, setCalcLocationIndex] = useState<number | string>(1.0);
  const [calcNotes, setCalcNotes] = useState("");

  // ─── Retribution Filter State ──────────────────────────────────────────────
  const [retSearchQuery, setRetSearchQuery] = useState("");
  const [retFilterStatus, setRetFilterStatus] = useState<string>("All");

  // ─── Modal State: Invoice Print Preview ────────────────────────────────────
  const [printInvoice, setPrintInvoice] = useState<UtilityRetributionItem | null>(null);

  // When selected inventory item changes in calculator, prefill parameters
  useEffect(() => {
    if (calcMode === "from_inventory" && selectedInvId) {
      const found = inventoryList.find((i) => i.id === selectedInvId);
      if (found) {
        setCalcLengthMeter(found.lengthUsedMeter);
        // Autoselect rate preset based on position / type
        if (found.position.includes("Bawah Tanah")) {
          setCalcRateRp(10000);
          setCalcLocationIndex(1.25);
        } else {
          setCalcRateRp(5000);
          setCalcLocationIndex(1.0);
        }
      }
    }
  }, [selectedInvId, calcMode, inventoryList]);

  // ─── Computed Inventory Statistics ─────────────────────────────────────────
  const totalLengthMeter = useMemo(() => {
    return inventoryList.reduce((sum, item) => sum + (Number(item.lengthUsedMeter) || 0), 0);
  }, [inventoryList]);

  const uniqueProvidersCount = useMemo(() => {
    const providers = new Set(inventoryList.map((i) => i.providerName.trim()));
    return providers.size;
  }, [inventoryList]);

  const activePermissionsCount = useMemo(() => {
    return inventoryList.filter((i) => i.status.includes("Aktif")).length;
  }, [inventoryList]);

  // ─── Filtered Inventory List ───────────────────────────────────────────────
  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !searchQuery ||
        item.code.toLowerCase().includes(q) ||
        item.providerName.toLowerCase().includes(q) ||
        item.segmentName.toLowerCase().includes(q) ||
        item.utilityType.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q);

      const matchType = filterType === "All" || item.utilityType === filterType;
      const matchStatus = filterStatus === "All" || item.status === filterStatus;
      const matchDistrict = filterDistrict === "All" || item.district === filterDistrict;

      return matchQuery && matchType && matchStatus && matchDistrict;
    });
  }, [inventoryList, searchQuery, filterType, filterStatus, filterDistrict]);

  // ─── Computed Retribution Statistics ───────────────────────────────────────
  const retributionStats = useMemo(() => {
    let totalPotential = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalOverdue = 0;

    retributionList.forEach((item) => {
      const val = Number(item.totalRetributionRp) || 0;
      totalPotential += val;
      if (item.status === "Lunas") totalPaid += val;
      if (item.status === "Belum Dibayar") totalUnpaid += val;
      if (item.status === "Jatuh Tempo") totalOverdue += val;
    });

    return { totalPotential, totalPaid, totalUnpaid, totalOverdue };
  }, [retributionList]);

  // ─── Live Retribution Calculation Result ───────────────────────────────────
  const calculatedRetributionRp = useMemo(() => {
    const len = Number(calcLengthMeter) || 0;
    const rate = Number(calcRateRp) || 0;
    const dur = Number(calcDurationYears) || 0;
    const idx = Number(calcLocationIndex) || 0;
    return Math.round(len * rate * dur * idx);
  }, [calcLengthMeter, calcRateRp, calcDurationYears, calcLocationIndex]);

  // ─── Filtered Retribution List ─────────────────────────────────────────────
  const filteredRetributions = useMemo(() => {
    return retributionList.filter((item) => {
      const q = retSearchQuery.toLowerCase();
      const matchQuery =
        !retSearchQuery ||
        item.invoiceNo.toLowerCase().includes(q) ||
        item.providerName.toLowerCase().includes(q) ||
        item.segmentName.toLowerCase().includes(q) ||
        item.utilityType.toLowerCase().includes(q);

      const matchStatus = retFilterStatus === "All" || item.status === retFilterStatus;

      return matchQuery && matchStatus;
    });
  }, [retributionList, retSearchQuery, retFilterStatus]);

  // ─── Handlers: Add / Edit Inventory ────────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingInvItem(null);
    const newCode = `UTL-${Math.floor(100 + Math.random() * 900)}`;
    setInvForm({
      code: newCode,
      providerName: "",
      utilityType: "Listrik (PLN)",
      segmentId: segments[0]?.id || "seg-1",
      position: "Atas Tanah / Udara (Overhead)",
      lengthUsedMeter: 1000,
      status: "Aktif (Izin Berlaku)",
      installYear: new Date().getFullYear(),
      description: "",
    });
    setIsInvModalOpen(true);
  };

  const handleOpenEditModal = (item: UtilityInventoryItem) => {
    setEditingInvItem(item);
    setInvForm({
      code: item.code,
      providerName: item.providerName,
      utilityType: item.utilityType,
      segmentId: item.segmentId,
      position: item.position,
      lengthUsedMeter: item.lengthUsedMeter,
      status: item.status,
      installYear: item.installYear,
      description: item.description || "",
    });
    setIsInvModalOpen(true);
  };

  const handleSaveInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Administrator yang dapat menambah atau mengubah inventaris utilitas.", "error");
      return;
    }
    if (!invForm.providerName.trim()) {
      showToast("Nama penyedia utilitas wajib diisi!", "error");
      return;
    }
    const len = Number(invForm.lengthUsedMeter);
    if (isNaN(len) || len <= 0) {
      showToast("Panjang penggunaan wajib berupa angka positif!", "error");
      return;
    }

    const seg = segments.find((s) => s.id === invForm.segmentId);
    const segName = seg ? seg.name : "Ruas Jalan Provinsi";
    const distName = seg ? seg.district : "Provinsi NTT";

    if (editingInvItem) {
      setInventoryList((prev) =>
        prev.map((i) =>
          i.id === editingInvItem.id
            ? {
                ...i,
                code: invForm.code || i.code,
                providerName: invForm.providerName,
                utilityType: invForm.utilityType,
                segmentId: invForm.segmentId,
                segmentName: segName,
                district: distName,
                lengthUsedMeter: len,
                position: invForm.position,
                status: invForm.status,
                installYear: Number(invForm.installYear) || i.installYear,
                description: invForm.description,
                lastChecked: new Intl.DateTimeFormat("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date()),
              }
            : i
        )
      );
      showToast(`Data utilitas "${invForm.providerName}" berhasil diperbarui!`, "success");
    } else {
      const newItem: UtilityInventoryItem = {
        id: `utl-${Date.now()}`,
        code: invForm.code || `UTL-${Math.floor(100 + Math.random() * 900)}`,
        providerName: invForm.providerName,
        utilityType: invForm.utilityType,
        segmentId: invForm.segmentId,
        segmentName: segName,
        district: distName,
        lengthUsedMeter: len,
        position: invForm.position,
        status: invForm.status,
        installYear: Number(invForm.installYear) || new Date().getFullYear(),
        description: invForm.description,
        lastChecked: new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date()),
      };
      setInventoryList((prev) => [newItem, ...prev]);
      showToast(`Utilitas baru "${invForm.providerName}" berhasil ditambahkan ke inventaris!`, "success");
    }
    setIsInvModalOpen(false);
  };

  const handleDeleteInventory = async (id: string, name: string) => {
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Administrator yang dapat menghapus data utilitas.", "error");
      return;
    }
    const confirmed = await confirmDialog({
      title: "Hapus Utilitas?",
      text: `Apakah Anda yakin ingin menghapus data "${name}" dari inventaris Rumija?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
    });
    if (confirmed) {
      setInventoryList((prev) => prev.filter((i) => i.id !== id));
      showToast(`Data utilitas "${name}" berhasil dihapus.`, "info");
    }
  };

  // ─── Handlers: Quick Edit Length Only ──────────────────────────────────────
  const handleOpenQuickEdit = (item: UtilityInventoryItem) => {
    setQuickEditModal({
      isOpen: true,
      item,
      newLength: item.lengthUsedMeter,
    });
  };

  const handleSaveQuickLength = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Administrator yang dapat mengubah data utilitas.", "error");
      return;
    }
    if (!quickEditModal.item) return;
    const val = Number(quickEditModal.newLength);
    if (isNaN(val) || val <= 0) {
      showToast("Panjang penggunaan (meter) tidak valid!", "error");
      return;
    }
    setInventoryList((prev) =>
      prev.map((i) =>
        i.id === quickEditModal.item!.id
          ? {
              ...i,
              lengthUsedMeter: val,
              lastChecked: new Intl.DateTimeFormat("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(new Date()),
            }
          : i
      )
    );
    showToast(
      `Panjang pemanfaatan untuk "${quickEditModal.item.providerName}" diperbarui menjadi ${val.toLocaleString("id-ID")} Meter!`,
      "success"
    );
    setQuickEditModal({ isOpen: false, item: null, newLength: "" });
  };

  // ─── Handlers: Retribution Calculation & Publishing ────────────────────────
  const handlePublishInvoice = () => {
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Administrator yang dapat menerbitkan tagihan retribusi.", "error");
      return;
    }
    const len = Number(calcLengthMeter);
    const rate = Number(calcRateRp);
    const dur = Number(calcDurationYears);
    const idx = Number(calcLocationIndex);

    if (!len || len <= 0 || !rate || rate <= 0) {
      showToast("Panjang penggunaan dan tarif per meter harus diisi dengan angka valid!", "error");
      return;
    }

    let provName = "";
    let segName = "";
    let uType = "";
    let uId: string | undefined = undefined;

    if (calcMode === "from_inventory") {
      const found = inventoryList.find((i) => i.id === selectedInvId);
      if (!found) {
        showToast("Pilih utilitas dari inventaris terlebih dahulu!", "error");
        return;
      }
      provName = found.providerName;
      segName = found.segmentName;
      uType = found.utilityType;
      uId = found.id;
    } else {
      if (!calcManualProvider.trim()) {
        showToast("Nama penyedia/wajib retribusi wajib diisi!", "error");
        return;
      }
      provName = calcManualProvider;
      segName = calcManualSegment || "Ruas Jalan Umum Provinsi";
      uType = calcManualType;
    }

    const newInvoice: UtilityRetributionItem = {
      id: `ret-${Date.now()}`,
      invoiceNo: `RET/2026/${String(new Date().getMonth() + 1).padStart(2, "0")}/${String(Math.floor(100 + Math.random() * 900))}`,
      utilityId: uId,
      providerName: provName,
      utilityType: uType,
      segmentName: segName,
      lengthUsedMeter: len,
      ratePerMeterYear: rate,
      durationYears: dur,
      locationIndex: idx,
      totalRetributionRp: calculatedRetributionRp,
      status: "Belum Dibayar",
      issueDate: new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
      dueDate: new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)), // +60 days
      notes: calcNotes || `Perhitungan manual retribusi Rumija untuk panjang ${len.toLocaleString("id-ID")} m (@ Rp ${rate.toLocaleString("id-ID")}/m/thn).`,
    };

    setRetributionList((prev) => [newInvoice, ...prev]);
    showToast(
      `Tagihan Retribusi No. ${newInvoice.invoiceNo} senilai Rp ${newInvoice.totalRetributionRp.toLocaleString("id-ID")} berhasil diterbitkan!`,
      "success"
    );
    // Switch scroll to table
    setTimeout(() => {
      document.getElementById("retribution-table-section")?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  const handleUpdateInvoiceStatus = (id: string, newStatus: "Belum Dibayar" | "Lunas" | "Jatuh Tempo") => {
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Administrator yang dapat mengubah status tagihan.", "error");
      return;
    }
    setRetributionList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    showToast(`Status tagihan diperbarui menjadi "${newStatus}".`, "info");
  };

  const handleDeleteInvoice = async (id: string, no: string) => {
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Administrator yang dapat menghapus tagihan.", "error");
      return;
    }
    const confirmed = await confirmDialog({
      title: "Hapus Tagihan?",
      text: `Apakah Anda yakin ingin menghapus tagihan retribusi No. ${no}?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
    });
    if (confirmed) {
      setRetributionList((prev) => prev.filter((item) => item.id !== id));
      showToast(`Tagihan No. ${no} berhasil dihapus.`, "info");
    }
  };

  // Jump from Inventory item directly to Retribution Calculator
  const handleJumpToCalculator = (item: UtilityInventoryItem) => {
    setActiveSubTab("retribution");
    setCalcMode("from_inventory");
    setSelectedInvId(item.id);
    setCalcLengthMeter(item.lengthUsedMeter);
    showToast(`Memuat data "${item.providerName}" ke Kalkulator Retribusi...`, "info");
    setTimeout(() => {
      document.getElementById("retribution-calculator-section")?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  // Helper formatting
  const formatRp = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Distinct districts from inventory
  const districtOptions = useMemo(() => {
    const s = new Set(inventoryList.map((i) => i.district));
    return Array.from(s);
  }, [inventoryList]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans space-y-8 pb-20">
      {/* ─── Page Header Banner ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Wrench className="w-3.5 h-3.5" />
              <span>Modul Operasional LENTERA</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Manajemen Utilitas Ruang Milik Jalan
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Kelola inventarisasi utilitas tertanam &amp; atas tanah pada jaringan jalan raya Provinsi NTT, serta kalkulasi otomatis retribusi pemanfaatan ruang milik jalan (Rumija).
            </p>
          </div>

          {/* Sub-menu Tabs Switcher */}
          <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80 shadow-lg shrink-0">
            <button
              onClick={() => setActiveSubTab("inventory")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 ${
                activeSubTab === "inventory"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Inventaris Utilitas</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeSubTab === "inventory" ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
              }`}>
                {inventoryList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab("retribution")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 ${
                activeSubTab === "retribution"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-[1.02]"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Retribusi Utilitas</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeSubTab === "retribution" ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
              }`}>
                {retributionList.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: INVENTARIS UTILITAS ─────────────────────────────────────── */}
      {activeSubTab === "inventory" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute right-3 bottom-3 text-white/10 group-hover:scale-110 transition-transform">
                <Layers className="w-20 h-20" />
              </div>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">Total Panjang Utilitas</p>
              <div className="text-2xl font-black tracking-tight">
                {totalLengthMeter.toLocaleString("id-ID")} <span className="text-base font-semibold">Meter</span>
              </div>
              <p className="text-[11px] text-blue-100 mt-2 flex items-center gap-1.5 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                Setara {(totalLengthMeter / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Km lintasan Rumija
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Penyedia Terdaftar
                  </p>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {uniqueProvidersCount} <span className="text-sm font-semibold text-slate-500">Perusahaan</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                PLN, Telkom, PDAM, Biznet, Pertamina...
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Titik Ruas Terpakai
                  </p>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {new Set(inventoryList.map((i) => i.segmentId)).size} <span className="text-sm font-semibold text-slate-500">Ruas Jalan</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                  <MapPin className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Tersebar di {districtOptions.length} Kabupaten / Kota
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Status Izin Aktif
                  </p>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {inventoryList.length > 0 ? Math.round((activePermissionsCount / inventoryList.length) * 100) : 0}%
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                {activePermissionsCount} dari {inventoryList.length} utilitas berizin resmi
              </p>
            </div>
          </div>

          {/* Action Bar & Search Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
              {/* Search */}
              <div className="relative min-w-[240px] flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kode, penyedia, atau ruas jalan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Filter Type */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">Semua Jenis Utilitas</option>
                <option value="Listrik (PLN)">Listrik (PLN)</option>
                <option value="Telekomunikasi / Fiber Optik">Telekomunikasi / Fiber Optik</option>
                <option value="Air Bersih (PDAM)">Air Bersih (PDAM)</option>
                <option value="Saluran Gas / BBM">Saluran Gas / BBM</option>
                <option value="Gorong-gorong Utilitas">Gorong-gorong Utilitas</option>
              </select>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">Semua Status Izin</option>
                <option value="Aktif (Izin Berlaku)">Aktif (Izin Berlaku)</option>
                <option value="Dalam Proses Izin">Dalam Proses Izin</option>
                <option value="Masa Berlaku Habis">Masa Berlaku Habis</option>
              </select>
            </div>

            {isAdmin && (
              <button
                onClick={handleOpenAddModal}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-bold shadow-md hover:shadow-lg transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Inventaris Utilitas</span>
              </button>
            )}
          </div>

          {/* Table Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                  Daftar Utilitas di Ruang Milik Jalan (Rumija)
                </h2>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full text-[11px] font-extrabold">
                  {filteredInventory.length} Data
                </span>
              </div>
              <p className="text-xs text-slate-500 italic hidden sm:block">
                *Klik ikon pensil pada kolom panjang untuk memperbarui manual pemakaian Rumija.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 dark:bg-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">Kode &amp; Penyedia</th>
                    <th className="py-3.5 px-4">Jenis &amp; Posisi</th>
                    <th className="py-3.5 px-4">Ruas Jalan &amp; Wilayah</th>
                    <th className="py-3.5 px-4 text-right">Panjang Penggunaan Rumija</th>
                    <th className="py-3.5 px-4 text-center">Tahun</th>
                    <th className="py-3.5 px-4 text-center">Status Izin</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold">Tidak ada data utilitas yang sesuai filter/pencarian.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{item.providerName}</span>
                          </div>
                          <span className="inline-block font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded mt-1 font-bold">
                            {item.code}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {item.utilityType}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {item.position}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-blue-600 dark:text-blue-400">
                            {item.segmentName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            📍 {item.district}
                          </div>
                        </td>

                        {/* Interactive Editable Length Column */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2 bg-blue-50/60 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-200/60 dark:border-blue-800 group/len hover:bg-blue-100/60 transition-all">
                            <span className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono">
                              {Number(item.lengthUsedMeter).toLocaleString("id-ID")}
                            </span>
                            <span className="text-xs font-bold text-blue-600/80">Meter</span>
                            {isAdmin && (
                              <button
                                onClick={() => handleOpenQuickEdit(item)}
                                title="Edit Manual Panjang Penggunaan"
                                className="p-1 rounded bg-white dark:bg-slate-800 text-blue-600 hover:bg-blue-600 hover:text-white shadow-xs opacity-75 group-hover/len:opacity-100 transition-all ml-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                            = {(item.lengthUsedMeter / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Km
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {item.installYear}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                              item.status.includes("Aktif")
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                : item.status.includes("Proses")
                                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                                : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                            }`}
                          >
                            {item.status.includes("Aktif") ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {item.status.replace(/\s*\([^)]*\)/, "")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isAdmin ? (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  title="Edit Detail Utilitas"
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleJumpToCalculator(item)}
                                  title="Hitung Retribusi untuk Utilitas ini"
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-600 transition-colors"
                                >
                                  <Calculator className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteInventory(item.id, item.providerName)}
                                  title="Hapus Data Utilitas"
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleJumpToCalculator(item)}
                                title="Hitung Retribusi untuk Utilitas ini"
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-600 transition-colors"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: RETRIBUSI UTILITAS ──────────────────────────────────────── */}
      {activeSubTab === "retribution" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Summary Revenue Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl p-5 text-white shadow-lg relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute right-3 bottom-3 text-white/10 group-hover:scale-110 transition-transform">
                <Coins className="w-20 h-20" />
              </div>
              <p className="text-xs font-bold text-amber-200 uppercase tracking-wider mb-1">Total Potensi Retribusi</p>
              <div className="text-2xl font-black tracking-tight">
                {formatRp(retributionStats.totalPotential)}
              </div>
              <p className="text-[11px] text-amber-100 mt-2 flex items-center gap-1.5 font-medium">
                <DollarSign className="w-3.5 h-3.5" />
                Akumulasi seluruh tagihan Rumija terbit
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Retribusi Lunas
                  </p>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatRp(retributionStats.totalPaid)}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Telah masuk ke Rekening Kas Umum Daerah
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Menunggu Pembayaran
                  </p>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {formatRp(retributionStats.totalUnpaid)}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Tagihan aktif sedang dalam proses pembayaran
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Jatuh Tempo
                  </p>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {formatRp(retributionStats.totalOverdue)}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Memerlukan surat tegoran penagihan
              </p>
            </div>
          </div>

          {/* ─── INTERACTIVE RETRIBUTION CALCULATOR ─────────────────────────── */}
          <div
            id="retribution-calculator-section"
            className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-500/30 p-6 md:p-8 text-white shadow-2xl space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
                    Kalkulator Perhitungan Retribusi Pemanfaatan Rumija
                  </h2>
                  <p className="text-xs text-slate-300">
                    Perhitungan otomatis berdasarkan panjang pemanfaatan (meter), tarif per meter/tahun, durasi, dan koefisien lokasi.
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700 shrink-0 self-start sm:self-center">
                <button
                  onClick={() => setCalcMode("from_inventory")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    calcMode === "from_inventory" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pilih dari Inventaris
                </button>
                <button
                  onClick={() => setCalcMode("manual")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    calcMode === "manual" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Input Manual Baru
                </button>
              </div>
            </div>

            {/* Calculator Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Column 1: Source Utility & Location */}
              <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> 1. Subjek &amp; Lokasi Pemanfaatan
                </h3>

                {calcMode === "from_inventory" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Pilih Utilitas Terdaftar:
                    </label>
                    <select
                      value={selectedInvId}
                      onChange={(e) => setSelectedInvId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {inventoryList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.providerName} ({item.code})
                        </option>
                      ))}
                    </select>
                    {inventoryList.find((i) => i.id === selectedInvId) && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs space-y-1 text-slate-300">
                        <div><b className="text-white">Jenis:</b> {inventoryList.find((i) => i.id === selectedInvId)?.utilityType}</div>
                        <div><b className="text-white">Posisi:</b> {inventoryList.find((i) => i.id === selectedInvId)?.position}</div>
                        <div><b className="text-white">Panjang di DB:</b> <span className="text-amber-400 font-bold font-mono">{inventoryList.find((i) => i.id === selectedInvId)?.lengthUsedMeter.toLocaleString("id-ID")} Meter</span></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Nama Wajib Retribusi / Penyedia:</label>
                      <input
                        type="text"
                        placeholder="Contoh: PT PLN (Persero) / PT Biznet..."
                        value={calcManualProvider}
                        onChange={(e) => setCalcManualProvider(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Ruas Jalan / Lokasi Pemanfaatan:</label>
                      <input
                        type="text"
                        placeholder="Contoh: Jl. El Tari / Sp. Polda..."
                        value={calcManualSegment}
                        onChange={(e) => setCalcManualSegment(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Jenis Utilitas:</label>
                      <select
                        value={calcManualType}
                        onChange={(e) => setCalcManualType(e.target.value as UtilityType)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Listrik (PLN)">Listrik (PLN)</option>
                        <option value="Telekomunikasi / Fiber Optik">Telekomunikasi / Fiber Optik</option>
                        <option value="Air Bersih (PDAM)">Air Bersih (PDAM)</option>
                        <option value="Saluran Gas / BBM">Saluran Gas / BBM</option>
                        <option value="Gorong-gorong Utilitas">Gorong-gorong Utilitas</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Manual Length & Rate */}
              <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" /> 2. Parameter Panjang &amp; Tarif
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex justify-between">
                    <span>Panjang Penggunaan Rumija (Meter):</span>
                    <span className="text-amber-400 font-mono">Bisa Diubah Manual</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={calcLengthMeter}
                      onChange={(e) => setCalcLengthMeter(e.target.value)}
                      placeholder="0"
                      min="1"
                      className="w-full pl-3 pr-16 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-base font-black text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Meter
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Setara {(Number(calcLengthMeter) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Km lintasan
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tarif Dasar Retribusi (Rp / Meter / Tahun):
                  </label>
                  <div className="relative mb-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      value={calcRateRp}
                      onChange={(e) => setCalcRateRp(e.target.value)}
                      placeholder="5000"
                      min="0"
                      step="500"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-bold text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {/* Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCalcRateRp(2500)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 border border-slate-700"
                    >
                      Rp 2.500 (Desa)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcRateRp(5000)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 border border-slate-700"
                    >
                      Rp 5.000 (Standar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcRateRp(10000)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 border border-slate-700"
                    >
                      Rp 10.000 (Kota)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcRateRp(15000)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 border border-slate-700"
                    >
                      Rp 15.000 (Komersial)
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 3: Duration, Koefisien & Live Total */}
              <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> 3. Durasi &amp; Koefisien
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Durasi (Tahun):</label>
                      <select
                        value={calcDurationYears}
                        onChange={(e) => setCalcDurationYears(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value={1}>1 Tahun</option>
                        <option value={2}>2 Tahun</option>
                        <option value={3}>3 Tahun</option>
                        <option value={5}>5 Tahun</option>
                        <option value={10}>10 Tahun</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Koefisien Lokasi:</label>
                      <select
                        value={calcLocationIndex}
                        onChange={(e) => setCalcLocationIndex(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value={1.0}>1.0 - Standar</option>
                        <option value={1.25}>1.25 - Intensitas Sedang</option>
                        <option value={1.5}>1.50 - Bawah Tanah / Kota</option>
                        <option value={2.0}>2.00 - Khusus / Berat</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Big Live Total Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900/80 to-teal-950 border border-emerald-500/40 text-center space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                    Total Retribusi Terhitung (Rp)
                  </p>
                  <div className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight text-shadow">
                    {formatRp(calculatedRetributionRp)}
                  </div>
                  <p className="text-[10px] text-emerald-200/80 font-mono pt-1 border-t border-emerald-500/20">
                    {Number(calcLengthMeter).toLocaleString("id-ID")} m × Rp {Number(calcRateRp).toLocaleString("id-ID")} × {calcDurationYears} Thn × {calcLocationIndex}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes & Submit Action */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-2/3">
                <input
                  type="text"
                  placeholder="Catatan tagihan (opsional)... Contoh: Pembayaran untuk masa izin pemanfaatan tahun 2026."
                  value={calcNotes}
                  onChange={(e) => setCalcNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCalcLengthMeter(1000);
                    setCalcRateRp(5000);
                    setCalcDurationYears(1);
                    setCalcLocationIndex(1.0);
                    setCalcNotes("");
                    showToast("Kalkulator di-reset ke nilai standar.", "info");
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors shrink-0"
                >
                  Reset
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={handlePublishInvoice}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg text-xs md:text-sm font-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan &amp; Terbitkan Tagihan</span>
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-semibold text-center">
                    Mode Simulasi (Visitor) — Hanya Administrator yang dapat menerbitkan tagihan
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── RETRIBUTION INVOICE TABLE ──────────────────────────────────── */}
          <div
            id="retribution-table-section"
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4"
          >
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                  Daftar Tagihan &amp; Riwayat Retribusi Utilitas Rumija
                </h2>
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full text-[11px] font-extrabold">
                  {filteredRetributions.length} Tagihan
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari no. tagihan / penyedia..."
                    value={retSearchQuery}
                    onChange={(e) => setRetSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <select
                  value={retFilterStatus}
                  onChange={(e) => setRetFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="All">Semua Status</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Belum Dibayar">Belum Dibayar</option>
                  <option value="Jatuh Tempo">Jatuh Tempo</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 dark:bg-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">No. Tagihan &amp; Tanggal</th>
                    <th className="py-3.5 px-4">Wajib Retribusi / Penyedia</th>
                    <th className="py-3.5 px-4">Ruas Jalan</th>
                    <th className="py-3.5 px-4">Parameter Perhitungan</th>
                    <th className="py-3.5 px-4 text-right">Total Tagihan (Rp)</th>
                    <th className="py-3.5 px-4 text-center">Status Bayar</th>
                    <th className="py-3.5 px-4 text-center">Jatuh Tempo</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm">
                  {filteredRetributions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Coins className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold">Tidak ada data tagihan retribusi yang ditemukan.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRetributions.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-black text-slate-900 dark:text-white font-mono block">
                            {item.invoiceNo}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Terbit: {item.issueDate}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-800 dark:text-slate-200">
                            {item.providerName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-semibold">
                            {item.utilityType}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400">
                          {item.segmentName}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs">
                          <div className="text-slate-800 dark:text-slate-200 font-bold">
                            {item.lengthUsedMeter.toLocaleString("id-ID")} m
                          </div>
                          <div className="text-[10px] text-slate-500">
                            @ Rp {item.ratePerMeterYear.toLocaleString("id-ID")}/m ({item.durationYears} thn, k={item.locationIndex})
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="text-sm font-black text-slate-900 dark:text-white font-mono bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-200/60 dark:border-amber-800 inline-block">
                            {formatRp(item.totalRetributionRp)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <select
                            value={item.status}
                            disabled={!isAdmin}
                            onChange={(e) =>
                              handleUpdateInvoiceStatus(
                                item.id,
                                e.target.value as "Belum Dibayar" | "Lunas" | "Jatuh Tempo"
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border focus:outline-none cursor-pointer transition-all ${
                              item.status === "Lunas"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                : item.status === "Belum Dibayar"
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                            }`}
                          >
                            <option value="Belum Dibayar">⏳ Belum Dibayar</option>
                            <option value="Lunas">✅ Lunas</option>
                            <option value="Jatuh Tempo">⚠️ Jatuh Tempo</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {item.dueDate}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setPrintInvoice(item)}
                              title="Cetak / Pratinjau Faktur Retribusi"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteInvoice(item.id, item.invoiceNo)}
                                title="Hapus Tagihan"
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD / EDIT INVENTORY ───────────────────────────────────── */}
      {isInvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {editingInvItem ? "Edit Data Inventaris Utilitas" : "Tambah Inventaris Utilitas Baru"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Masukkan detail utilitas dan panjang pemanfaatan ruang milik jalan (Rumija).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInvModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-4 text-xs md:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Utilitas:
                  </label>
                  <input
                    type="text"
                    value={invForm.code}
                    onChange={(e) => setInvForm({ ...invForm, code: e.target.value })}
                    placeholder="Contoh: UTL-PLN-001"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Penyedia Utilitas <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={invForm.providerName}
                    onChange={(e) => setInvForm({ ...invForm, providerName: e.target.value })}
                    placeholder="Contoh: PT PLN (Persero) UIW NTT"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Utilitas:
                  </label>
                  <select
                    value={invForm.utilityType}
                    onChange={(e) => setInvForm({ ...invForm, utilityType: e.target.value as UtilityType })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="Listrik (PLN)">Listrik (PLN)</option>
                    <option value="Telekomunikasi / Fiber Optik">Telekomunikasi / Fiber Optik</option>
                    <option value="Air Bersih (PDAM)">Air Bersih (PDAM)</option>
                    <option value="Saluran Gas / BBM">Saluran Gas / BBM</option>
                    <option value="Gorong-gorong Utilitas">Gorong-gorong Utilitas</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Posisi Pemanfaatan:
                  </label>
                  <select
                    value={invForm.position}
                    onChange={(e) => setInvForm({ ...invForm, position: e.target.value as UtilityPosition })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="Bawah Tanah (Underground)">Bawah Tanah (Underground)</option>
                    <option value="Atas Tanah / Udara (Overhead)">Atas Tanah / Udara (Overhead)</option>
                    <option value="Menyeberang Jalan (Crossing)">Menyeberang Jalan (Crossing)</option>
                    <option value="Bahu Jalan (Shoulder)">Bahu Jalan (Shoulder)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ruas Jalan Provinsi:
                  </label>
                  <select
                    value={invForm.segmentId}
                    onChange={(e) => setInvForm({ ...invForm, segmentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    {segments.map((seg) => (
                      <option key={seg.id} value={seg.id}>
                        {seg.name} ({seg.code}) - {seg.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-blue-600 dark:text-blue-400 mb-1">
                    Panjang Penggunaan (Meter) <span className="text-rose-500">*</span>:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      value={invForm.lengthUsedMeter}
                      onChange={(e) => setInvForm({ ...invForm, lengthUsedMeter: e.target.value })}
                      className="w-full pl-3 pr-14 py-2 bg-blue-50/50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-lg font-mono font-black text-blue-700 dark:text-blue-300"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Meter
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Izin Pemanfaatan:
                  </label>
                  <select
                    value={invForm.status}
                    onChange={(e) => setInvForm({ ...invForm, status: e.target.value as UtilityStatus })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option value="Aktif (Izin Berlaku)">Aktif (Izin Berlaku)</option>
                    <option value="Dalam Proses Izin">Dalam Proses Izin</option>
                    <option value="Masa Berlaku Habis">Masa Berlaku Habis</option>
                    <option value="Tanpa Izin (Ilegal)">Tanpa Izin (Ilegal)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tahun Pemasangan:
                  </label>
                  <input
                    type="number"
                    value={invForm.installYear}
                    onChange={(e) => setInvForm({ ...invForm, installYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Catatan Teknis:
                </label>
                <textarea
                  rows={2}
                  value={invForm.description}
                  onChange={(e) => setInvForm({ ...invForm, description: e.target.value })}
                  placeholder="Contoh: Kabel fiber optik bawah tanah di bahu kiri jalan..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInvModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Inventaris</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: QUICK EDIT LENGTH ONLY ─────────────────────────────────── */}
      {quickEditModal.isOpen && quickEditModal.item && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Manual Panjang Penggunaan</span>
              </h3>
              <button
                onClick={() => setQuickEditModal({ isOpen: false, item: null, newLength: "" })}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickLength} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-xs space-y-1">
                <div><b className="text-slate-500">Penyedia:</b> {quickEditModal.item.providerName}</div>
                <div><b className="text-slate-500">Ruas Jalan:</b> {quickEditModal.item.segmentName}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Masukkan Total Panjang Penggunaan Baru (Meter):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    autoFocus
                    value={quickEditModal.newLength}
                    onChange={(e) =>
                      setQuickEditModal((prev) => ({ ...prev, newLength: e.target.value }))
                    }
                    className="w-full pl-3 pr-16 py-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-400 dark:border-blue-600 rounded-xl font-mono text-xl font-black text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    Meter
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  Setara {(Number(quickEditModal.newLength) / 1000).toLocaleString("id-ID", { maximumFractionDigits: 3 })} Km
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickEditModal({ isOpen: false, item: null, newLength: "" })}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 font-bold text-xs rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: INVOICE PRINT PREVIEW ──────────────────────────────────── */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-xs font-black uppercase tracking-wider mb-2">
                  <Shield className="w-3.5 h-3.5" /> Dinas PUPR Provinsi NTT
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Faktur / Bukti Perhitungan Retribusi Rumija
                </h3>
                <p className="text-xs text-slate-500 font-mono">No: {printInvoice.invoiceNo}</p>
              </div>
              <button
                onClick={() => setPrintInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs md:text-sm bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Wajib Retribusi / Penyedia:</p>
                  <p className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5">{printInvoice.providerName}</p>
                  <p className="text-slate-500">{printInvoice.utilityType}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Tanggal Terbit &amp; Jatuh Tempo:</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{printInvoice.issueDate}</p>
                  <p className="text-rose-600 font-bold">s.d. {printInvoice.dueDate}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lokasi Ruas Jalan:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{printInvoice.segmentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Panjang Pemanfaatan:</span>
                  <span className="font-mono font-bold text-blue-600">{printInvoice.lengthUsedMeter.toLocaleString("id-ID")} Meter</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tarif Retribusi Dasar:</span>
                  <span className="font-mono font-bold">Rp {printInvoice.ratePerMeterYear.toLocaleString("id-ID")} / meter / tahun</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Durasi &amp; Koefisien Lokasi:</span>
                  <span className="font-bold">{printInvoice.durationYears} Tahun (Indeks {printInvoice.locationIndex})</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Total Tagihan Retribusi:
                </span>
                <span className="text-xl font-black text-amber-600 font-mono">
                  {formatRp(printInvoice.totalRetributionRp)}
                </span>
              </div>
            </div>

            {printInvoice.notes && (
              <div className="text-xs text-slate-500 italic bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/50">
                <b>Catatan:</b> {printInvoice.notes}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast(`Faktur No. ${printInvoice.invoiceNo} sedang disiapkan untuk pencetakan / PDF...`, "success");
                  setTimeout(() => setPrintInvoice(null), 1000);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Unduh Kwitansi Resmi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
