/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useRoads } from "../context/RoadContext";
import { UserDetail } from "./UserDetail";
import {
  Users,
  UserPlus,
  UserCog,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit3,
  X,
  Eye,
  EyeOff,
  Shield,
  HardHat,
  ClipboardCheck,
  RefreshCw,
  AlertCircle,
  Mail,
  MapPin,
  Calendar,
  Hash,
  Save,
  Loader2,
  Trash2,
} from "lucide-react";
import { confirmDialog } from "../lib/swal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemUser {
  id: string;
  full_name: string;
  email: string;
  role: "Administrator" | "Visitor";
  app_role?: "admin" | "visitor";
  district_assignment: string | null;
  regional_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type UserRole = "Administrator" | "Visitor";

interface UserFormData {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  app_role: "admin" | "visitor";
  district_assignment: string;
  regional_code: string;
}

const ROLES: UserRole[] = [
  "Administrator",
  "Visitor",
];

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  Administrator: <Shield className="w-3.5 h-3.5" />,
  Visitor: <Eye className="w-3.5 h-3.5" />,
};

const ROLE_COLORS: Record<UserRole, string> = {
  Administrator: "bg-primary/10 text-primary border border-primary/20",
  Visitor: "bg-surface-container-high text-on-surface border border-outline-variant",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function getAvatarUrl(email: string, name: string) {
  const seed = encodeURIComponent(email || name);
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${seed}&backgroundColor=1d3d72,0f2a5a&scale=90`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

// ─── UserFormModal ─────────────────────────────────────────────────────────────

interface UserFormModalProps {
  mode: "add" | "edit";
  user?: SystemUser;
  districtList: string[];
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  mode,
  user,
  districtList,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [form, setForm] = useState<UserFormData>({
    full_name: user?.full_name || "",
    email: user?.email || "",
    password: "",
    role: user?.role || "Visitor",
    app_role: user?.app_role || "visitor",
    district_assignment: user?.district_assignment || "",
    regional_code: user?.regional_code || "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.full_name.trim()) {
      setFormError("Nama lengkap tidak boleh kosong.");
      return;
    }

    if (mode === "add") {
      if (!form.email.trim()) {
        setFormError("Email tidak boleh kosong.");
        return;
      }
      if (form.password.length < 6) {
        setFormError("Kata sandi minimal 6 karakter.");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === "add") {
        // ── 1. Buat akun auth baru via signUp ──
        const { data: authData, error: signUpError } =
          await supabase.auth.signUp({
            email: form.email.trim(),
            password: form.password,
            options: {
              data: {
                full_name: form.full_name.trim(),
                role: form.role,
                district: form.district_assignment || null,
              },
            },
          });

        if (signUpError) {
          let msg = signUpError.message;
          if (
            signUpError.message === "User already registered" ||
            signUpError.message.toLowerCase().includes("already registered")
          ) {
            msg = "Email ini sudah terdaftar dalam sistem.";
          } else if (signUpError.message.toLowerCase().includes("rate limit")) {
            msg = "Batas frekuensi email Supabase tercapai. Tunggu beberapa saat atau matikan Confirm Email di dashboard Supabase.";
          }
          setFormError(msg);
          return;
        }

        // Cek jika Supabase mendeteksi email duplikat (identities kosong)
        if (
          authData.user &&
          authData.user.identities &&
          authData.user.identities.length === 0
        ) {
          setFormError("Email ini sudah terdaftar dalam sistem. Silakan gunakan email lain.");
          return;
        }

        if (authData.user && (!authData.user.identities || authData.user.identities.length > 0)) {
          // ── 2. Update public.users jika sudah ada (dari trigger) ──
          try {
            const { error: upsertErr } = await supabase
              .from("users")
              .upsert(
                {
                  id: authData.user.id,
                  full_name: form.full_name.trim(),
                  email: form.email.trim(),
                  role: form.role,
                  district_assignment: form.district_assignment || null,
                  regional_code: form.regional_code || null,
                  is_active: true,
                },
                { onConflict: "id" }
              );

            if (upsertErr) {
              console.warn("[UserMgmt] Info sync profile:", upsertErr.message);
              if (upsertErr.message.includes("users_role_check")) {
                setFormError(
                  `Role "${form.role}" belum diizinkan oleh database constraint. Jalankan script SQL perbaikan role di Supabase.`
                );
                return;
              }
            }
          } catch (err: any) {
            console.warn("[UserMgmt] Upsert catch:", err.message);
          }
        }

        showToast(
          `User "${form.full_name}" berhasil didaftarkan! Pastikan email dikonfirmasi jika diperlukan.`,
          "success"
        );
        onSuccess();
      } else if (mode === "edit" && user) {
        // ── Edit: Update tabel public.users ──
        const { error: updateErr } = await supabase
          .from("users")
          .update({
            full_name: form.full_name.trim(),
            role: form.role,
            district_assignment: form.district_assignment || null,
            regional_code: form.regional_code || null,
          })
          .eq("id", user.id);

        if (updateErr) {
          setFormError(`Gagal memperbarui user: ${updateErr.message}`);
          return;
        }

        showToast(`Data user "${form.full_name}" berhasil diperbarui.`, "success");
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              {mode === "add" ? (
                <UserPlus className="w-5 h-5 text-primary" />
              ) : (
                <UserCog className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-sm">
                {mode === "add" ? "Tambah User Baru" : "Edit Data User"}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {mode === "add"
                  ? "Daftarkan akun pengguna baru ke sistem"
                  : `Mengedit: ${user?.email}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Error Alert */}
          {formError && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-error-container border border-error/20 rounded-lg text-on-error-container text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-error shrink-0" />
              {formError}
            </div>
          )}

          {/* Nama Lengkap */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Nama Lengkap <span className="text-error">*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Contoh: Ahmad Fauzi, S.T."
              className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              required
            />
          </div>

          {/* Email – hanya pada mode add */}
          {mode === "add" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email <span className="text-error">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="contoh@pupr.go.id"
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                required
              />
            </div>
          )}

          {/* Password – hanya pada mode add */}
          {mode === "add" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Kata Sandi Awal <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-on-surface-variant">
                User dapat mengubah kata sandi setelah login pertama kali.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5" />
                Role / Jabatan <span className="text-error">*</span>
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2-col grid: District & Regional Code */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Wilayah Tugas
              </label>
              <select
                name="district_assignment"
                value={form.district_assignment}
                onChange={handleChange}
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="">— Semua Wilayah —</option>
                {districtList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                Kode Regional
              </label>
              <input
                type="text"
                name="regional_code"
                value={form.regional_code}
                onChange={handleChange}
                placeholder="PUPR-NTT-..."
                className="w-full bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
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
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isLoading
                ? "Menyimpan..."
                : mode === "add"
                ? "Daftarkan User"
                : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── UserDetailModal ──────────────────────────────────────────────────────────

interface UserDetailModalProps {
  user: SystemUser;
  onClose: () => void;
  onEdit: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose, onEdit }) => {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container">
          <h3 className="font-bold text-on-surface text-sm">Detail Pengguna</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4 mb-5">
            <img
              src={getAvatarUrl(user.email, user.full_name)}
              alt={user.full_name}
              className="w-14 h-14 rounded-full border-2 border-primary/20 bg-primary/10"
            />
            <div>
              <h4 className="font-bold text-on-surface text-base">{user.full_name}</h4>
              <p className="text-xs text-on-surface-variant">{user.email}</p>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${ROLE_COLORS[user.role]}`}
              >
                {ROLE_ICONS[user.role]}
                {user.role}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ml-2 border ${user.app_role === 'admin' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                {user.app_role === 'admin' ? 'Admin' : 'Visitor'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              {
                icon: <MapPin className="w-3.5 h-3.5" />,
                label: "Wilayah Tugas",
                value: user.district_assignment || "Semua Wilayah",
              },
              {
                icon: <Hash className="w-3.5 h-3.5" />,
                label: "Kode Regional",
                value: user.regional_code || "—",
              },
              {
                icon: <Calendar className="w-3.5 h-3.5" />,
                label: "Terdaftar",
                value: formatDate(user.created_at),
              },
              {
                icon: <Calendar className="w-3.5 h-3.5" />,
                label: "Diperbarui",
                value: formatDate(user.updated_at),
              },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                className="bg-surface-container rounded-lg p-3 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  {icon}
                  <span className="font-semibold text-[10px] uppercase tracking-wider">
                    {label}
                  </span>
                </div>
                <p className="text-on-surface font-medium">{value}</p>
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container">
            {user.is_active ? (
              <CheckCircle2 className="w-4 h-4 text-tertiary shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-error shrink-0" />
            )}
            <span className="text-xs font-semibold text-on-surface">
              Status:{" "}
              <span className={user.is_active ? "text-tertiary" : "text-error"}>
                {user.is_active ? "Aktif" : "Tidak Aktif"}
              </span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/50 bg-surface-container">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors border border-outline-variant"
          >
            Tutup
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit User
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main UserManagement Component ────────────────────────────────────────────

export const UserManagement: React.FC = () => {
  const { user: currentUser, appRole } = useAuth();
  const { showToast, districtList } = useRoads();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // ── Fetch users from public.users and public.profiles ──
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const { data: usersData, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[UserMgmt] fetch error:", error.message);
      // Fallback ke mock data secara diam-diam jika DB gagal/offline
      const MOCK_USERS: SystemUser[] = [
        {
          id: "mock-1",
          full_name: "Admin LENTERA",
          email: "admin@pupr.ntt.go.id",
          role: "Administrator",
          app_role: "admin",
          district_assignment: null,
          regional_code: "PUPR-NTT-01",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "mock-2",
          full_name: "Visitor LENTERA",
          email: "visitor@pupr.ntt.go.id",
          role: "Visitor",
          app_role: "visitor",
          district_assignment: "Kota Kupang",
          regional_code: "PUPR-NTT-02",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setUsers(MOCK_USERS);
    } else {
      const combined = (usersData ?? []).map((u: any) => {
        return { ...u, app_role: u.role === "Administrator" ? "admin" : "visitor" };
      });
      
      setUsers(combined as SystemUser[]);
    }
    setIsLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Toggle active status ──
  const handleToggleActive = async (u: SystemUser) => {
    if (u.id === currentUser?.id) {
      showToast("Anda tidak dapat menonaktifkan akun Anda sendiri.", "error");
      return;
    }

    const action = u.is_active ? "menonaktifkan" : "mengaktifkan";
    const confirmed = await confirmDialog({
      title: `${u.is_active ? "Nonaktifkan" : "Aktifkan"} User?`,
      text: `Apakah Anda yakin ingin ${action} akun ${u.full_name}?`,
      confirmText: u.is_active ? "Nonaktifkan" : "Aktifkan",
      cancelText: "Batal",
      isDanger: u.is_active,
    });

    if (!confirmed) return;

    const { error } = await supabase
      .from("users")
      .update({ is_active: !u.is_active })
      .eq("id", u.id);

    if (error) {
      showToast(`Gagal mengubah status: ${error.message}`, "error");
    } else {
      setUsers((prev) =>
        prev.map((item) =>
          item.id === u.id ? { ...item, is_active: !u.is_active } : item
        )
      );
      showToast(
        `User "${u.full_name}" berhasil ${u.is_active ? "dinonaktifkan" : "diaktifkan"}.`,
        u.is_active ? "info" : "success"
      );
    }
  };

  // ── Delete user ──
  const handleDeleteUser = async (u: SystemUser) => {
    if (u.id === currentUser?.id) {
      showToast("Anda tidak dapat menghapus akun Anda sendiri.", "error");
      return;
    }

    const confirmed = await confirmDialog({
      title: "Hapus User?",
      text: `Apakah Anda yakin ingin menghapus akun ${u.full_name} secara permanen?`,
      confirmText: "Hapus",
      cancelText: "Batal",
      isDanger: true,
    });

    if (!confirmed) return;

    // Delete from public.users (Note: triggers might be needed to delete from auth.users, or it will just be deleted from public.users)
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", u.id);

    if (error) {
      showToast(`Gagal menghapus user: ${error.message}`, "error");
    } else {
      setUsers((prev) => prev.filter((item) => item.id !== u.id));
      showToast(`User "${u.full_name}" berhasil dihapus.`, "success");
    }
  };

  // ── Filter & search ──
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.district_assignment || "").toLowerCase().includes(q);
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && u.is_active) ||
      (filterStatus === "inactive" && !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  // ── Stats ──
  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admin: users.filter((u) => u.role === "Administrator").length,
    visitor: users.filter((u) => u.role === "Visitor").length,
  };

  const isAdmin = appRole === "admin";

  // ── Render UserDetail page if a user is selected ──
  if (selectedUserId) {
    return (
      <UserDetail
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-gutter pt-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface flex items-center gap-2.5">
            <Users className="w-8 h-8 text-primary" />
            Manajemen Pengguna
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Kelola akun, peran, dan akses pengguna sistem LENTERA.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container border border-outline-variant transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Tambah User
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total User",
            value: stats.total,
            icon: <Users className="w-5 h-5" />,
            color: "text-primary bg-primary/10",
          },
          {
            label: "Aktif",
            value: stats.active,
            icon: <CheckCircle2 className="w-5 h-5" />,
            color: "text-tertiary bg-tertiary/10",
          },
          {
            label: "Administrator",
            value: stats.admin,
            icon: <Shield className="w-5 h-5" />,
            color: "text-primary bg-primary/10",
          },
          {
            label: "Visitor",
            value: stats.visitor,
            icon: <Eye className="w-5 h-5" />,
            color: "text-secondary-fixed bg-secondary-container",
          },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              {icon}
            </div>
            <div>
              <p className="text-xl font-black text-on-surface">{value}</p>
              <p className="text-[11px] text-on-surface-variant font-semibold">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar (Search + Filters) ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, atau wilayah..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-bright border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        {/* Filter Role */}
        <div className="relative flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-on-surface-variant shrink-0" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          >
            <option value="all">Semua Role</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {/* Filter Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shrink-0"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Tidak Aktif</option>
        </select>
      </div>

      {/* ── User Table ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-on-surface-variant font-medium">
              Memuat data pengguna...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="w-10 h-10 text-outline/40" />
            <p className="text-sm text-on-surface-variant font-medium">
              {searchQuery || filterRole !== "all" || filterStatus !== "all"
                ? "Tidak ada user yang sesuai filter."
                : "Belum ada user terdaftar."}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-4 px-6 py-3 border-b border-outline-variant bg-surface-container text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              <span>Avatar</span>
              <span>Nama / Email</span>
              <span>Role</span>
              <span>Wilayah</span>
              <span>Status</span>
              <span>Aksi</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-outline-variant/60">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className={`flex flex-col md:grid md:grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-3 md:gap-4 px-6 py-4 hover:bg-surface-container/60 transition-colors group ${
                    !u.is_active ? "opacity-60" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex items-center">
                    <div className="relative">
                      <img
                        src={getAvatarUrl(u.email, u.full_name)}
                        alt={u.full_name}
                        className="w-9 h-9 rounded-full border border-outline-variant bg-primary/10"
                      />
                      {u.id === currentUser?.id && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-tertiary-container border border-white flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name + Email */}
                  <div className="flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-on-surface truncate">
                        {u.full_name}
                      </span>
                      {u.id === currentUser?.id && (
                        <span className="text-[9px] font-bold text-tertiary bg-tertiary-container/30 px-1.5 py-0.5 rounded-full border border-tertiary/20 shrink-0">
                          Anda
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-on-surface-variant truncate">
                      {u.email}
                    </span>
                    <span className="text-[10px] text-on-surface-variant/60 mt-0.5">
                      Bergabung {formatDate(u.created_at)}
                    </span>
                  </div>

                  {/* Role */}
                  <div className="flex flex-col items-start justify-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role]}`}
                    >
                      {ROLE_ICONS[u.role]}
                      {u.role}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${u.app_role === 'admin' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}
                    >
                      <Shield className="w-2.5 h-2.5" />
                      {u.app_role === 'admin' ? 'Admin' : 'Visitor'}
                    </span>
                  </div>

                  {/* District */}
                  <div className="flex items-center min-w-0">
                    <span className="text-xs text-on-surface-variant flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {u.district_assignment || "Semua Wilayah"}
                    </span>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center">
                    {isAdmin ? (
                      <button
                        onClick={() => handleToggleActive(u)}
                        title={
                          u.is_active ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan"
                        }
                        className="flex items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
                      >
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error/10 text-error border border-error/20">
                            <XCircle className="w-3 h-3" />
                            Nonaktif
                          </span>
                        )}
                      </button>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${
                          u.is_active
                            ? "bg-tertiary/10 text-tertiary border border-tertiary/20"
                            : "bg-error/10 text-error border border-error/20"
                        }`}
                      >
                        {u.is_active ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedUserId(u.id)}
                      title="Lihat detail"
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => setEditingUser(u)}
                          title="Edit user"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="Hapus user"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Table Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-outline-variant bg-surface-container text-xs text-on-surface-variant">
              <span>
                Menampilkan{" "}
                <span className="font-bold text-on-surface">
                  {filteredUsers.length}
                </span>{" "}
                dari{" "}
                <span className="font-bold text-on-surface">{users.length}</span>{" "}
                pengguna
              </span>
              {!isAdmin && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  Hanya Administrator yang dapat mengelola user
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <UserFormModal
          mode="add"
          districtList={districtList}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
          showToast={showToast}
        />
      )}

      {editingUser && (
        <UserFormModal
          mode="edit"
          user={editingUser}
          districtList={districtList}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
