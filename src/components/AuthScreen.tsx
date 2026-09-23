/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoads } from "../context/RoadContext";
import { motion, AnimatePresence } from "motion/react";
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  MapPin,
  Briefcase,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

const nttRoadImg = "https://images.unsplash.com/photo-1542228639-688849b291d9?q=80&w=2000&auto=format&fit=crop";
import customLogoImg from "../../assets/images/logo.png";
import nttLogoImg from "../../assets/images/logo_ntt.png";

/**
 * High-fidelity Vector Representation of the official PUPR Logo Mark
 */
export const PuprLogo: React.FC<{ className?: string; showText?: boolean; textLight?: boolean }> = ({
  className = "h-12",
  showText = true,
  textLight = true
}) => {
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* Dynamic exact SVG of the PUPR Logo Mark */}
      <svg
        className="w-11 h-11 shrink-0 filter drop-shadow-md"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Yellow base card */}
        <rect width="100" height="100" rx="10" fill="#FFC72C" />
        
        {/* Blue background region */}
        <path
          d="M0 0 H100 V100 H0 Z"
          fill="#1D3D72"
        />
        
        {/* Top Right yellow curve */}
        <path
          d="M 50,0 C 50,28 72,50 100,50 V 0 Z"
          fill="#FFC72C"
        />
        
        {/* Bottom Left yellow corner arch */}
        <path
          d="M 0,100 C 28,100 50,78 50,50 H 0 Z"
          fill="#FFC72C"
        />
        
        {/* Center left yellow circle */}
        <circle cx="22" cy="45" r="16" fill="#FFC72C" />

        {/* Dynamic bridges connecting PUPR ribbon structure */}
        <path
          d="M 68,25 C 68,36 77,45 88,45 V 25 Z"
          fill="#FFC72C"
        />
        <path
          d="M 50,75 C 50,64 59,55 70,55 V 75 Z"
          fill="#FFC72C"
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-baseline font-black tracking-tighter text-2xl">
            <span className={textLight ? "text-white" : "text-[#1D3D72]"}>PU</span>
            <span className="text-[#FFC72C]">PR</span>
          </div>
          <span className={`text-[8px] tracking-[0.15em] font-extrabold uppercase mt-1 ${
            textLight ? "text-[#FFC72C]" : "text-gray-600"
          }`}>
            Sigap Membangun Negeri
          </span>
        </div>
      )}
    </div>
  );
};

