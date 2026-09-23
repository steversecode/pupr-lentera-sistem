/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useRoads } from "../context/RoadContext";
import {
  ArrowLeft,
  Users,
  UserCog,
  Shield,
  HardHat,
  ClipboardCheck,
  MapPin,
  Hash,
  Calendar,
  Mail,
  CheckCircle2,
  XCircle,
  Edit3,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { confirmDialog } from "../lib/swal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SystemUser {
  id: string;
  full_name: string;
  email: string;
  role: "Administrator" | "Visitor";
  district_assignment: string | null;
  regional_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type UserRole = "Administrator" | "Visitor";

const ROLES: UserRole[] = [
  "Administrator",
  "Visitor",
];

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  Administrator: <Shield className="w-4 h-4" />,
  Visitor: <Eye className="w-4 h-4" />,
};

const ROLE_COLORS: Record<UserRole, string> = {
  Administrator:
    "bg-primary/10 text-primary border border-primary/20",
  Visitor:
    "bg-surface-container-high text-on-surface border border-outline-variant",
};

const ROLE_TEXT_COLORS: Record<UserRole, string> = {
  Administrator: "text-primary",
  Visitor: "text-on-surface-variant",
};

function getAvatarUrl(email: string, name: string) {
  const seed = encodeURIComponent(email || name);
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${seed}&backgroundColor=1d3d72,0f2a5a&scale=90`;
}

function formatDatetime(dateStr: string) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-3.5 border-b border-outline-variant/50 last:border-0">
    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <div className="text-sm font-semibold text-on-surface">{value}</div>
    </div>
  </div>
);

// ─── Change Password Modal ────────────────────────────────────────────────────

interface ChangePasswordModalProps {
  targetUser: SystemUser;
  onClose: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  targetUser,
  onClose,
  showToast,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6) return { level: "weak", label: "Terlalu pendek", color: "bg-error" };
    if (pwd.length < 8) return { level: "fair", label: "Cukup", color: "bg-secondary" };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd))
      return { level: "strong", label: "Kuat", color: "bg-tertiary" };
    return { level: "good", label: "Baik", color: "bg-primary" };
  };

  const strength = passwordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    const confirmed = await confirmDialog({
      title: "Konfirmasi Ganti Sandi",
      text: `Kata sandi akun "${targetUser.full_name}" akan diubah. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, Ganti Sandi",
      cancelText: "Batal",
      isDanger: true,
    });
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc(
        "admin_update_user_password",
        {
          target_user_id: targetUser.id,
          new_password: newPassword,
        }
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      showToast(
        `Kata sandi "${targetUser.full_name}" berhasil diperbarui.`,
        "success"
      );
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-sm">
                Ganti Kata Sandi
              </h3>
              <p className="text-xs text-on-surface-variant">{targetUser.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-error-container border border-error/20 rounded-lg text-on-error-container text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-error shrink-0" />
              {error}
            </div>
          )}

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant">
              Kata Sandi Baru <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength indicator */}
            {strength && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {["weak", "fair", "good", "strong"].map((lvl, i) => (
                    <div
                      key={lvl}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        ["weak", "fair", "good", "strong"].indexOf(strength.level) >= i
                          ? strength.color
                          : "bg-outline-variant"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant">
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant">
              Konfirmasi Kata Sandi <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className={`w-full bg-surface-bright border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 transition-all ${
                  confirmPassword && confirmPassword !== newPassword
                    ? "border-error focus:border-error focus:ring-error"
                    : confirmPassword && confirmPassword === newPassword
                    ? "border-tertiary focus:border-tertiary focus:ring-tertiary"
                    : "border-outline-variant focus:border-primary focus:ring-primary"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && (
              <p
                className={`text-[10px] font-semibold flex items-center gap-1 ${
                  confirmPassword === newPassword ? "text-tertiary" : "text-error"
                }`}
              >
                {confirmPassword === newPassword ? (
                  <><CheckCircle2 className="w-3 h-3" /> Kata sandi cocok</>
                ) : (
                  <><AlertCircle className="w-3 h-3" /> Kata sandi tidak cocok</>
                )}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/50 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors border border-outline-variant"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              {isLoading ? "Memproses..." : "Ganti Sandi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Edit Profile Section ─────────────────────────────────────────────────────

interface EditProfileSectionProps {
  user: SystemUser;
  districtList: string[];
  onSaved: (updated: SystemUser) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const EditProfileSection: React.FC<EditProfileSectionProps> = ({
  user,
  districtList,
  onSaved,
  showToast,
}) => {
  const [form, setForm] = useState({
    full_name: user.full_name,
    role: user.role as UserRole,
    district_assignment: user.district_assignment || "",
    regional_code: user.regional_code || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError("Nama lengkap tidak boleh kosong.");
      return;
    }
    setIsLoading(true);
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        full_name: form.full_name.trim(),
        role: form.role,
        district_assignment: form.district_assignment || null,
        regional_code: form.regional_code || null,
      })
      .eq("id", user.id);
    setIsLoading(false);

    if (updateErr) {
      setError(`Gagal menyimpan: ${updateErr.message}`);
      return;
    }
    showToast("Data profil berhasil disimpan.", "success");
    onSaved({
      ...user,
      ...form,
      district_assignment: form.district_assignment || null,
      regional_code: form.regional_code || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-error-container rounded-lg text-xs text-on-error-container border border-error/20">
          <AlertCircle className="w-4 h-4 shrink-0 text-error" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
        {/* Nama */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-on-surface-variant">
            Nama Lengkap <span className="text-error">*</span>
          </label>
          <input
            type="text"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            required
          />
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-on-surface-variant">Role / Jabatan</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none bg-no-repeat bg-[right_0.75rem_center]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")" }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Kode Regional */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-on-surface-variant">Kode Regional</label>
          <input
            type="text"
            name="regional_code"
            value={form.regional_code}
            onChange={handleChange}
            placeholder="PUPR-NTT-..."
            className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Wilayah */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-on-surface-variant">Wilayah Tugas</label>
          <select
            name="district_assignment"
            value={form.district_assignment}
            onChange={handleChange}
            className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none bg-no-repeat bg-[right_0.75rem_center]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")" }}
          >
            <option value="">— Semua Wilayah —</option>
            {districtList.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-outline-variant/50">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 mt-4 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
};

// ─── Main UserDetail Component ────────────────────────────────────────────────

interface UserDetailProps {
  userId: string;
  onBack: () => void;
}

export const UserDetail: React.FC<UserDetailProps> = ({ userId, onBack }) => {
  const { user: currentUser, appRole } = useAuth();
  const { showToast, districtList } = useRoads();

  const [userData, setUserData] = useState<SystemUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "edit" | "security">(
    "profile"
  );
  const [showChangePassword, setShowChangePassword] = useState(false);

  const isAdmin = appRole === "admin";
  const isSelf = currentUser?.id === userId;

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      showToast("Gagal memuat data user.", "error");
    } else {
      setUserData(data as SystemUser);
    }
    setIsLoading(false);
  }, [userId, showToast]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-on-surface-variant font-medium">Memuat data pengguna...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-error" />
        <p className="text-sm text-on-surface-variant font-medium">User tidak ditemukan.</p>
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-primary text-on-primary rounded-lg">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>
    );
  }

  const TABS = [
    { id: "profile", label: "Profil", icon: <Users className="w-4 h-4" /> },
    ...(isAdmin ? [{ id: "edit", label: "Edit Data", icon: <Edit3 className="w-4 h-4" /> }] : []),
    ...(isAdmin ? [{ id: "security", label: "Keamanan", icon: <KeyRound className="w-4 h-4" /> }] : []),
  ] as { id: "profile" | "edit" | "security"; label: string; icon: React.ReactNode }[];

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 sm:p-gutter pt-6 sm:pt-8 pb-12">
      {/* ── Breadcrumb Navigation ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Manajemen Pengguna
        </button>
        <span className="text-outline/50">/</span>
        <span className="text-sm font-bold text-on-surface truncate">{userData.full_name}</span>
      </div>

      {/* ── Hero Header Card ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="h-24 sm:h-28 bg-gradient-to-br from-primary via-primary to-primary/60 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
              backgroundSize: "16px 16px",
            }}
          />
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          {/* Avatar overlapping banner */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-5">
            <div className="flex items-end gap-4 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={getAvatarUrl(userData.email, userData.full_name)}
                  alt={userData.full_name}
                  className="w-20 h-20 rounded-2xl border-4 border-surface-container-lowest bg-primary/10 shadow-lg"
                />
                {/* Active indicator */}
                <span
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-surface-container-lowest flex items-center justify-center ${
                    userData.is_active ? "bg-tertiary" : "bg-error"
                  }`}
                >
                  {userData.is_active ? (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  ) : (
                    <XCircle className="w-3 h-3 text-white" />
                  )}
                </span>
              </div>
              <div className="mb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-on-surface truncate">{userData.full_name}</h2>
                  {isSelf && (
                    <span className="text-[10px] font-bold text-tertiary bg-tertiary-container/30 px-2 py-0.5 rounded-full border border-tertiary/20 shrink-0">
                      Anda
                    </span>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant truncate">{userData.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-1 sm:mt-0 sm:mb-1 bg-surface-container/60 border border-outline-variant/60 rounded-full p-1 pl-3 shrink-0 self-start sm:self-auto">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap ${ROLE_TEXT_COLORS[userData.role]}`}>
                {ROLE_ICONS[userData.role]}
                {userData.role}
              </span>
              <button
                onClick={fetchUser}
                className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex border-t border-outline-variant bg-surface-container/40 px-2 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-3 mt-px text-xs font-bold transition-all border-b-2 rounded-t-lg ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-surface-container-lowest"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status Card */}
          <div className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm border-l-4 ${
            userData.is_active ? "border-l-tertiary" : "border-l-error"
          }`}>
            <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Status Akun
            </h3>
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold ${
              userData.is_active
                ? "bg-tertiary/10 text-tertiary border border-tertiary/20"
                : "bg-error/10 text-error border border-error/20"
            }`}>
              {userData.is_active ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {userData.is_active ? "Aktif" : "Tidak Aktif"}
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Informasi Waktu
            </h3>
            <div className="divide-y divide-outline-variant/50">
              <div className="flex items-start gap-3 py-2.5 first:pt-0">
                <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wide mb-0.5">Terdaftar</p>
                  <p className="text-on-surface font-bold text-xs">{formatDatetime(userData.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-2.5 last:pb-0">
                <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-on-surface-variant font-semibold text-[11px] uppercase tracking-wide mb-0.5">Terakhir Diperbarui</p>
                  <p className="text-on-surface font-bold text-xs">{formatDatetime(userData.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2">
          {/* ── PROFIL TAB ── */}
          {activeTab === "profile" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-outline-variant bg-surface-container">
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Informasi Profil
                </h3>
              </div>
              <div className="px-5 sm:px-6 py-2">
                <InfoRow
                  icon={<Mail className="w-4 h-4" />}
                  label="Alamat Email"
                  value={userData.email}
                />
                <InfoRow
                  icon={ROLE_ICONS[userData.role]}
                  label="Role / Jabatan"
                  value={
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[userData.role]}`}>
                      {ROLE_ICONS[userData.role]}
                      {userData.role}
                    </span>
                  }
                />
                <InfoRow
                  icon={<MapPin className="w-4 h-4" />}
                  label="Wilayah Tugas"
                  value={userData.district_assignment || "Semua Wilayah"}
                />
                <InfoRow
                  icon={<Hash className="w-4 h-4" />}
                  label="Kode Regional"
                  value={userData.regional_code || "—"}
                />
                <InfoRow
                  icon={<Shield className="w-4 h-4" />}
                  label="ID Pengguna"
                  value={
                    <code className="text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded break-all">
                      {userData.id}
                    </code>
                  }
                />
              </div>
            </div>
          )}

          {/* ── EDIT TAB ── */}
          {activeTab === "edit" && isAdmin && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-outline-variant bg-surface-container">
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  Edit Data Pengguna
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Perubahan akan langsung berlaku setelah disimpan.
                </p>
              </div>
              <div className="px-5 sm:px-6 py-5">
                <EditProfileSection
                  user={userData}
                  districtList={districtList}
                  onSaved={(updated) => setUserData(updated)}
                  showToast={showToast}
                />
              </div>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === "security" && isAdmin && (
            <div className="space-y-4">
              {/* Change Password Card */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-outline-variant bg-surface-container">
                  <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    Keamanan Akun
                  </h3>
                </div>
                <div className="px-5 sm:px-6 py-5 space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <KeyRound className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-800 mb-1">
                        Ganti Kata Sandi
                      </h4>
                      <p className="text-xs text-amber-700 leading-relaxed mb-3">
                        Sebagai Administrator, Anda dapat mengatur ulang kata sandi pengguna ini.
                        {isSelf && " Karena ini akun Anda sendiri, gunakan menu Profil untuk mengganti sandi."}
                      </p>
                      <button
                        onClick={() => setShowChangePassword(true)}
                        disabled={isSelf}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <KeyRound className="w-4 h-4" />
                        {isSelf ? "Tidak Dapat Mengubah Sandi Sendiri" : "Ganti Kata Sandi"}
                      </button>
                    </div>
                  </div>

                  {/* Toggle Active */}
                  <div className="flex items-start gap-4 p-4 bg-surface-container rounded-xl border border-outline-variant">
                    {userData.is_active ? (
                      <XCircle className="w-6 h-6 text-error shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-tertiary shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-on-surface mb-1">
                        {userData.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                      </h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                        {userData.is_active
                          ? "Nonaktifkan akun ini agar pengguna tidak dapat login ke sistem."
                          : "Aktifkan kembali akun ini agar pengguna dapat login ke sistem."}
                      </p>
                      <button
                        disabled={isSelf}
                        onClick={async () => {
                          if (isSelf) return;
                          const confirmed = await confirmDialog({
                            title: userData.is_active ? "Nonaktifkan User?" : "Aktifkan User?",
                            text: `Apakah Anda yakin ingin ${userData.is_active ? "menonaktifkan" : "mengaktifkan"} akun ${userData.full_name}?`,
                            confirmText: userData.is_active ? "Nonaktifkan" : "Aktifkan",
                            cancelText: "Batal",
                            isDanger: userData.is_active,
                          });
                          if (!confirmed) return;
                          const { error } = await supabase
                            .from("users")
                            .update({ is_active: !userData.is_active })
                            .eq("id", userData.id);
                          if (error) {
                            showToast(`Gagal mengubah status: ${error.message}`, "error");
                          } else {
                            setUserData((p) => p ? { ...p, is_active: !p.is_active } : p);
                            showToast(
                              `Akun "${userData.full_name}" berhasil ${userData.is_active ? "dinonaktifkan" : "diaktifkan"}.`,
                              userData.is_active ? "info" : "success"
                            );
                          }
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                          userData.is_active
                            ? "bg-error/10 text-error border border-error/20 hover:bg-error/20"
                            : "bg-tertiary/10 text-tertiary border border-tertiary/20 hover:bg-tertiary/20"
                        }`}
                      >
                        {userData.is_active ? (
                          <><XCircle className="w-4 h-4" /> Nonaktifkan Akun</>
                        ) : (
                          <><CheckCircle2 className="w-4 h-4" /> Aktifkan Akun</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          targetUser={userData}
          onClose={() => setShowChangePassword(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};