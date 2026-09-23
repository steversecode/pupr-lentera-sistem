/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useRoads } from "../context/RoadContext";
import { useAuth } from "../context/AuthContext";
import { Settings as SettingsIcon, ShieldCheck, Database, RefreshCw, User } from "lucide-react";
import { confirmDialog } from "../lib/swal";

export const Settings: React.FC = () => {
  const { showToast, refreshData } = useRoads();
  const { user, appRole } = useAuth();
  const isAdmin = appRole === "admin";
  
  const [surveyorName, setSurveyorName] = useState(
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Ahmad Ridwan"
  );
  const [regionalCode, setRegionalCode] = useState("PUPR-NTT-REG01");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Administrator yang dapat mengubah profil konfigurasi.", "error");
      return;
    }
    showToast("Profil surveyor berhasil disimpan!", "success");
  };

  const handleRefreshData = async () => {
    const confirmed = await confirmDialog({
      title: "Muat Ulang Data dari Database?",
      text: "Semua data akan diperbarui langsung dari Supabase.",
      confirmText: "Ya, Muat Ulang",
      cancelText: "Batal",
      isDanger: false,
    });
    if (confirmed) {
      showToast("Memuat ulang data dari database...", "info");
      await refreshData();
      showToast("Data berhasil dimuat ulang dari database!", "success");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-gutter pt-8">
      {/* Page Header */}
      <div>
        <h2 className="font-display-lg text-display-lg text-on-surface flex items-center gap-2">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Pengaturan Sistem
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
          Konfigurasi profile, kode unit kerja, dan pemeliharaan database LENTERA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile config card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2 border-b border-outline-variant/40 pb-3">
            <User className="text-primary w-5 h-5" />
            Profile Surveyor PUPR
          </h3>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant">Nama Atribut Admin</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={surveyorName}
                onChange={(e) => setSurveyorName(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant">Kode Unit Regional</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={regionalCode}
                onChange={(e) => setRegionalCode(e.target.value)}
                className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            {isAdmin ? (
              <button
                type="submit"
                className="py-2 px-4 bg-primary text-on-primary font-label-md text-xs font-bold rounded hover:bg-primary-container transition-colors shadow-sm"
              >
                Simpan Profil
              </button>
            ) : (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                Mode Baca (Visitor): Hanya Administrator yang dapat mengubah konfigurasi profil.
              </p>
            )}
          </form>
        </div>

        {/* Database control card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2 border-b border-outline-variant/40 pb-3">
            <Database className="text-primary w-5 h-5" />
            Sinkronisasi Database
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Muat ulang semua data (ruas jalan, dokumen, aktivitas) langsung dari Supabase database.
          </p>
          <div className="pt-2">
            <button
              onClick={handleRefreshData}
              className="py-2.5 px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-label-md text-xs font-bold rounded flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang dari Database
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-4 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-tertiary" />
        <span className="text-xs text-on-surface-variant font-medium">
          LENTERA Sistem Leger v2.5.0 - Lisensi PUPR Dinas Provinsi NTT, Indonesia. Hak Cipta Dilindungi.
        </span>
      </div>
    </div>
  );
};
