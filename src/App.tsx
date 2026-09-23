/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { RoadProvider, useRoads } from "./context/RoadContext";
import { Dashboard } from "./components/Dashboard";
import { InteractiveMap } from "./components/InteractiveMap";
import { LegerData } from "./components/LegerData";
import { InputSurvey } from "./components/InputSurvey";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { LegerDocuments } from "./components/LegerDocuments";
import { Guidelines } from "./components/Guidelines";
import { UserManagement } from "./components/UserManagement";
import { UtilitiesManagement } from "./components/UtilitiesManagement";
import { UtilityRequests } from "./components/UtilityRequests";
import { AuthScreen } from "./components/AuthScreen";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  FileText,
  LayoutDashboard,
  Map,
  Table,
  FileEdit,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  Menu,
  ChevronDown,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldCheck,
  BookMarked,
  Users,
  ChevronsLeft,
  ChevronsRight,
  Wrench
} from "lucide-react";

import customLogoImg from "../assets/images/logo.png";
import { confirmDialog } from "./lib/swal";


function LenteraAppContent({ onLogout }: { onLogout: () => void }) {
  const { activeTab, setActiveTab, setEditingSegment, toast, showToast } = useRoads();
  const { user, appRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Derive display name and role from Supabase user metadata or appRole
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Pengguna";
  const displayRole = user?.user_metadata?.role || (appRole === "admin" ? "Administrator" : "Visitor");
  // Auto-generate GitHub-style identicon avatar from email (DiceBear)
  const avatarSeed = encodeURIComponent(user?.email || displayName);
  const avatarUrl = `https://api.dicebear.com/9.x/identicon/svg?seed=${avatarSeed}&backgroundColor=1d3d72,0f2a5a&scale=90`;

  // Breadcrumb generation
  const getBreadcrumbs = () => {
    const iconClass = "w-4 h-4 text-on-surface-variant/75";
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <LayoutDashboard className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Dashboard Statistik</span>
          </>
        );
      case "map":
        return (
          <>
            <Map className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Interactive Map GIS</span>
          </>
        );
      case "data":
        return (
          <>
            <Table className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Data Manajemen Ruas</span>
          </>
        );
      case "survey":
        return (
          <>
            <FileEdit className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Input &amp; Survei Leger</span>
          </>
        );
      case "utilities":
        return (
          <>
            <Wrench className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Utilitas Rumija &amp; Retribusi</span>
          </>
        );
      case "documents":
        return (
          <>
            <ShieldCheck className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Kartu Leger &amp; Sertifikat</span>
          </>
        );
      case "guidelines":
        return (
          <>
            <BookMarked className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Pedoman Pembuatan Leger</span>
          </>
        );
      case "reports":
        return (
          <>
            <BarChart3 className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Laporan &amp; Analitik</span>
          </>
        );
      case "users":
        return (
          <>
            <Users className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Manajemen Pengguna</span>
          </>
        );
      case "settings":
        return (
          <>
            <SettingsIcon className={iconClass} />
            <ChevronRight className="w-4 h-4 text-outline/50" />
            <span className="text-primary font-bold">Pengaturan Sistem</span>
          </>
        );
      default:
        return <span className="text-primary font-bold">LENTERA</span>;
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: "Keluar dari LENTERA?",
      text: "Sesi Anda akan diakhiri secara aman.",
      confirmText: "Ya, Keluar",
      cancelText: "Batal",
    });
    if (confirmed) {
      showToast("Logout berhasil. Sesi diakhiri secara aman.", "info");
      setTimeout(() => {
        onLogout();
      }, 800);
    }
  };

  const handleNotificationsClick = () => {
    showToast("Belum ada notifikasi baru untuk dinilai.", "info");
  };

  const handleSidebarClick = (tabId: string) => {
    if (tabId === "survey") {
      setEditingSegment(null); // Clear editing context when clicking general "Input/Survey"
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  // Sidebar navigation grouped into logical sections
  const NAV_GROUPS: { label: string; items: { id: string; label: string; icon: React.ReactNode }[] }[] = [
    {
      label: "Menu Utama",
      items: [
        { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
      ],
    },
    {
      label: "Data & Referensi",
      items: [
        { id: "guidelines", label: "Pedoman Leger", icon: <BookMarked className="w-5 h-5 shrink-0" /> },
        { id: "documents", label: "Kartu & Sertifikat", icon: <ShieldCheck className="w-5 h-5 shrink-0" /> },
        { id: "map", label: "Interactive Map", icon: <Map className="w-5 h-5 shrink-0" /> },
        { id: "data", label: "Leger Data", icon: <Table className="w-5 h-5 shrink-0" /> },
      ],
    },
    {
      label: "Operasional",
      items: [
        { id: "survey", label: "Input/Survey", icon: <FileEdit className="w-5 h-5 shrink-0" /> },
        { id: "utilities", label: "Utilitas", icon: <Wrench className="w-5 h-5 shrink-0" /> },
        { id: "utility_requests", label: "Pengajuan Utilitas", icon: <FileText className="w-5 h-5 shrink-0" /> },
        { id: "reports", label: "Reports", icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
        { id: "users", label: "Manajemen User", icon: <Users className="w-5 h-5 shrink-0" /> },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background flex font-sans">
      {/* SideNavBar (Desktop persistent sidebar) */}
      <nav
        className={`hidden lg:flex fixed left-0 top-0 h-screen bg-inverse-surface border-r border-outline-variant flex-col py-6 z-50 shadow-lg transition-[width] duration-300 ease-in-out ${
          sidebarCollapsed ? "w-[84px]" : "w-[280px]"
        }`}
      >
        {/* Brand / Logo Section */}
        <div className={`relative mb-6 flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-center px-6"}`}>
          <img
            src={customLogoImg}
            alt="Logo LENTERA"
            className={`object-contain shrink-0 transition-all duration-300 ${sidebarCollapsed ? "h-9 w-9" : "h-24 w-auto"}`}
          />
        </div>
        {/* Fade divider under logo */}
        <div className="h-px mx-4 mb-4 bg-gradient-to-r from-transparent via-white/15 to-transparent shrink-0" />

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md border-2 border-inverse-surface hover:bg-primary-container transition-colors z-10"
          title={sidebarCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
        >
          {sidebarCollapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Navigation List Items (Grouped) */}
        <div className="flex-1 flex flex-col gap-4 px-3 overflow-y-auto overflow-x-hidden">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p className="px-4 mb-1.5 text-[10px] font-black text-white/40 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              {sidebarCollapsed && (
                <div className="mx-4 mb-2 h-px bg-white/10" />
              )}
              <div className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSidebarClick(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3.5 py-3 rounded-lg text-sm font-semibold transition-all duration-200 text-left ${
                      sidebarCollapsed ? "px-0 justify-center" : "px-4"
                    } ${
                      activeTab === item.id
                        ? "bg-primary text-white border-l-4 border-primary-container shadow-md"
                        : "text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-0.5"
                    } ${sidebarCollapsed && activeTab === item.id ? "border-l-0 ring-2 ring-primary-container/60" : ""}`}
                  >
                    {item.icon}
                    {!sidebarCollapsed && item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Profile Mini-Card + Footer Actions */}
        <div className="mt-2 flex flex-col gap-1 border-t border-outline/20 pt-4 px-3 shrink-0">
          {/* Profile mini-card */}
          <div
            className={`flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 mb-2 transition-all ${
              sidebarCollapsed ? "justify-center p-2" : "px-3 py-2.5"
            }`}
            title={sidebarCollapsed ? `${displayName} · ${displayRole}` : undefined}
          >
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full border border-white/20 bg-primary/30 shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider truncate">
                  {displayRole}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => handleSidebarClick("settings")}
            title={sidebarCollapsed ? "Settings" : undefined}
            className={`flex items-center gap-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-left ${
              sidebarCollapsed ? "px-0 justify-center" : "px-4"
            } ${
              activeTab === "settings"
                ? "bg-primary text-white border-l-4 border-primary-container shadow-md"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <SettingsIcon className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && "Settings"}
          </button>

          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
            className={`flex items-center gap-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-left text-white/80 hover:bg-error/20 hover:text-white ${
              sidebarCollapsed ? "px-0 justify-center" : "px-4"
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </nav>

      {/* Mobile drawer header & overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile drawer layout */}
      <nav
        className={`fixed left-0 top-0 h-screen w-[280px] bg-inverse-surface border-r border-outline-variant flex flex-col py-8 z-55 lg:hidden transition-transform duration-300 transform ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-white flex items-center justify-center p-1 shadow border border-outline-variant/30 shrink-0">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Coat_of_arms_of_East_Nusa_Tenggara.svg/512px-Coat_of_arms_of_East_Nusa_Tenggara.svg.png" 
                alt="Logo NTT" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-headline-md text-lg font-black text-white">LENTERA</h1>
              <p className="font-label-sm text-[9px] text-white/75 uppercase tracking-wider">
                Sistem Leger Jalan
              </p>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-white p-1 rounded hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4 px-3 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-4 mb-1.5 text-[10px] font-black text-white/40 uppercase tracking-widest">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSidebarClick(item.id)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-semibold transition-all text-left ${
                      activeTab === item.id
                        ? "bg-primary text-white border-l-4 border-primary-container shadow"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto px-3 border-t border-outline/25 pt-4 flex flex-col gap-1">
          {/* Profile mini-card */}
          <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 mb-2">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full border border-white/20 bg-primary/30 shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider truncate">
                {displayRole}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleSidebarClick("settings")}
            className={`flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
              activeTab === "settings"
                ? "bg-primary text-white border-l-4 border-primary-container shadow"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <SettingsIcon className="w-5 h-5 shrink-0" />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white/80 hover:bg-error/20 hover:text-white text-left"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div className={`flex-1 flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out ${sidebarCollapsed ? "lg:ml-[84px]" : "lg:ml-[280px]"}`}>
        {/* TopNavBar */}
        <header className={`fixed top-0 right-0 w-full h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-6 z-40 shadow-xs transition-[width] duration-300 ease-in-out ${sidebarCollapsed ? "lg:w-[calc(100%-84px)]" : "lg:w-[calc(100%-280px)]"}`}>
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-on-surface p-2 rounded-full hover:bg-surface-container-high transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs/Context */}
            <nav className="hidden md:flex items-center gap-2 text-on-surface-variant font-label-md text-xs font-semibold uppercase tracking-wider">
              {getBreadcrumbs()}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Search (Redirects/pre-fills Search in Leger Data) */}
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 pointer-events-none" />
              <input
                className="pl-10 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-full font-body-sm text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-60 group-hover:bg-surface-container-high"
                placeholder="Cari ID/Nama Ruas..."
                onClick={() => {
                  if (activeTab !== "data" && activeTab !== "map") {
                    setActiveTab("data");
                  }
                }}
                onChange={(e) => {
                  if (activeTab !== "data") {
                    setActiveTab("data");
                  }
                  // Input value goes to search bar automatically
                  const otherSearch = document.querySelector('input[placeholder="Cari nama, patok, surveyor..."]') as HTMLInputElement;
                  if (otherSearch) {
                    otherSearch.value = e.target.value;
                    otherSearch.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }}
                type="text"
              />
            </div>

            {/* Notifications Panel Trigger */}
            <button
              onClick={handleNotificationsClick}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high relative"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full animate-ping"></span>
            </button>

            <div className="h-8 w-px bg-outline-variant/60 mx-1"></div>

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-2">
              {/* Auto-generated identicon avatar (GitHub style) */}
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full border border-outline-variant bg-primary/20"
              />
              <div className="hidden md:flex flex-col items-start leading-none">
                <span className="font-label-md text-xs font-bold text-on-surface">{displayName}</span>
                <span className="text-[10px] text-on-surface-variant font-bold uppercase mt-0.5 tracking-wider">
                  {displayRole}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content canvas container */}
        <main className="flex-1 mt-16 overflow-y-auto">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "map" && <InteractiveMap />}
          {activeTab === "data" && <LegerData />}
          {activeTab === "survey" && <InputSurvey />}
          {activeTab === "utilities" && <UtilitiesManagement />}
          {activeTab === "utility_requests" && <UtilityRequests />}
          {activeTab === "documents" && <LegerDocuments />}
          {activeTab === "guidelines" && <Guidelines />}
          {activeTab === "reports" && <Reports />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "settings" && <Settings />}
        </main>
      </div>

      {/* Floating dynamic Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-55 flex items-center gap-3 px-4.5 py-3.5 rounded-lg shadow-2xl border max-w-sm transition-all duration-300 translate-y-0 transform animate-bounce ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : toast.type === "error"
              ? "bg-error-container border-error/20 text-on-error-container"
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : toast.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
          )}
          <span className="text-xs font-semibold leading-relaxed">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function AppContentWrapper() {
  const { isAuthenticated, isLoading, logout } = useAuth();

  // Show a loading screen while Supabase checks the existing session
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0d131f] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#1D3D72]/30 border-t-[#FFC72C] rounded-full animate-spin" />
        <p className="text-white/50 text-sm font-semibold tracking-wide">Memuat Sesi...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <LenteraAppContent onLogout={logout} />;
}

export default function App() {
  return (
    <RoadProvider>
      <AuthProvider>
        <AppContentWrapper />
      </AuthProvider>
    </RoadProvider>
  );
}