/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { useRoads } from "../context/RoadContext";
import { useAuth } from "../context/AuthContext";
import { confirmDialog } from "../lib/swal";
import { LegerDocument, RoadSegment } from "../types";
import {
  FileText,
  Award,
  UploadCloud,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Sparkles,
  Plus,
  FileCode,
  FileImage,
  Calendar,
  ChevronRight,
  Info,
  ShieldCheck,
  AlertTriangle,
  User,
  ExternalLink,
  RefreshCw,
  Eye
} from "lucide-react";

export const LegerDocuments: React.FC = () => {
  const {
    segments,
    documents,
    addDocument,
    updateDocumentStatus,
    deleteDocument,
    showToast
  } = useRoads();
  const { appRole } = useAuth();
  const isAdmin = appRole === "admin";

  // Navigation states
  const [activeFilter, setActiveFilter] = useState<"semua" | "kartu_leger" | "sertifikat_jalan">("semua");
  const [statusFilter, setStatusFilter] = useState<"semua" | "Pending" | "Tervalidasi" | "Ditolak">("semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload Form states
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(segments[0]?.id || "");
  const [docType, setDocType] = useState<"kartu_leger" | "sertifikat_jalan">("kartu_leger");
  const [documentNo, setDocumentNo] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [useAiExtraction, setUseAiExtraction] = useState(true);

  // File selection states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Modal state
  const [previewDoc, setPreviewDoc] = useState<LegerDocument | null>(null);

  // Find segment detail helper
  const getSegmentName = (id: string) => {
    const seg = segments.find((s) => s.id === id);
    return seg ? `${seg.name} (${seg.code})` : "Ruas tidak dikenal";
  };

  const getSegmentDetail = (id: string): RoadSegment | undefined => {
    return segments.find((s) => s.id === id);
  };

  // Drag & Drop Handlers
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
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "application/octet-stream"];
    // Accept standard extension check as well
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAllowedExt = ["pdf", "jpg", "jpeg", "png", "dwg", "docx"].includes(ext || "");

    if (!isAllowedExt) {
      showToast("Tipe berkas tidak didukung. Harap pilih PDF, JPG, PNG, atau DWG.", "error");
      return;
    }

    setSelectedFile(file);
    showToast(`Berkas "${file.name}" berhasil dipilih.`, "info");

    // Perform AI Extraction if checked
    if (useAiExtraction) {
      triggerAiExtraction(file, selectedSegmentId, docType);
    }
  };

  // Simulated Gemini AI Extraction
  const triggerAiExtraction = (file: File, segmentId: string, type: "kartu_leger" | "sertifikat_jalan") => {
    setIsScanning(true);
    const segment = getSegmentDetail(segmentId);

    setTimeout(() => {
      setIsScanning(false);
      if (!segment) return;

      const randomNo = Math.floor(100 + Math.random() * 900);
      const currentYear = new Date().getFullYear();
      
      if (type === "kartu_leger") {
        setDocumentNo(`KL-${segment.code}/${currentYear}/${randomNo}`);
        setIssueDate(new Date().toISOString().split("T")[0]);
        setNotes(`Diekstrak otomatis melalui LENTERA Gemini OCR dari berkas "${file.name}". Semua koordinat awal (${segment.startLat}, ${segment.startLng}) dan panjang jalan (${segment.lengthKm} KM) telah sinkron.`);
      } else if (type === "sertifikat_jalan") {
        setDocumentNo(`HP-${segment.code.replace(/\./g, "")}/${currentYear}/SRT-${randomNo}`);
        setIssueDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]); // 1 month ago
        setNotes(`Sertifikat Hak Pakai Jalan terdeteksi Sah. Terdaftar atas nama Pemerintah Provinsi Nusa Tenggara Timur untuk daerah ${segment.district}.`);
      }
      showToast("Gemini AI berhasil mengekstrak metadata dokumen secara akurat!", "success");
    }, 1500);
  };

  // Reset form
  const resetForm = () => {
    setSelectedFile(null);
    setDocumentNo("");
    setIssueDate("");
    setNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      showToast("Harap pilih atau drag-and-drop berkas terlebih dahulu.", "error");
      return;
    }

    if (!documentNo) {
      showToast("Harap isi Nomor Dokumen.", "error");
      return;
    }

    if (!issueDate) {
      showToast("Harap tentukan Tanggal Terbit.", "error");
      return;
    }

    // Prepare fileSize label
    const sizeInMb = (selectedFile.size / (1024 * 1024)).toFixed(1);
    const fileSizeLabel = selectedFile.size > 0 ? `${sizeInMb} MB` : "2.4 MB";

    setIsUploading(true);
    setUploadProgress(0);

    await addDocument({
      segmentId: selectedSegmentId,
      type: docType,
      fileName: selectedFile.name,
      fileSize: fileSizeLabel,
      documentNo,
      issueDate,
      notes: notes || "Tidak ada catatan tambahan."
    }, selectedFile, (pct) => setUploadProgress(pct));

    setIsUploading(false);
    resetForm();
  };

  // Filtered Documents
  const filteredDocs = documents.filter((doc) => {
    const segment = getSegmentDetail(doc.segmentId);
    const segmentName = segment ? segment.name : "";
    const segmentCode = segment ? segment.code : "";

    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      segmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      segmentCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      activeFilter === "semua" || doc.type === activeFilter;

    const matchesStatus =
      statusFilter === "semua" || doc.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Download Handler
  const handleDownload = (doc: LegerDocument) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, "_blank");
    } else {
      showToast(`Dokumen fisik "${doc.fileName}" belum diunggah.`, "error");
    }
  };

  return (
    <div className="p-margin_mobile md:p-margin_desktop py-6">
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-sans text-2xl font-black tracking-tight text-on-background flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Kartu Leger &amp; Sertifikat Jalan
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Portal arsip digital untuk pencatatan Leger Jalan Provinsi (Kartu Leger) dan legalitas lahan jalan (Sertifikat Hak Pakai).
          </p>
        </div>
        <div className="flex items-center gap-2 self-start bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-4.5 py-2.5 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>Gemini AI Smart Extraction Aktif</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Upload Form (Left Panel) */}
        {isAdmin && (
          <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-sans font-bold text-base text-on-surface mb-4 flex items-center gap-2 pb-3 border-b border-outline-variant/60">
              <UploadCloud className="w-5 h-5 text-primary" />
              Unggah Dokumen Baru
            </h3>

            <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
              
              {/* Select Ruas Jalan */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Pilih Ruas Jalan
                </label>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => {
                    setSelectedSegmentId(e.target.value);
                    if (selectedFile && useAiExtraction) {
                      triggerAiExtraction(selectedFile, e.target.value, docType);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                >
                  {segments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      [{seg.code}] {seg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis Dokumen Radio Buttons */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Jenis Dokumen
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDocType("kartu_leger");
                      if (selectedFile && useAiExtraction) {
                        triggerAiExtraction(selectedFile, selectedSegmentId, "kartu_leger");
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg border font-semibold text-xs transition-all ${
                      docType === "kartu_leger"
                        ? "bg-primary/5 text-primary border-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Kartu Leger (KL)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDocType("sertifikat_jalan");
                      if (selectedFile && useAiExtraction) {
                        triggerAiExtraction(selectedFile, selectedSegmentId, "sertifikat_jalan");
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg border font-semibold text-xs transition-all ${
                      docType === "sertifikat_jalan"
                        ? "bg-primary/5 text-primary border-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Sertifikat (SHP)</span>
                  </button>
                </div>
              </div>

              {/* Drag & Drop File Zone */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Unggah Berkas (PDF, JPG, PNG, atau DWG)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[140px] relative overflow-hidden ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : selectedFile
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-outline-variant hover:border-primary/50 hover:bg-surface-container-low"
                  }`}
                >
                  {isScanning && (
                    <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-2.5 z-10 animate-fade-in">
                      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                      <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>Mengekstrak Metadata dengan Gemini AI...</span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant max-w-[200px]">Membaca dokumen, mencocokkan koordinat geometris, dan mengisi form...</span>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.dwg,.docx"
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                        {selectedFile.name.endsWith(".pdf") ? (
                          <FileText className="w-6 h-6" />
                        ) : selectedFile.name.endsWith(".dwg") ? (
                          <FileCode className="w-6 h-6" />
                        ) : (
                          <FileImage className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-on-surface truncate max-w-[240px]">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Terpilih
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className="w-10 h-10 text-on-surface-variant/60" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">
                          Klik untuk menelusuri berkas atau seret ke sini
                        </p>
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Ukuran maksimal berkas: 20MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Assistant Switcher */}
              <div className="bg-surface-container-low border border-outline-variant/60 rounded-lg p-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="aiExtraction"
                  checked={useAiExtraction}
                  onChange={(e) => setUseAiExtraction(e.target.checked)}
                  className="mt-1 rounded border-outline text-primary focus:ring-primary h-4 w-4"
                />
                <div className="leading-tight">
                  <label htmlFor="aiExtraction" className="text-xs font-bold text-on-surface flex items-center gap-1 cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Ekstraksi Dokumen Otomatis (Gemini AI)
                  </label>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    Gunakan Gemini LLM untuk membaca teks berkas dan otomatis mengisi Nomor Dokumen &amp; Tanggal Terbit.
                  </p>
                </div>
              </div>

              {/* Form Metadata Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Nomor Dokumen
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: KL-011.11..."
                    value={documentNo}
                    onChange={(e) => setDocumentNo(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Tanggal Terbit
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Notes / Catatan */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  Catatan Dokumen / Deskripsi
                </label>
                <textarea
                  rows={2}
                  placeholder="Tambahkan rincian validasi fisik, tanda batas, atau catatan lainnya..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col gap-2 mt-2">
                {isUploading && (
                  <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-1.5 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isUploading || isScanning}
                    className="flex-1 py-2.5 px-4 bg-surface-container-high hover:bg-surface-dim text-on-surface font-bold text-xs rounded-lg border border-outline-variant transition-all text-center disabled:opacity-50"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || isScanning}
                    className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-lg transition-all text-center shadow-md border border-primary-container flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Mengunggah ({Math.round(uploadProgress)}%)
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Simpan Arsip
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Quick Informational Notice */}
          <div className="bg-blue-50 border border-blue-150 rounded-xl p-4.5 text-blue-950 text-xs flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold block mb-0.5">Informasi Legalitas</span>
              Sesuai Peraturan Menteri PUPR, setiap ruas Jalan Provinsi wajib dilengkapi dengan Kartu Leger yang diperbarui minimal sekali setiap 5 tahun, dan memiliki Sertifikat Hak Pakai guna pengamanan aset daerah dari sengketa.
            </div>
          </div>
        </div>
        )}

        {/* Documents Registry Table/Grid (Right Panel) */}
        <div className={`${isAdmin ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col gap-6`}>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[500px]">
            
            {/* Search, Filter Tabs & Header */}
            <div className="mb-6">
              <h3 className="font-sans font-bold text-base text-on-surface mb-4">
                Register Arsip Dokumen Leger
              </h3>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nomor dokumen, nama ruas, kode ruas, pengunggah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low/50 border border-outline-variant/60 rounded-xl p-3">
                {/* Type Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mr-1">Tipe:</span>
                  <button
                    onClick={() => setActiveFilter("semua")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeFilter === "semua"
                        ? "bg-primary text-white shadow-xs"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setActiveFilter("kartu_leger")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeFilter === "kartu_leger"
                        ? "bg-primary text-white shadow-xs"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    Kartu Leger
                  </button>
                  <button
                    onClick={() => setActiveFilter("sertifikat_jalan")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeFilter === "sertifikat_jalan"
                        ? "bg-primary text-white shadow-xs"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    Sertifikat
                  </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mr-1">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="semua">Semua Status</option>
                    <option value="Tervalidasi">Tervalidasi</option>
                    <option value="Pending">Pending</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Document Cards Container */}
            <div className="flex-1 overflow-y-auto max-h-[500px] flex flex-col gap-3.5 pr-1">
              {filteredDocs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6 border border-dashed border-outline-variant rounded-xl bg-surface-container-low/30">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant/40 mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-on-surface">Dokumen Tidak Ditemukan</h4>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-[280px]">
                    Tidak ada arsip dokumen yang cocok dengan filter atau kata kunci pencarian Anda.
                  </p>
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const segment = getSegmentDetail(doc.segmentId);

                  return (
                    <div
                      key={doc.id}
                      className="border border-outline-variant hover:border-primary/40 rounded-xl p-4 bg-surface-container-lowest hover:bg-surface-container-low/10 transition-all shadow-xs flex flex-col md:flex-row md:items-center gap-4"
                    >
                      {/* Left icon design based on type */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        doc.type === "kartu_leger"
                          ? "bg-rose-50 text-rose-700 border border-rose-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {doc.type === "kartu_leger" ? (
                          <FileText className="w-6 h-6" />
                        ) : (
                          <Award className="w-6 h-6" />
                        )}
                      </div>

                      {/* Content column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            doc.type === "kartu_leger"
                              ? "bg-rose-100 text-rose-900"
                              : "bg-amber-100 text-amber-900"
                          }`}>
                            {doc.type === "kartu_leger" ? "Kartu Leger" : "Sertifikat (SHP)"}
                          </span>

                          {/* Status Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            doc.status === "Tervalidasi"
                              ? "bg-emerald-100 text-emerald-900"
                              : doc.status === "Ditolak"
                              ? "bg-rose-100 text-rose-900"
                              : "bg-amber-100 text-amber-900"
                          }`}>
                            {doc.status === "Tervalidasi" ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            ) : doc.status === "Ditolak" ? (
                              <XCircle className="w-3 h-3 text-rose-700" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-700" />
                            )}
                            {doc.status}
                          </span>
                        </div>

                        {/* Title of document */}
                        <h4 className="text-xs font-black text-on-background tracking-wide truncate">
                          {doc.documentNo}
                        </h4>
                        
                        {/* File detail */}
                        <p className="text-[11px] text-on-surface-variant font-medium mt-0.5 flex items-center gap-1 truncate">
                          <span>File: {doc.fileName}</span>
                          <span className="text-outline-variant/60">•</span>
                          <span>{doc.fileSize}</span>
                        </p>

                        {/* Road Link and date */}
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-[10px] font-bold text-on-surface-variant/85 uppercase tracking-wide">
                          <span className="text-primary truncate max-w-[200px]">
                            {segment ? segment.name : "Ruas Jalan"}
                          </span>
                          <span className="hidden sm:inline text-outline-variant/60">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Terbit: {doc.issueDate}
                          </span>
                        </div>
                      </div>

                      {/* Right Action panel */}
                      <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-outline-variant/50 md:pl-3">
                        <div className="flex items-center gap-1.5 w-full justify-between md:justify-end">
                          {/* Eye / Preview button */}
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 rounded-lg bg-surface-container-high text-on-surface hover:text-primary transition-colors border border-outline-variant/60"
                            title="Detail / Pratinjau Dokumen"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download mock */}
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 rounded-lg bg-surface-container-high text-on-surface hover:text-primary transition-colors border border-outline-variant/60"
                            title="Unduh Berkas"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={async () => {
                                const confirmed = await confirmDialog({
                                  title: "Hapus Dokumen?",
                                  text: `Dokumen "${doc.fileName}" akan dihapus secara permanen.`,
                                  confirmText: "Ya, Hapus",
                                  cancelText: "Batal",
                                  isDanger: true,
                                });
                                if (confirmed) {
                                  deleteDocument(doc.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-100"
                              title="Hapus Dokumen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Admin verification action row (Only visible for validation) */}
                        <div className="flex items-center gap-1 mt-1.5 w-full md:w-auto">
                          {isAdmin && doc.status === "Pending" && (
                            <div className="flex gap-1 w-full justify-end">
                              <button
                                onClick={() => updateDocumentStatus(doc.id, "Tervalidasi")}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Validasi
                              </button>
                              <button
                                onClick={() => updateDocumentStatus(doc.id, "Ditolak")}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5"
                              >
                                <XCircle className="w-2.5 h-2.5" />
                                Tolak
                              </button>
                            </div>
                          )}
                          {doc.status !== "Pending" && (
                            <button
                              onClick={() => updateDocumentStatus(doc.id, "Pending")}
                              className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface hover:bg-surface-dim font-bold text-[9px] uppercase tracking-wider border border-outline-variant/60"
                            >
                              Reset Verifikasi
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Document Detail Preview Modal (Cosmic styling) */}
      {previewDoc && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            
            {/* Header */}
            <div className={`p-5 text-white flex justify-between items-center ${
              previewDoc.type === "kartu_leger" ? "bg-primary-container" : "bg-[#0c2a47]"
            }`}>
              <div className="flex items-center gap-2.5">
                {previewDoc.type === "kartu_leger" ? (
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <FileText className="w-5 h-5 text-on-primary" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Award className="w-5 h-5 text-on-primary" />
                  </div>
                )}
                <div>
                  <h4 className="font-sans font-black text-sm tracking-wide">
                    {previewDoc.type === "kartu_leger" ? "PRATINJAU KARTU LEGER JALAN" : "PRATINJAU SERTIFIKAT JALAN"}
                  </h4>
                  <p className="text-[10px] text-white/80 font-bold tracking-wider uppercase mt-0.5">
                    PEMERINTAH PROVINSI NUSA TENGGARA TIMUR
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Document Body Design (Looks like an official Certificate paper card) */}
            <div className="p-6 bg-gradient-to-b from-amber-50/20 to-white flex flex-col gap-5 border-b border-outline-variant/40">
              
              {/* Official Seal Mock Logo */}
              <div className="flex flex-col items-center text-center pb-2.5 border-b border-outline-variant/40">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center mb-1">
                  <span className="text-primary font-black text-sm font-mono tracking-widest">NTT</span>
                </div>
                <h5 className="text-[10px] font-black text-on-surface tracking-widest uppercase">
                  DINAS PEKERJAAN UMUM DAN PENATAAN RUANG
                </h5>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-wider mt-0.5">
                  BIDANG BINA MARGA • REGISTER ARSIP NEGARA
                </p>
              </div>

              {/* Certificate content rows */}
              <div className="flex flex-col gap-3 font-body-sm text-xs">
                
                {/* Document Number */}
                <div className="grid grid-cols-12 border-b border-outline-variant/20 pb-2">
                  <span className="col-span-4 text-on-surface-variant font-bold uppercase text-[9px] tracking-wider">No. Dokumen</span>
                  <span className="col-span-8 font-mono font-bold text-on-background text-xs">
                    {previewDoc.documentNo}
                  </span>
                </div>

                {/* Road Segment info */}
                <div className="grid grid-cols-12 border-b border-outline-variant/20 pb-2">
                  <span className="col-span-4 text-on-surface-variant font-bold uppercase text-[9px] tracking-wider">Ruas Jalan</span>
                  <div className="col-span-8">
                    <span className="font-bold text-on-background block">
                      {getSegmentName(previewDoc.segmentId)}
                    </span>
                    {getSegmentDetail(previewDoc.segmentId) && (
                      <span className="text-[10px] text-primary font-bold block mt-0.5">
                        Spesifikasi: {getSegmentDetail(previewDoc.segmentId)?.lengthKm} KM / {getSegmentDetail(previewDoc.segmentId)?.widthM} Meter / {getSegmentDetail(previewDoc.segmentId)?.surfaceType}
                      </span>
                    )}
                  </div>
                </div>

                {/* Issuance Date */}
                <div className="grid grid-cols-12 border-b border-outline-variant/20 pb-2">
                  <span className="col-span-4 text-on-surface-variant font-bold uppercase text-[9px] tracking-wider">Tanggal Terbit</span>
                  <span className="col-span-8 font-bold text-on-background">
                    {previewDoc.issueDate}
                  </span>
                </div>

                {/* Upload Details */}
                <div className="grid grid-cols-12 border-b border-outline-variant/20 pb-2">
                  <span className="col-span-4 text-on-surface-variant font-bold uppercase text-[9px] tracking-wider">Registrasi</span>
                  <span className="col-span-8 text-on-background leading-relaxed">
                    Diunggah oleh <b className="text-on-surface">{previewDoc.uploadedBy}</b> pada <i>{previewDoc.uploadedAt}</i>
                  </span>
                </div>

                {/* Status validation */}
                <div className="grid grid-cols-12 border-b border-outline-variant/20 pb-2">
                  <span className="col-span-4 text-on-surface-variant font-bold uppercase text-[9px] tracking-wider">Status Validasi</span>
                  <div className="col-span-8 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                      previewDoc.status === "Tervalidasi"
                        ? "bg-emerald-100 text-emerald-900"
                        : previewDoc.status === "Ditolak"
                        ? "bg-rose-100 text-rose-900"
                        : "bg-amber-100 text-amber-900"
                    }`}>
                      {previewDoc.status}
                    </span>
                    {previewDoc.status === "Tervalidasi" && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Berkas Asli Terverifikasi
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-on-surface-variant font-bold uppercase text-[9px] tracking-wider">Deskripsi/Catatan</span>
                  <span className="col-span-8 text-on-surface-variant leading-relaxed text-[11px] italic">
                    "{previewDoc.notes || "Tidak ada catatan tambahan."}"
                  </span>
                </div>

              </div>

              {/* Mock Barcode / Digital Signature area */}
              <div className="mt-4 flex justify-between items-center bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-black tracking-wider uppercase text-on-surface-variant">BARCODE VALIDASI DIGITAL</span>
                  <div className="w-32 h-6 bg-white border border-outline-variant flex items-center justify-around px-2 font-mono text-[9px] text-on-surface-variant tracking-widest mt-1">
                    ||||| | | |||| || | || |||
                  </div>
                </div>

                <div className="flex flex-col items-center text-center pr-2">
                  <span className="text-[8px] font-black text-on-surface-variant tracking-wider uppercase">TANDA TANGAN DIGITAL</span>
                  <span className="text-[10px] font-mono italic text-emerald-700 font-bold tracking-tight mt-1 flex items-center gap-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> SECURE_NTT_DinasPUPR
                  </span>
                  <span className="text-[7px] text-on-surface-variant/75 mt-0.5 uppercase">TERVERIFIKASI INTEGRITAS</span>
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="bg-surface-container-low px-6 py-4 flex items-center justify-between">
              <button
                onClick={() => handleDownload(previewDoc)}
                className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm border border-primary-container"
              >
                <Download className="w-4 h-4" />
                Unduh PDF Dokumen
              </button>

              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-dim text-on-surface font-bold text-xs rounded-lg border border-outline-variant/60 transition-all"
              >
                Tutup Pratinjau
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
