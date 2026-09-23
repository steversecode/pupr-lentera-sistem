/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoads } from "../context/RoadContext";
import { UtilityRequest, UtilityType } from "../types";
import {
  FileText, Plus, UploadCloud, Search, X, Check, XCircle, CheckCircle2, Clock, Trash2
} from "lucide-react";

const MOCK_REQUESTS: UtilityRequest[] = [
  {
    id: "req-1",
    providerName: "PT PLN (Persero)",
    utilityType: "Listrik (PLN)",
    segmentId: "seg-1",
    segmentName: "Jl. Yos Sudarso",
    letterNumber: "PLN/NTT/2026/001",
    letterDate: "2026-09-10",
    status: "Pending",
    uploadedBy: "Budi Santoso",
    uploadedAt: "2026-09-15 10:00 WITA",
    documentUrl: "surat_pengajuan_pln.pdf"
  }
];

export const UtilityRequests: React.FC = () => {
  const { appRole } = useAuth();
  const { segments } = useRoads();
  const [requests, setRequests] = useState<UtilityRequest[]>(MOCK_REQUESTS);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<Partial<UtilityRequest>>({
    utilityType: "Listrik (PLN)",
    status: "Pending"
  });

  const filteredRequests = requests.filter(
    (req) =>
      req.providerName.toLowerCase().includes(search.toLowerCase()) ||
      req.letterNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteDocument = (reqId: string) => {
    if (window.confirm("Yakin ingin menghapus dokumen dari pengajuan ini?")) {
      setRequests(requests.map(req => req.id === reqId ? { ...req, documentUrl: undefined } : req));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.providerName || !form.letterNumber || !form.segmentId || !form.letterDate || !file) {
      alert("Harap lengkapi semua field wajib dan unggah dokumen surat.");
      return;
    }
    const newReq: UtilityRequest = {
      id: "req-" + Date.now(),
      providerName: form.providerName,
      utilityType: form.utilityType as UtilityType,
      segmentId: form.segmentId,
      segmentName: "Ruas " + form.segmentId,
      letterNumber: form.letterNumber,
      letterDate: form.letterDate,
      status: form.status as any,
      uploadedAt: new Date().toLocaleString("id-ID") + " WITA",
      uploadedBy: "User Sistem",
      documentUrl: file.name
    };
    setRequests([newReq, ...requests]);
    setShowModal(false);
    setForm({ utilityType: "Listrik (PLN)", status: "Pending" });
    setFile(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-7xl mx-auto font-sans text-on-background">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-headline-md font-black text-primary tracking-tight">
            Pengajuan Utilitas
          </h1>
          <p className="text-on-surface-variant font-label-md mt-1.5 text-sm">
            Manajemen surat permohonan izin pemasangan utilitas pada Rumija.
          </p>
        </div>
        {appRole === "admin" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-label-lg rounded-xl hover:bg-primary/90 transition-all shadow-md shrink-0 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Buat Pengajuan Baru
          </button>
        )}
      </div>

      <div className="bg-surface border border-outline-variant rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari provider atau no surat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-body-md text-on-surface placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-md uppercase tracking-wider text-[11px]">
                <th className="p-4 font-bold">Provider & Tipe</th>
                <th className="p-4 font-bold">Ruas Jalan</th>
                <th className="p-4 font-bold">No. Surat & Tanggal</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-body-sm text-sm">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-on-surface">{req.providerName}</p>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <FileText className="w-3.5 h-3.5" /> {req.utilityType}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-on-surface">{req.segmentName}</p>
                    <p className="text-xs text-on-surface-variant">ID: {req.segmentId}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-on-surface">{req.letterNumber}</p>
                    <p className="text-xs text-on-surface-variant">{req.letterDate}</p>
                  </td>
                  <td className="p-4">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.status === "Pending"
                          ? "bg-amber-100 text-amber-800"
                          : req.status === "Disetujui"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-error/10 text-error"
                      }`}
                    >
                      {req.status === "Pending" ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : req.status === "Disetujui" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {req.status}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {req.documentUrl ? (
                        <>
                          <button className="text-primary hover:underline font-semibold text-xs flex items-center gap-1">
                            <FileText className="w-4 h-4" /> Lihat Dokumen
                          </button>
                          {appRole === "admin" && (
                            <button 
                              onClick={() => handleDeleteDocument(req.id)}
                              className="text-error hover:underline font-semibold text-xs flex items-center gap-1"
                              title="Hapus Dokumen"
                            >
                              <Trash2 className="w-4 h-4" /> Hapus
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-on-surface-variant italic">Tidak ada dokumen</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                    Tidak ada pengajuan utilitas yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant bg-surface-container-lowest">
              <h2 className="text-lg font-headline-md font-bold text-primary flex items-center gap-2">
                <FileText className="w-5 h-5" /> Buat Pengajuan Baru
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-container-highest"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Nama Provider
                  </label>
                  <input
                    required
                    type="text"
                    value={form.providerName || ""}
                    onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Contoh: PT PLN (Persero)"
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Tipe Utilitas
                  </label>
                  <select
                    required
                    value={form.utilityType || ""}
                    onChange={(e) => setForm({ ...form, utilityType: e.target.value as UtilityType })}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="Listrik (PLN)">Listrik (PLN)</option>
                    <option value="Telekomunikasi / Fiber Optik">Telekomunikasi / FO</option>
                    <option value="Air Bersih (PDAM)">Air Bersih (PDAM)</option>
                    <option value="Saluran Gas / BBM">Saluran Gas / BBM</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    ID Ruas
                  </label>
                  <select
                    required
                    value={form.segmentId || ""}
                    onChange={(e) => setForm({ ...form, segmentId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Pilih Ruas Jalan...</option>
                    {segments.map((seg) => (
                      <option key={seg.id} value={seg.id}>
                        {seg.name} ({seg.code}) - {seg.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    No Surat
                  </label>
                  <input
                    required
                    type="text"
                    value={form.letterNumber || ""}
                    onChange={(e) => setForm({ ...form, letterNumber: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="Nomor Surat"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Tanggal Surat
                  </label>
                  <input
                    required
                    type="date"
                    value={form.letterDate || ""}
                    onChange={(e) => setForm({ ...form, letterDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="mt-2">
                 <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Upload Surat (PDF)
                  </label>
                  <div className="relative border-2 border-dashed border-primary/40 rounded-xl p-6 text-center hover:bg-primary-container/20 transition-colors cursor-pointer group">
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="w-8 h-8 mx-auto text-primary/60 group-hover:text-primary transition-colors mb-3" />
                    <p className="text-sm font-semibold text-primary">
                      {file ? file.name : "Klik atau drag file PDF ke sini"}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Maks. 5MB"}
                    </p>
                  </div>
              </div>
            </form>
            
            <div className="p-5 border-t border-outline-variant bg-surface-container-lowest flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setFile(null);
                }}
                className="px-5 py-2.5 rounded-xl font-label-lg font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-label-lg font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-md"
              >
                <Check className="w-5 h-5" /> Simpan Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