export const AuthScreen: React.FC = () => {
  const { login, register, isLoading, errorMsg, setErrorMsg } = useAuth();
  const { showToast } = useRoads();

  // Prevent browser-level scrolling and hide window scrollbars while on the Auth screen
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    html.classList.add("overflow-hidden", "h-screen");
    body.classList.add("overflow-hidden", "h-screen");
    
    return () => {
      html.classList.remove("overflow-hidden", "h-screen");
      body.classList.remove("overflow-hidden", "h-screen");
    };
  }, []);

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<"login" | "register">("login");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Visitor");
  const [district, setDistrict] = useState("Kota Kupang");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Predefined lists (Only 2 roles: Administrator and Visitor)
  const ROLES = ["Administrator", "Visitor"];
  const DISTRICTS = [
    "Provinsi NTT",
    "Kota Kupang",
    "Kab. Kupang",
    "Kab. Sikka",
    "Kab. Flores Timur",
    "Kab. Ende",
    "Kab. Manggarai",
    "Kab. Alor"
  ];

  const handleToggleMode = () => {
    setErrorMsg(null);
    setValidationError(null);
    setMode((prev) => (prev === "login" ? "register" : "login"));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setErrorMsg(null);

    // Frontend validations
    if (!email.trim() || !password.trim()) {
      setValidationError("Silakan isi semua bidang wajib.");
      return;
    }

    if (mode === "register" && !name.trim()) {
      setValidationError("Nama lengkap wajib diisi.");
      return;
    }

    if (password.length < 5) {
      setValidationError("Kata sandi harus terdiri dari minimal 5 karakter.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError("Format email tidak valid.");
      return;
    }

    if (mode === "login") {
      const success = await login(email, password);
      if (success) {
        showToast("Selamat datang kembali! Sesi Anda berhasil dibuka.", "success");
      }
    } else {
      const success = await register(name, email, password, role, district);
      if (success) {
        showToast("Pendaftaran berhasil! Akun baru Anda telah aktif dan masuk.", "success");
      }
    }
  };

  return (
    <div id="auth-screen-root" className="h-[100dvh] w-screen bg-[#0d131f] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="w-full max-w-5xl bg-[#1e2530] rounded-2xl shadow-2xl border border-gray-700/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 lg:min-h-[520px] max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] lg:max-h-[calc(100dvh-4rem)] my-auto">
        
        {/* Left Side: Illustration and PUPR Branded information (Hidden on small screens) */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-8 text-white overflow-hidden bg-gradient-to-br from-[#1D3D72] to-[#0a1526] border-r border-gray-700/50">
          
          {/* Background image overlay with PUPR dark-blue tint */}
          <div className="absolute inset-0 z-0 opacity-30 hover:opacity-40 transition-opacity duration-700">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d131f] via-[#1D3D72]/85 to-transparent" />
          </div>

          {/* Official Logo Header */}
          <div className="relative z-10 flex items-center gap-6">
            <img src={nttLogoImg} alt="Logo NTT" className="h-32 w-auto object-contain drop-shadow-lg" />
            <img src={customLogoImg} alt="Logo PUPR" className="h-32 w-auto object-contain drop-shadow-lg" />
          </div>

          {/* Slogan and details */}
          <div className="relative z-10 space-y-4 my-auto pt-16">
            <div className="inline-block px-2.5 py-1 rounded bg-[#FFC72C]/15 border border-[#FFC72C]/30 text-xs font-bold text-[#FFC72C]">
              SISTEM LEGER JALAN NTT
            </div>
            <h1 className="text-2xl font-black tracking-tight leading-snug text-white">
              Arsip Digital &amp;<br />
              Geospasial Jalan NTT
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed font-medium">
              LENTERA membantu Dinas Pekerjaan Umum dan Penataan Ruang (PUPR) Provinsi Nusa Tenggara Timur dalam pengelolaan database leger jalan yang modern, akurat, dan terintegrasi secara spasial.
            </p>
            
            {/* Features highlights with brand yellow accents */}
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-200">
                <ShieldCheck className="w-4.5 h-4.5 shrink-0 text-[#FFC72C]" />
                <span>Pencatatan Dokumen &amp; Leger Rinci</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-200">
                <MapPin className="w-4.5 h-4.5 shrink-0 text-[#FFC72C]" />
                <span>Pemetaan GIS Koordinat Presisi</span>
              </div>
            </div>
          </div>

          {/* Bottom branding footer */}
          <div className="relative z-10 text-[10px] text-gray-400 font-mono flex items-center justify-between border-t border-gray-800 pt-4 mt-8">
            <span>Dinas PUPR Provinsi NTT</span>
            <span>v1.5 SIGAP</span>
          </div>
        </div>

        {/* Right Side: Responsive Login/Register Form with PUPR Accents */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-center p-6 md:p-10 bg-[#111622] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          <div className="w-full max-w-md mx-auto space-y-5">
            
            {/* Mobile Header: Visible only on smaller screens where Left Side is hidden */}
            <div className="block lg:hidden text-center pb-3 border-b border-gray-800">
              <div className="flex justify-center items-center gap-4">
                <img src={nttLogoImg} alt="Logo NTT" className="h-16 w-auto object-contain drop-shadow-md" />
                <img src={customLogoImg} alt="Logo PUPR" className="h-16 w-auto object-contain drop-shadow-md" />
              </div>
            </div>

            {/* Form Title & Interactive Mode Indicators */}
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                {mode === "login" ? (
                  <>
                    <LogIn className="text-[#FFC72C] w-6 h-6" />
                    <span>Masuk ke LENTERA</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="text-[#FFC72C] w-6 h-6" />
                    <span>Daftar Akun Baru</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-gray-400">
                {mode === "login"
                  ? "Sistem Leger Jalan Dinas Pekerjaan Umum dan Penataan Ruang NTT."
                  : "Buat akun petugas dinas baru untuk mulai mengelola infrastruktur jalan NTT."}
              </p>
            </div>

            {/* Validation Alerts */}
            <AnimatePresence mode="wait">
              {(validationError || errorMsg) && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-xs text-red-200 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-normal">{validationError || errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Name Field (Only on register) */}
              <AnimatePresence>
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                      Nama Lengkap <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                      <input
                        type="text"
                        required={mode === "register"}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama Lengkap &amp; Gelar"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC72C] text-white font-medium"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                  Alamat Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@lentera.go.id"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC72C] text-white font-medium font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                  Kata Sandi <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kata sandi akun Anda"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-700/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC72C] text-white font-medium font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Advanced fields (Role & District selection) (Only on register) */}
              <AnimatePresence>
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 overflow-hidden"
                  >
                    {/* Role Dropdown */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                        Jabatan / Peran <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full pl-9 pr-6 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FFC72C] text-white font-medium appearance-none"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* District Dropdown */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                        Wilayah Tugas <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full pl-9 pr-6 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FFC72C] text-white font-medium appearance-none"
                        >
                          {DISTRICTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button - Branded with PUPR Gold background */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#FFC72C] hover:bg-[#ebd04d] active:bg-[#e6b222] text-[#1D3D72] rounded-lg font-black text-sm shadow-lg hover:shadow-[#FFC72C]/25 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#1D3D72]/30 border-t-[#1D3D72] rounded-full animate-spin" />
                    <span>Sedang memproses...</span>
                  </div>
                ) : mode === "login" ? (
                  <>
                    <LogIn className="w-4.5 h-4.5" />
                    <span>Autentikasi &amp; Masuk</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4.5 h-4.5" />
                    <span>Selesaikan Pendaftaran</span>
                  </>
                )}
              </button>

            </form>

            {/* Toggle Mode Link */}
            <div className="text-center pt-2">
              <button
                onClick={handleToggleMode}
                className="text-xs font-semibold text-[#FFC72C] hover:text-[#ebd04d] transition-colors cursor-pointer"
              >
                {mode === "login"
                  ? "Belum punya akun dinas? Klik di sini untuk Daftar"
                  : "Sudah punya akun petugas? Silakan Masuk di sini"}
              </button>
            </div>


          </div>

        </div>

      </div>

    </div>
  );
};