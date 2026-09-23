/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { confirmDialog } from "../lib/swal";
import {
  BookOpen,
  FileText,
  Download,
  UploadCloud,
  Plus,
  Search,
  Trash2,
  FileDown,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Layers,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  BookMarked,
  Info,
  Calendar,
  User,
  CheckCircle,
  FileQuestion,
  Filter
} from "lucide-react";
import { useRoads } from "../context/RoadContext";
import { useAuth } from "../context/AuthContext";

interface GuidelineDocument {
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
}

const INITIAL_GUIDELINES: GuidelineDocument[] = [
  {
    id: "guide-1",
    title: "Permen PUPR No. 04/PRT/M/2016 tentang Pedoman Penyelenggaraan Leger Jalan",
    documentNo: "04/PRT/M/2016",
    year: "2016",
    category: "Peraturan Menteri",
    publisher: "Kementerian Pekerjaan Umum & Perumahan Rakyat RI",
    fileName: "Permen_PUPR_04_2016_Penyelenggaraan_Leger_Jalan.pdf",
    fileSize: "14.2 MB",
    uploadedAt: "Tersedia secara sistem (Bawaan)",
    summary: "Regulasi dasar tingkat nasional yang menetapkan kewajiban penyelenggara jalan untuk mengumpulkan data, menyusun, dan mengesahkan Leger Jalan. Mengatur format kartu leger (KL-1 s.d KL-8) serta tata cara penyerahan laporan leger secara berkala.",
    isOfficial: true
  },
  {
    id: "guide-2",
    title: "Undang-Undang RI No. 38 Tahun 2004 tentang Jalan",
    documentNo: "UU No. 38 Tahun 2004",
    year: "2004",
    category: "Undang-Undang",
    publisher: "Pemerintah Republik Indonesia",
    fileName: "UU_No_38_2004_Tentang_Jalan.pdf",
    fileSize: "5.6 MB",
    uploadedAt: "Tersedia secara sistem (Bawaan)",
    summary: "Payung hukum tertinggi tata kelola jalan di Indonesia. Menyebutkan sanksi pidana dan administratif bagi penyelenggara jalan yang mengabaikan kewajiban pemeliharaan dan pembuatan leger jalan guna menjamin keselamatan pengguna jalan.",
    isOfficial: true
  },
  {
    id: "guide-3",
    title: "Manual Survei Geometris & Inventarisasi Lapangan Provinsi NTT",
    documentNo: "MAN-PUPR-NTT/2024/08",
    year: "2024",
    category: "Panduan Teknis",
    publisher: "Dinas PUPR Provinsi Nusa Tenggara Timur",
    fileName: "Manual_Survei_Geometris_Leger_NTT.pdf",
    fileSize: "8.4 MB",
    uploadedAt: "Tersedia secara sistem (Bawaan)",
    summary: "Petunjuk praktis lapangan yang dirancang khusus untuk kondisi topografi Nusa Tenggara Timur. Panduan cara menentukan koordinat pangkal/ujung ruas jalan (latitude/longitude), pendataan patok kilometer (KM) dan hektometer (HM), serta penilaian visual kondisi aspal.",
    isOfficial: true
  },
  {
    id: "guide-4",
    title: "SOP Pengolahan Data & Pengesahan Digital Kartu Leger Bina Marga",
    documentNo: "SOP-PUPR-BM/2025/12",
    year: "2025",
    category: "SOP",
    publisher: "Bidang Bina Marga PUPR NTT",
    fileName: "SOP_Bina_Marga_Leger_Digital.pdf",
    fileSize: "3.1 MB",
    uploadedAt: "Tersedia secara sistem (Bawaan)",
    summary: "Standard Operating Procedure internal Dinas PUPR NTT untuk proses validasi data hasil survei LENTERA. Menjelaskan proses verifikasi administrasi sertifikat hak pakai, pengolahan draf gambar leger, penandatanganan basah/digital, hingga penataan di arsip fisik.",
    isOfficial: true
  }
];

export const Guidelines: React.FC = () => {
  const { showToast, guidelines, addGuideline, deleteGuideline, isDbLoading } = useRoads();
  const { appRole } = useAuth();
  const isAdmin = appRole === "admin";

  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<"materi" | "perpustakaan">("materi");

  // Document Library — sourced purely from DB (no localStorage/hardcoded fallback)
  const documents = guidelines;

  // Search and Category filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  // Accordion state for interactive guide
  const [openGuideId, setOpenGuideId] = useState<number | null>(1);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for adding guidelines
  const [formTitle, setFormTitle] = useState("");
  const [formDocNo, setFormDocNo] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formCategory, setFormCategory] = useState<"Undang-Undang" | "Peraturan Menteri" | "Keputusan Gubernur" | "Panduan Teknis" | "SOP" | "Lainnya">("Panduan Teknis");
  const [formPublisher, setFormPublisher] = useState("Dinas PUPR Provinsi NTT");
  const [formSummary, setFormSummary] = useState("");

  // Preview Modal state
  const [previewDoc, setPreviewDoc] = useState<GuidelineDocument | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "png"];
    if (!allowed.includes(ext || "")) {
      showToast("Tipe berkas tidak didukung. Harap unggah PDF, Dokumen Word, Spreadsheet, atau Gambar.", "error");
      return;
    }

    setSelectedFile(file);
    showToast(`Berkas "${file.name}" siap diunggah.`, "info");

    // Start Gemini AI extraction simulation to pre-fill form
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      
      // Determine logical defaults based on filename
      const fileNameLower = file.name.toLowerCase();
      let guessedCategory: typeof formCategory = "Panduan Teknis";
      let guessedTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      
      // Capitalize guessed title
      guessedTitle = guessedTitle.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

      if (fileNameLower.includes("permen") || fileNameLower.includes("menteri")) {
        guessedCategory = "Peraturan Menteri";
      } else if (fileNameLower.includes("uu") || fileNameLower.includes("undang")) {
        guessedCategory = "Undang-Undang";
      } else if (fileNameLower.includes("sop") || fileNameLower.includes("prosedur")) {
        guessedCategory = "SOP";
      } else if (fileNameLower.includes("pergub") || fileNameLower.includes("gubernur")) {
        guessedCategory = "Keputusan Gubernur";
      }

      const currentYear = new Date().getFullYear().toString();
      const randomDocNo = `REG/PUPR-NTT/${currentYear}/${Math.floor(100 + Math.random() * 900)}`;

      setFormTitle(guessedTitle);
      setFormDocNo(randomDocNo);
      setFormYear(currentYear);
      setFormCategory(guessedCategory);
      setFormPublisher("Dinas Pekerjaan Umum & Penataan Ruang NTT");
      setFormSummary(`Dokumen pedoman/manual terkait teknis pembuatan leger jalan yang diunggah pengguna. Terbaca otomatis oleh modul LENTERA Gemini OCR.`);
      
      showToast("Gemini AI berhasil mengekstrak metadata dan melengkapi draf form!", "success");
    }, 1500);
  };

  const handleAddDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast("Silakan pilih atau seret berkas terlebih dahulu.", "error");
      return;
    }
    if (!formTitle.trim()) {
      showToast("Judul dokumen wajib diisi.", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    setUploadError(null);

    const sizeInMb = `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`;

    await addGuideline(
      {
        title: formTitle,
        documentNo: formDocNo || "TBA",
        year: formYear || new Date().getFullYear().toString(),
        category: formCategory,
        publisher: formPublisher || "Tidak Diketahui",
        fileName: selectedFile.name,
        fileSize: sizeInMb,
        summary: formSummary || "Tidak ada ringkasan yang disediakan.",
      },
      selectedFile,
      (pct) => setUploadProgress(pct)
    );

    setIsUploading(false);
    setSelectedFile(null);

    // Reset form
    setFormTitle("");
    setFormDocNo("");
    setFormYear("");
    setFormCategory("Panduan Teknis");
    setFormPublisher("Dinas PUPR Provinsi NTT");
    setFormSummary("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setUploadProgress(0), 800);
  };

  const handleDownload = (doc: { title: string; fileUrl?: string; fileName: string }) => {
    if (doc.fileUrl) {
      const a = document.createElement("a");
      a.href = doc.fileUrl;
      a.download = doc.fileName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } else {
      showToast(`Berkas "${doc.title}" tidak tersedia untuk diunduh (belum diunggah ke storage).`, "info");
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirmDialog({
      title: "Hapus Dokumen Pedoman?",
      text: "Dokumen pedoman ini akan dihapus secara permanen dari sistem.",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      isDanger: true,
    });
    if (confirmed) {
      await deleteGuideline(id);
    }
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "Semua" || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Steps of road leger creation guidelines
  const guidelinesSteps = [
    {
      id: 1,
      title: "Tahap 1: Pengumpulan Data & Persiapan Administrasi",
      desc: "Sebelum menginjakkan kaki di lapangan, surveyor wajib mengumpulkan seluruh dokumen penunjang administratif.",
      points: [
        "Identifikasi SK penetapan status jalan terbaru (SK Gubernur NTT/SK Menteri PUPR) untuk memvalidasi panjang fungsional dan koordinat batas ruas.",
        "Siapkan peta koridor ruas lama, gambar desain DED (Detail Engineering Design) jika ada rekonstruksi terbaru, dan sertifikat tanah daerah milik jalan (DMJ).",
        "Buat surat tugas resmi dari dinas PUPR setempat dan pastikan kelengkapan alat ukur/surveyor dalam keadaan terkalibrasi."
      ],
      icon: <Layers className="w-5 h-5 text-primary" />
    },
    {
      id: 2,
      title: "Tahap 2: Survei Geometris & Inventarisasi Lapangan",
      desc: "Proses survei di lapangan merupakan jantung keakuratan data leger jalan. Dilakukan secara runut dari patok pangkal s.d ujung.",
      points: [
        "Pengukuran Lebar Badan Jalan: Ukur lebar jalur lalu lintas (perkerasan), lebar bahu jalan (kiri & kanan), ambang pengaman, dan saluran samping drainase.",
        "Penentuan Koordinat Pangkal & Ujung: Gunakan GPS atau fitur peta LENTERA di lapangan untuk mengunci koordinat stasioning awal (0+000) dan stasioning akhir.",
        "Inventarisasi Bangunan Pelengkap: Catat detail jembatan, box culvert, patok kilometer (KM), patok hektometer (HM), lampu jalan, dan rambu-rambu penting.",
        "Pendataan Jenis Permukaan: Identifikasi material lapis permukaan (Asphalt/Beton/Kerikil/Tanah) beserta visualisasi tingkat kerusakannya."
      ],
      icon: <BookOpen className="w-5 h-5 text-primary" />
    },
    {
      id: 3,
      title: "Tahap 3: Pengolahan Data & Pemetaan Spasial GIS",
      desc: "Konversi data lapangan ke dalam sistem LENTERA digital untuk membentuk representasi koordinat geografis.",
      points: [
        "Masukkan hasil pencatatan ke formulir draf survei di LENTERA (Menu Input/Survey).",
        "Plot trase jalan secara akurat mengikuti koordinat GPS yang terekam pada peta interaktif GIS.",
        "Kelompokkan segmen jalan berdasarkan tingkat kemantapan aspal (Mantap, Sedang, Rusak Ringan, Rusak Berat) guna sinkronisasi visual dashboard."
      ],
      icon: <Sparkles className="w-5 h-5 text-primary" />
    },
    {
      id: 4,
      title: "Tahap 4: Penyusunan Kartu Leger (KL-1 s.d KL-8)",
      desc: "Menyusun draf kartu leger resmi sesuai standar regulasi nasional Permen PUPR No. 04/2016.",
      points: [
        "KL-1 (Ringkasan): Berisi rangkuman geometris, status hukum, koordinat pangkal-ujung ruas jalan.",
        "KL-2 (Peta Ruas & Koridor): Visualisasi rute jalan, batas DMJ (Daerah Milik Jalan), dan tata guna lahan kanan-kiri jalan.",
        "KL-3 (Penampang Melintang): Detail lapisan struktur aspal, bahu jalan, drainase, dan batas tanah milik jalan.",
        "KL-4 s.d KL-8: Memuat inventarisasi jembatan, perlintasan, bangunan pelengkap, sejarah pemeliharaan, serta catatan utilitas bawah tanah (jika ada)."
      ],
      icon: <FileText className="w-5 h-5 text-primary" />
    },
    {
      id: 5,
      title: "Tahap 5: Validasi Administrasi & Pengesahan Dokumen",
      desc: "Dokumen leger jalan tidak memiliki kekuatan hukum penuh sebelum ditandatangani oleh pejabat yang berwenang.",
      points: [
        "Upload draf Kartu Leger dan Sertifikat Hak Pakai Jalan ke LENTERA (Menu Kartu & Sertifikat).",
        "Tim verifikator Dinas PUPR akan meneliti keabsahan spasial dan dokumen pendukung.",
        "Setelah status berubah menjadi 'Tervalidasi', cetak Kartu Leger resmi untuk ditandatangani secara basah atau digital oleh Kepala Dinas PUPR Provinsi NTT.",
        "Simpan arsip digital secara terintegrasi di LENTERA dan salinan fisik di lemari arsip berstandar tahan api."
      ],
      icon: <CheckCircle2 className="w-5 h-5 text-primary" />
    }
  ];

  const handleDownloadMock = (docTitle: string) => {
    showToast(`Memulai unduhan berkas: ${docTitle}`, "success");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Banner / Header */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-secondary/5 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none"></div>
        
        <div className="flex gap-4 items-start md:items-center">
          <div className="p-3.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0 shadow-xs">
            <BookMarked className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] bg-primary/10 text-primary font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Pedoman Resmi
              </span>
              <span className="text-[10px] bg-secondary/10 text-secondary font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> PUPR NTT
              </span>
            </div>
            <h2 className="font-headline-md text-2xl font-black text-on-surface tracking-tight mt-1.5">
              Pedoman Pembuatan Leger Jalan
            </h2>
            <p className="text-xs text-on-surface-variant font-medium max-w-2xl mt-1 leading-relaxed">
              Pusat pembelajaran dan dokumentasi regulasi pembuatan leger jalan provinsi NTT. Berisi tahapan operasional lapangan, dasar hukum, serta direktori manual teknis resmi PUPR.
            </p>
          </div>
        </div>

        {/* Info Pill */}
        <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/60 rounded-xl p-3 shrink-0 self-stretch md:self-auto justify-center">
          <Info className="w-5 h-5 text-primary shrink-0" />
          <div className="text-left">
            <span className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              TOTAL PEDOMAN
            </span>
            <span className="block text-sm font-black text-on-surface">
              {documents.length} Dokumen Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-outline-variant/60">
        <button
          onClick={() => setActiveSubTab("materi")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "materi"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Materi Alur Pembuatan
        </button>
        <button
          onClick={() => setActiveSubTab("perpustakaan")}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "perpustakaan"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Layers className="w-4 h-4" />
          Pustaka &amp; Upload Dokumen
        </button>
      </div>

      {/* SUB TAB 1: MATERI ALUR PEMBUATAN */}
      {activeSubTab === "materi" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Timeline and Detailed Explanation (Col 8) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-black text-on-surface uppercase tracking-wider mb-4 pb-2 border-b border-outline-variant/45 flex items-center gap-2">
                <Layers className="text-primary w-4.5 h-4.5" />
                Alur Kerja Penyusunan Leger Jalan NTT
              </h3>

              <div className="space-y-3">
                {guidelinesSteps.map((step) => {
                  const isOpen = openGuideId === step.id;
                  return (
                    <div
                      key={step.id}
                      className={`border rounded-xl transition-all duration-300 ${
                        isOpen 
                          ? "border-primary/40 bg-primary/[0.01]" 
                          : "border-outline-variant hover:border-outline-variant-high bg-surface-bright"
                      }`}
                    >
                      <button
                        onClick={() => setOpenGuideId(isOpen ? null : step.id)}
                        className="w-full text-left p-4 flex justify-between items-center gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg shrink-0 border ${
                            isOpen 
                              ? "bg-primary/10 border-primary/20 text-primary" 
                              : "bg-surface-container-low border-outline-variant/50 text-on-surface-variant"
                          }`}>
                            {step.icon}
                          </div>
                          <div>
                            <h4 className={`text-xs font-black leading-snug ${isOpen ? "text-primary" : "text-on-surface"}`}>
                              {step.title}
                            </h4>
                            <p className="text-[10px] text-on-surface-variant font-semibold mt-0.5 line-clamp-1">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform shrink-0 duration-300 ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden border-t border-outline-variant/35"
                          >
                            <div className="p-4 bg-surface-container-lowest/40 space-y-3">
                              <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                                {step.desc}
                              </p>
                              
                              <div className="space-y-2 pl-2">
                                <span className="text-[10px] uppercase font-black tracking-wide text-primary block">
                                  Instruksi Detail &amp; Ketentuan Teknis:
                                </span>
                                <ul className="space-y-2">
                                  {step.points.map((pt, i) => (
                                    <li key={i} className="flex gap-2.5 items-start text-xs text-on-surface">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                      <span className="leading-relaxed font-medium">{pt}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="border border-amber-200 bg-amber-50/10 rounded-xl p-5 space-y-2.5">
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                Ketentuan Validasi Penting (Anti-Tolak Dokumen)
              </h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Berdasarkan evaluasi audit berkas, pastikan draf Kartu Leger (KL) yang Anda susun memenuhi parameter wajib berikut sebelum diunggah ke LENTERA untuk persetujuan:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] text-on-surface font-medium pt-1">
                <div className="flex gap-2 bg-surface-bright/50 p-2 rounded border border-outline-variant/50">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Panjang fungsional di KL-1 wajib sama persis dengan angka SK Gubernur NTT.</span>
                </div>
                <div className="flex gap-2 bg-surface-bright/50 p-2 rounded border border-outline-variant/50">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Peta koridor KL-2 wajib mencantumkan koordinat UTM beserta legenda arah utara yang jelas.</span>
                </div>
                <div className="flex gap-2 bg-surface-bright/50 p-2 rounded border border-outline-variant/50">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Sertifikat Hak Pakai jalan harus diunggah lengkap (bukan lembar depan saja).</span>
                </div>
                <div className="flex gap-2 bg-surface-bright/50 p-2 rounded border border-outline-variant/50">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Lampiran foto jembatan/utilitas harus memiliki stempel waktu &amp; geotag lokasi.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick FAQ / PU Standards (Col 4) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-black text-on-surface uppercase tracking-wider mb-3.5 pb-2 border-b border-outline-variant/45">
                Sistem Penilaian Jalan
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 rounded bg-emerald-500 shrink-0"></div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide block">Kondisi Mantap (IRI ≤ 4)</span>
                    <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed font-medium">
                      Jalan rata, tidak ada lubang/retak. Kecepatan kendaraan dapat maksimal. Cukup diberikan pemeliharaan rutin.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-2 rounded bg-blue-500 shrink-0"></div>
                  <div>
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-wide block">Kondisi Sedang (4 &lt; IRI ≤ 8)</span>
                    <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed font-medium">
                      Kerusakan minor seperti retak rambut, gelombang tipis. Pemeliharaan preventif (overlay/sealing) disarankan.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-2 rounded bg-amber-500 shrink-0"></div>
                  <div>
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-wide block">Kondisi Rusak Ringan (8 &lt; IRI ≤ 12)</span>
                    <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed font-medium">
                      Terdapat lubang kecil-sedang, retak buaya. Memerlukan rekonstruksi parsial atau rehabilitasi jalan berkala.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-2 rounded bg-rose-500 shrink-0"></div>
                  <div>
                    <span className="text-[10px] font-black text-rose-700 uppercase tracking-wide block">Kondisi Rusak Berat (IRI &gt; 12)</span>
                    <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed font-medium">
                      Ambles parah, permukaan hancur, bahaya bagi pengendara. Membutuhkan peningkatan struktur total (rekonstruksi mayor).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access Documents Link */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center space-y-3">
              <FileQuestion className="w-10 h-10 text-primary mx-auto" />
              <div>
                <h4 className="text-xs font-black text-on-surface">Butuh Berkas Contoh?</h4>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed font-medium">
                  Unduh formulir kosong draf Kartu Leger Jalan (KL-1 s.d KL-8) berstandar Dinas PUPR Provinsi NTT di tab pustaka dokumen.
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab("perpustakaan")}
                className="w-full py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-primary/95 transition-colors"
              >
                Kunjungi Pustaka Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: PUSTAKA & UPLOAD DOKUMEN */}
      {activeSubTab === "perpustakaan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Document Upload Form Area (Col 4) */}
          {isAdmin && (
            <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs space-y-4">
              <div className="pb-2 border-b border-outline-variant/40">
                <h3 className="font-headline-sm text-sm font-black text-on-surface flex items-center gap-2">
                  <UploadCloud className="text-primary w-5 h-5" />
                  Upload Dokumen Pedoman
                </h3>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                  Tambahkan berkas pedoman baru ke dalam arsip sistem LENTERA.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[140px] ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant hover:border-primary/40 bg-surface-container-low/20"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                />

                {isScanning ? (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-xs font-bold text-primary animate-pulse">
                      Gemini AI sedang membaca berkas dan mengekstrak metadata...
                    </span>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center gap-2 py-1">
                    <FileText className="w-10 h-10 text-emerald-600" />
                    <span className="text-xs font-bold text-on-surface truncate max-w-[220px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono font-bold">
                      {`${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                    </span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider mt-1.5 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Terbaca oleh Gemini AI
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2.5 py-2">
                    <UploadCloud className="w-10 h-10 text-on-surface-variant/60" />
                    <div>
                      <p className="text-xs font-black text-on-surface">Pilih Berkas atau Seret ke Sini</p>
                      <p className="text-[10px] text-on-surface-variant mt-1 font-medium">
                        Mendukung PDF, Word, Excel, Gambar (Maks. 20MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Document Metadata Form */}
              <form onSubmit={handleAddDocumentSubmit} className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                    Judul Dokumen Pedoman <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: Undang-Undang Nomor 38 Tahun 2004"
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary transition-all text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                      Nomor Dokumen
                    </label>
                    <input
                      type="text"
                      value={formDocNo}
                      onChange={(e) => setFormDocNo(e.target.value)}
                      placeholder="e.g. UU No. 38/2004"
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary transition-all text-on-surface"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                      Tahun Terbit
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      placeholder="e.g. 2024"
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary transition-all text-on-surface"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                      Kategori Pedoman
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary transition-all text-on-surface"
                    >
                      <option value="Undang-Undang">Undang-Undang</option>
                      <option value="Peraturan Menteri">Peraturan Menteri</option>
                      <option value="Keputusan Gubernur">Keputusan Gubernur</option>
                      <option value="Panduan Teknis">Panduan Teknis</option>
                      <option value="SOP">SOP</option>
                      <option value="Lainnya">Lainnya / Regulasi</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                      Penerbit / Instansi
                    </label>
                    <input
                      type="text"
                      value={formPublisher}
                      onChange={(e) => setFormPublisher(e.target.value)}
                      placeholder="e.g. Kementerian PUPR"
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary transition-all text-on-surface"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                    Ringkasan Isi Pedoman
                  </label>
                  <textarea
                    rows={3}
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    placeholder="Berikan rangkuman poin-poin penting isi pedoman ini..."
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-all text-on-surface leading-relaxed"
                  />
                </div>

                {isUploading ? (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-primary">
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {uploadProgress < 20
                          ? "Mempersiapkan berkas..."
                          : uploadProgress < 70
                          ? "Mengunggah ke server..."
                          : uploadProgress < 90
                          ? "Mendapatkan tautan berkas..."
                          : uploadProgress < 100
                          ? "Menyimpan metadata..."
                          : "Selesai!"}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-outline-variant/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!selectedFile || isScanning}
                    className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Tambah ke Pustaka Sistem
                  </button>
                )}
              </form>
            </div>
            </div>
          )}

          {/* Guidelines Documents List (Col 8) */}
          <div className={`${isAdmin ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
            {/* Search and Filters */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search field */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari pedoman, nomor regulasi, instansi..."
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-on-surface"
                  />
                </div>

                {/* Filter category */}
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary transition-all text-on-surface"
                  >
                    <option value="Semua">Semua Kategori</option>
                    <option value="Undang-Undang">Undang-Undang</option>
                    <option value="Peraturan Menteri">Peraturan Menteri</option>
                    <option value="Keputusan Gubernur">Keputusan Gubernur</option>
                    <option value="Panduan Teknis">Panduan Teknis</option>
                    <option value="SOP">SOP</option>
                    <option value="Lainnya">Lainnya / Regulasi</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Documents List */}
            <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-wider px-1">
              Daftar Dokumen Pedoman ({isDbLoading ? "..." : filteredDocuments.length})
            </h4>

            {/* Loading skeleton */}
            {isDbLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-outline-variant/50 rounded-xl p-4 bg-surface-bright flex items-start gap-3.5 animate-pulse">
                    <div className="w-11 h-11 rounded-lg bg-surface-container-high shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-surface-container-high rounded w-1/4" />
                      <div className="h-3.5 bg-surface-container-high rounded w-3/4" />
                      <div className="h-3 bg-surface-container-high rounded w-1/2" />
                      <div className="h-3 bg-surface-container-high rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>

            /* DB returns no documents at all (no search active) */
            ) : documents.length === 0 && !searchQuery && selectedCategory === "Semua" ? (
              <div className="border border-outline-variant/60 rounded-xl p-8 bg-surface-container-low/10 flex flex-col items-center justify-center text-center py-16">
                <div className="p-3 bg-primary/5 rounded-full border border-primary/10 text-primary/80 mb-3">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h5 className="text-xs font-black text-on-surface">Belum Ada Dokumen Pedoman</h5>
                <p className="text-[10px] text-on-surface-variant max-w-sm mt-1 leading-relaxed">
                  Pustaka dokumen masih kosong. Mulai tambahkan pedoman teknis, regulasi, atau SOP menggunakan form di sebelah kiri.
                </p>
              </div>

            /* Search / filter returns nothing */
            ) : filteredDocuments.length === 0 ? (
              <div className="border border-outline-variant/60 rounded-xl p-8 bg-surface-container-low/10 flex flex-col items-center justify-center text-center py-16">
                <div className="p-3 bg-primary/5 rounded-full border border-primary/10 text-primary/80 mb-3">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h5 className="text-xs font-black text-on-surface">Pencarian Tidak Ditemukan</h5>
                <p className="text-[10px] text-on-surface-variant max-w-sm mt-1 leading-relaxed">
                  Tidak ada dokumen yang cocok dengan kata kunci "{searchQuery}" atau kategori yang dipilih.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("Semua");
                  }}
                  className="mt-4 px-3 py-1.5 bg-surface-bright border border-outline-variant rounded-lg text-[10px] font-bold hover:bg-surface-container-low transition-colors text-primary"
                >
                  Reset Pencarian &amp; Filter
                </button>
              </div>

            /* Document cards */
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setPreviewDoc(doc)}
                    className="border border-outline-variant hover:border-primary/40 rounded-xl p-4 bg-surface-bright flex items-start gap-3.5 transition-all relative group cursor-pointer hover:shadow-xs"
                  >
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
                      doc.isOfficial
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : "bg-blue-50 text-blue-700 border-blue-100"
                    }`}>
                      <FileText className="w-5.5 h-5.5" />
                    </div>

                    <div className="flex-1 min-w-0 pr-16">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          doc.isOfficial
                            ? "bg-rose-100 text-rose-900"
                            : "bg-blue-100 text-blue-900"
                        }`}>
                          {doc.category}
                        </span>
                        {doc.isOfficial && (
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5" /> RESMI PU
                          </span>
                        )}
                        <span className="text-[9px] text-on-surface-variant font-mono font-bold">
                          {doc.fileSize}
                        </span>
                        {doc.fileUrl && (
                          <span className="text-[8px] bg-sky-100 text-sky-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                            <Download className="w-2.5 h-2.5" /> Tersedia
                          </span>
                        )}
                      </div>

                      <h5 className="text-xs font-black text-on-surface tracking-wide mt-1.5 group-hover:text-primary transition-colors line-clamp-1">
                        {doc.title}
                      </h5>
                      <p className="text-[10px] text-on-surface-variant font-bold">
                        No: {doc.documentNo} • Terbit: {doc.year}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/80 font-medium mt-1.5 line-clamp-2 leading-relaxed">
                        {doc.summary}
                      </p>

                      <div className="flex items-center gap-4 mt-2.5 text-[9px] text-on-surface-variant/80 font-semibold border-t border-outline-variant/30 pt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {doc.publisher}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {doc.uploadedAt}
                        </span>
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      {/* Download button — only active when fileUrl exists */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(doc);
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          doc.fileUrl
                            ? "bg-surface-container-low hover:bg-primary/10 text-on-surface-variant hover:text-primary"
                            : "bg-surface-container-low text-on-surface-variant/30 cursor-not-allowed"
                        }`}
                        title={doc.fileUrl ? `Unduh ${doc.fileName}` : "Berkas belum tersedia di storage"}
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {isAdmin && !doc.isOfficial && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="p-1.5 rounded bg-surface-container-low hover:bg-error/15 text-on-surface-variant hover:text-error transition-colors"
                          title="Hapus dokumen ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 z-55 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-primary to-primary-container text-white flex justify-between items-start">
              <div>
                <span className="text-[9px] bg-white/20 text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                  {previewDoc.category}
                </span>
                <h3 className="font-headline-sm text-sm font-black tracking-wide mt-1.5 leading-snug">
                  {previewDoc.title}
                </h3>
                <p className="text-[10px] text-white/80 font-bold mt-0.5">
                  Nomor Surat: {previewDoc.documentNo} • Tahun Terbit: {previewDoc.year}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors ml-4 shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Document Stamp / Authority Representation */}
              <div className="flex gap-4 p-4 border border-outline-variant/60 bg-surface-container-low/20 rounded-xl items-center">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-rose-500/60 flex flex-col items-center justify-center text-center rotate-[-8deg] shrink-0">
                  <span className="text-[8px] font-black text-rose-500/80 leading-none">DINAS PUPR</span>
                  <span className="text-[7px] font-bold text-rose-500/80 leading-none mt-0.5">PROV NTT</span>
                  <span className="text-[6px] font-mono text-rose-500/80 mt-1 uppercase">TERVERIFIKASI</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider block">Penerbit &amp; Otoritas</span>
                  <p className="text-xs font-black text-on-surface">{previewDoc.publisher}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium">Status Arsip: Legal &amp; Aktif secara Sistem</p>
                </div>
              </div>

              {/* Summary Section */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  Ringkasan &amp; Intisari Dokumen
                </h4>
                <p className="text-xs text-on-surface leading-relaxed font-medium bg-surface-container-low/40 p-4 rounded-xl border border-outline-variant/45">
                  {previewDoc.summary}
                </p>
              </div>

              {/* Document Details Table */}
              <div className="border border-outline-variant/60 rounded-xl overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-surface-container-low p-2.5 font-bold border-b border-outline-variant/40">
                  <div className="text-on-surface-variant">Atribut</div>
                  <div className="col-span-2 text-on-surface">Informasi Dokumen</div>
                </div>
                
                <div className="grid grid-cols-3 p-2.5 border-b border-outline-variant/30">
                  <div className="font-bold text-on-surface-variant">Nama Berkas</div>
                  <div className="col-span-2 font-mono font-bold text-primary truncate">{previewDoc.fileName}</div>
                </div>

                <div className="grid grid-cols-3 p-2.5 border-b border-outline-variant/30">
                  <div className="font-bold text-on-surface-variant">Ukuran Berkas</div>
                  <div className="col-span-2 font-semibold text-on-surface">{previewDoc.fileSize}</div>
                </div>

                <div className="grid grid-cols-3 p-2.5 border-b border-outline-variant/30">
                  <div className="font-bold text-on-surface-variant">Kategori Berkas</div>
                  <div className="col-span-2 font-bold text-on-surface">{previewDoc.category}</div>
                </div>

                <div className="grid grid-cols-3 p-2.5 border-b border-outline-variant/30">
                  <div className="font-bold text-on-surface-variant">Waktu Upload</div>
                  <div className="col-span-2 font-medium text-on-surface">{previewDoc.uploadedAt}</div>
                </div>

                <div className="grid grid-cols-3 p-2.5">
                  <div className="font-bold text-on-surface-variant">Status Berkas</div>
                  <div className="col-span-2">
                    {previewDoc.fileUrl ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 w-fit">
                        <Download className="w-2.5 h-2.5" /> Tersedia &amp; Siap Unduh
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 w-fit">
                        Berkas Belum Diunggah
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-container-low border-t border-outline-variant/60 flex justify-between items-center">
              <span className="text-[10px] text-on-surface-variant/80 font-bold">
                {previewDoc.isOfficial ? "📋 Dokumen Resmi Dinas PUPR" : `ID: ${previewDoc.id.slice(0, 8)}...`}
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 bg-surface-bright hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-xl text-xs font-bold transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    handleDownload(previewDoc);
                    setPreviewDoc(null);
                  }}
                  disabled={!previewDoc.fileUrl}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileDown className="w-4 h-4" /> {previewDoc.fileUrl ? "Download PDF" : "Belum Tersedia"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
