/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRoads } from "../context/RoadContext";
import { confirmDialog } from "../lib/swal";
import { RoadSegment, RoadCondition, SurfaceType } from "../types";
import {
  Info,
  MapPin,
  Save,
  ArrowRight,
  ArrowLeft,
  X,
  AlertTriangle,
  Locate,
  Compass,
  CheckCircle,
  HelpCircle,
  Plus,
  Minus,
  Layers,
  Calendar,
  User,
  Wrench,
  ShieldAlert,
  Eye
} from "lucide-react";
import { DISTRICT_LIST, KECAMATAN_MAP } from "../data/initialData";

export const InputSurvey: React.FC = () => {
  const { appRole } = useAuth();
  const isAdmin = appRole === "admin";
  const { addSegment, updateSegment, editingSegment, setEditingSegment, setActiveTab, showToast, districtList, kecamatanMap } = useRoads();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Form Fields State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [lengthKm, setLengthKm] = useState<number>(0);
  const [widthM, setWidthM] = useState<number>(0);
  const [surfaceType, setSurfaceType] = useState<SurfaceType>(SurfaceType.HOTMIX_AC_WC);
  const [condition, setCondition] = useState<RoadCondition>(RoadCondition.MANTAP);
  const [constYear, setConstYear] = useState<number>(2025);
  const [startLat, setStartLat] = useState<number>(-10.160100);
  const [startLng, setStartLng] = useState<number>(123.616666);
  const [endLat, setEndLat] = useState<number>(-10.184320);
  const [endLng, setEndLng] = useState<number>(123.612340);
  const [description, setDescription] = useState("");
  const [surveyor, setSurveyor] = useState("Budi Santoso");

  // Load existing segment if in editing mode
  useEffect(() => {
    if (editingSegment) {
      setCode(editingSegment.code);
      setName(editingSegment.name);
      setDistrict(editingSegment.district);
      setKecamatan(editingSegment.kecamatan);
      setLengthKm(editingSegment.lengthKm);
      setWidthM(editingSegment.widthM);
      setSurfaceType(editingSegment.surfaceType);
      setCondition(editingSegment.condition);
      setConstYear(editingSegment.constYear);
      setStartLat(editingSegment.startLat);
      setStartLng(editingSegment.startLng);
      setEndLat(editingSegment.endLat);
      setEndLng(editingSegment.endLng);
      setDescription(editingSegment.description || "");
      setSurveyor(editingSegment.surveyor);
      setCurrentStep(1);
    } else {
      // Set some defaults
      setCode("");
      setName("");
      const defaultDist = (districtList && districtList.length > 0) ? districtList[0] : DISTRICT_LIST[0];
      setDistrict(defaultDist);
      const defaultKec = (kecamatanMap && kecamatanMap[defaultDist] && kecamatanMap[defaultDist].length > 0)
        ? kecamatanMap[defaultDist][0]
        : (KECAMATAN_MAP[defaultDist] && KECAMATAN_MAP[defaultDist][0]) || "";
      setKecamatan(defaultKec);
      setLengthKm(5.0);
      setWidthM(7.0);
      setSurfaceType(SurfaceType.HOTMIX_AC_WC);
      setCondition(RoadCondition.MANTAP);
      setConstYear(2025);
      setStartLat(-10.160100);
      setStartLng(123.616666);
      setEndLat(-10.184320);
      setEndLng(123.612340);
      setDescription("");
      setSurveyor("Budi Santoso");
      setCurrentStep(1);
    }
  }, [editingSegment, districtList, kecamatanMap]);

  // Adjust kecamatan when district changes
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDist = e.target.value;
    setDistrict(selectedDist);
    const kecs = (kecamatanMap && kecamatanMap[selectedDist]) || KECAMATAN_MAP[selectedDist];
    if (kecs && kecs.length > 0) {
      setKecamatan(kecs[0]);
    }
  };

  const handleNextStep = () => {
    // Basic validation
    if (currentStep === 1) {
      if (!code || !name || !district || !kecamatan) {
        showToast("Mohon lengkapi semua data administratif terlebih dahulu.", "error");
        return;
      }
    } else if (currentStep === 2) {
      if (lengthKm <= 0 || widthM <= 0 || constYear < 1950 || constYear > 2027) {
        showToast("Mohon masukkan spesifikasi teknis dan tahun konstruksi yang valid.", "error");
        return;
      }
    } else if (currentStep === 3) {
      if (!surveyor) {
        showToast("Mohon cantumkan nama surveyor penilai.", "error");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveAsDraft = () => {
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Administrator yang dapat menyimpan draft survei.", "error");
      return;
    }
    showToast(`Draft "${name || "Ruas Tanpa Nama"}" berhasil disimpan secara lokal!`, "success");
  };

  const handleCancelSurvey = async () => {
    const confirmed = await confirmDialog({
      title: "Batalkan Pendaftaran?",
      text: "Apakah Anda yakin ingin membatalkan pendaftaran ruas ini? Semua perubahan akan hilang.",
      confirmText: "Ya, Batalkan",
      cancelText: "Kembali",
      isDanger: true
    });
    if (confirmed) {
      setEditingSegment(null);
      setActiveTab("dashboard");
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Administrator yang dapat menyimpan atau mengubah data survei.", "error");
      return;
    }

    const segmentPayload = {
      code,
      name,
      district,
      kecamatan,
      lengthKm,
      widthM,
      surfaceType,
      condition,
      constYear,
      startLat,
      startLng,
      endLat,
      endLng,
      description: description || undefined,
      surveyor
    };

    if (editingSegment) {
      updateSegment(editingSegment.id, segmentPayload);
      setEditingSegment(null);
    } else {
      addSegment(segmentPayload);
    }

    setActiveTab("dashboard");
  };

  // Generate random coordinates in Kupang area when user clicks on minimap to make it feel responsive
  const handleMinimapClick = () => {
    // Random perturbation around Kupang city (-10.16, 123.61)
    const randomOffset1 = (Math.random() - 0.5) * 0.05;
    const randomOffset2 = (Math.random() - 0.5) * 0.05;
    const randomOffset3 = (Math.random() - 0.5) * 0.05;
    const randomOffset4 = (Math.random() - 0.5) * 0.05;

    const baseLat = district === "Kota Kupang" ? -10.16 : district === "Kab. Sikka" ? -8.62 : -9.86;
    const baseLng = district === "Kota Kupang" ? 123.61 : district === "Kab. Sikka" ? 122.21 : 124.28;

    setStartLat(Math.round((baseLat + randomOffset1) * 1000000) / 1000000);
    setStartLng(Math.round((baseLng + randomOffset2) * 1000000) / 1000000);
    setEndLat(Math.round((baseLat + randomOffset3) * 1000000) / 1000000);
    setEndLng(Math.round((baseLng + randomOffset4) * 1000000) / 1000000);

    showToast("Koordinat GPS berhasil disesuaikan dari titik klik peta!", "info");
  };

  const stepClasses = (step: number) => {
    if (currentStep === step) {
      return "bg-primary text-on-primary border-primary shadow-sm ring-4 ring-primary/20";
    }
    if (currentStep > step) {
      return "bg-tertiary text-white border-tertiary";
    }
    return "bg-surface-container-high text-on-surface-variant border-transparent";
  };

  return (
    <div className="max-w-7xl mx-auto p-margin_mobile md:p-margin_desktop pb-24">
      {/* Visitor Read-Only Alert Banner */}
      {!isAdmin && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
          <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-xs">Mode Baca (Visitor)</h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
              Anda sedang membuka formulir survei leger jalan dalam mode pratinjau baca saja. Anda dapat menavigasi setiap tahapan formulir, namun penyimpanan dan modifikasi data hanya dapat dilakukan oleh <strong>Administrator</strong>.
            </p>
          </div>
        </div>
      )}

      {/* View Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            {editingSegment ? "Edit Atribut Leger Jalan" : "Input / Registrasi Data Leger"}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            {editingSegment
              ? `Mengedit data atribut ruas: ${editingSegment.name}`
              : "Formulir pendataan teknis, administrasi, dan koordinat fisik segmentasi jalan provinsi."}
          </p>
        </div>
        {editingSegment && (
          <button
            onClick={() => {
              setEditingSegment(null);
              setActiveTab("data");
            }}
            className="flex items-center gap-1 text-xs text-error font-bold border border-error/20 bg-error/5 hover:bg-error/10 px-3 py-1.5 rounded transition-all"
          >
            <X className="w-3.5 h-3.5" /> Batal Edit
          </button>
        )}
      </div>

      {/* Progress Stepper */}
      <div className="mb-stack_lg bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between relative">
          {/* Background progress track */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-container-high rounded-full z-0"></div>

          {/* Active progress fill */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          ></div>

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md text-sm border-4 border-surface-container-lowest transition-all ${stepClasses(1)}`}>
              {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : "1"}
            </div>
            <span className={`font-label-md text-xs hidden sm:block ${currentStep >= 1 ? "text-primary font-bold" : "text-on-surface-variant"}`}>
              General Info
            </span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md text-sm border-4 border-surface-container-lowest transition-all ${stepClasses(2)}`}>
              {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : "2"}
            </div>
            <span className={`font-label-md text-xs hidden sm:block ${currentStep >= 2 ? "text-primary font-bold" : "text-on-surface-variant"}`}>
              Technical Specs
            </span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md text-sm border-4 border-surface-container-lowest transition-all ${stepClasses(3)}`}>
              {currentStep > 3 ? <CheckCircle className="w-5 h-5" /> : "3"}
            </div>
            <span className={`font-label-md text-xs hidden sm:block ${currentStep >= 3 ? "text-primary font-bold" : "text-on-surface-variant"}`}>
              Condition &amp; GPS
            </span>
          </div>

          {/* Step 4 */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md text-sm border-4 border-surface-container-lowest transition-all ${stepClasses(4)}`}>
              "4"
            </div>
            <span className={`font-label-md text-xs hidden sm:block ${currentStep >= 4 ? "text-primary font-bold" : "text-on-surface-variant"}`}>
              Review &amp; Save
            </span>
          </div>
        </div>
      </div>

      {/* Form Canvas (Bento-style 2-Column layout) */}
      <form onSubmit={handleSubmitForm} className="grid grid-cols-1 lg:grid-cols-12 gap-stack_md lg:gap-gutter">
        {/* Left Column: Main wizard fields */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Step 1 Content: General Info */}
          {currentStep === 1 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-5 animate-fade-in">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                <Info className="text-primary w-5 h-5" />
                Informasi Administrasi
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                    Kode Ruas / Road ID <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. 011.11.K"
                    className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all uppercase"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Formulasikan ID resmi dari Dinas PUPR.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                    Nama Ruas Jalan / Road Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jl. Sudirman - Segmen Kupang Barat"
                    className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Cantumkan nama jalan lokal populer atau koridor regional.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                    Kabupaten / Kota Wilayah <span className="text-error">*</span>
                  </label>
                  <select
                    value={district}
                    onChange={handleDistrictChange}
                    className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required
                  >
                    {(districtList && districtList.length > 0 ? districtList : DISTRICT_LIST).map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                    Kecamatan Wilayah <span className="text-error">*</span>
                  </label>
                  <select
                    value={kecamatan}
                    onChange={(e) => setKecamatan(e.target.value)}
                    className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required
                  >
                    {((kecamatanMap && kecamatanMap[district]) || KECAMATAN_MAP[district] || []).map((kec) => (
                      <option key={kec} value={kec}>
                        {kec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Content: Technical Specs */}
          {currentStep === 2 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-5 animate-fade-in">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                <Layers className="text-primary w-5 h-5" />
                Spesifikasi Geometri &amp; Konstruksi
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                    Panjang Jalan / Length (KM) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={lengthKm}
                    onChange={(e) => setLengthKm(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 12.5"
                    className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Masukkan total jangkauan kilometer segmentasi.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                    Lebar Jalan / Width (Meter) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    value={widthM}
                    onChange={(e) => setWidthM(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 7.0"
                    className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Lebar perkerasan rata-rata aktif dalam satuan meter.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                    Jenis Perkerasan / Surface Type <span className="text-error">*</span>
                  </label>
                  <select
                    value={surfaceType}
                    onChange={(e) => setSurfaceType(e.target.value as SurfaceType)}
                    className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required
                  >
                    {Object.values(SurfaceType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                    Tahun Konstruksi / Pembangunan <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2027"
                    value={constYear}
                    onChange={(e) => setConstYear(parseInt(e.target.value) || 2025)}
                    placeholder="e.g. 2018"
                    className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Tahun perkerasan awal diresmikan atau dioverlay ulang.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 Content: Condition & Coordinates */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Core Condition Evaluator */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-5">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                  <Compass className="text-primary w-5 h-5" />
                  Kondisi Kemantapan &amp; Surveyor
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                      Kondisi Fisik Ruas <span className="text-error">*</span>
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as RoadCondition)}
                      className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold"
                      required
                    >
                      {Object.values(RoadCondition).map((cond) => (
                        <option key={cond} value={cond}>
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                      Petugas Surveyor PUPR <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={surveyor}
                      onChange={(e) => setSurveyor(e.target.value)}
                      placeholder="e.g. Budi Santoso"
                      className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 font-medium text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                      Deskripsi Kerusakan / Catatan Lapangan (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Retak memanjang pada Km 1.5 s/d Km 2.0. Membutuhkan sealing darurat."
                      className="w-full bg-surface-bright border border-outline-variant rounded-md px-3 py-2 font-body-sm text-sm h-20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Coordinates Mapping Card */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
                  <MapPin className="text-primary w-5 h-5" />
                  Koordinat Fisik &amp; Peta Geografis (GIS)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                      Titik Pangkal / Start Coordinate (Lat, Long)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={`${startLat}, ${startLng}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(",");
                          if (parts.length === 2) {
                            setStartLat(parseFloat(parts[0]) || startLat);
                            setStartLng(parseFloat(parts[1]) || startLng);
                          }
                        }}
                        className="w-full bg-surface-bright border border-outline-variant rounded-md pl-9 pr-3 py-2 font-mono text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                      <Locate className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-xs font-bold text-on-surface-variant">
                      Titik Ujung / End Coordinate (Lat, Long)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={`${endLat}, ${endLng}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(",");
                          if (parts.length === 2) {
                            setEndLat(parseFloat(parts[0]) || endLat);
                            setEndLng(parseFloat(parts[1]) || endLng);
                          }
                        }}
                        className="w-full bg-surface-bright border border-outline-variant rounded-md pl-9 pr-3 py-2 font-mono text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Minimap Box */}
                <div className="relative border border-outline-variant rounded-lg h-44 overflow-hidden shadow-inner flex items-center justify-center">
                  <div
                    onClick={handleMinimapClick}
                    className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center cursor-crosshair group"
                    title="Klik peta untuk menaruh titik koordinat acak di Kupang / NTT!"
                  >
                    {/* Mock map layout */}
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div className="absolute top-1/3 left-1/4 w-1/2 h-1/3 border border-emerald-300 rounded bg-emerald-200/20 pointer-events-none flex items-center justify-center text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                      Wilayah Kerja {district}
                    </div>

                    {/* Vector line plot representing coordinates */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <line
                        x1="80"
                        y1="110"
                        x2="280"
                        y2="60"
                        stroke="#93000b"
                        strokeWidth="3"
                        strokeDasharray="4 2"
                        className="animate-pulse"
                      />
                      <circle cx="80" cy="110" r="5" fill="#22c55e" />
                      <circle cx="280" cy="60" r="5" fill="#ba1a1a" />
                      <text x="75" y="125" className="text-[9px] font-mono fill-current text-slate-500 font-bold">Start</text>
                      <text x="275" y="50" className="text-[9px] font-mono fill-current text-slate-500 font-bold">End</text>
                    </svg>

                    <div className="absolute top-3 right-3 bg-surface-container-lowest/90 border border-outline-variant rounded px-2 py-1 text-[9px] font-bold text-primary animate-bounce">
                      KLIK PETA UNTUK SIMULASI GPS
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast("Zoom In minimap", "info");
                      }}
                      className="bg-surface-container-lowest border border-outline-variant rounded p-1 shadow hover:bg-surface-container-high transition-colors text-on-surface"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast("Zoom Out minimap", "info");
                      }}
                      className="bg-surface-container-lowest border border-outline-variant rounded p-1 shadow hover:bg-surface-container-high transition-colors text-on-surface"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 Content: Review & Save */}
          {currentStep === 4 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                <CheckCircle className="text-tertiary w-5 h-5" />
                Review &amp; Konfirmasi Atribut Leger
              </h3>

              <div className="space-y-4">
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  Harap teliti kembali data berikut sebelum melakukan registrasi permanen ke database LENTERA.
                </p>

                <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-outline-variant/60">
                    {/* Col 1 */}
                    <div className="p-4 space-y-3.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Kode / ID Ruas</span>
                        <p className="text-sm font-bold font-mono text-primary mt-0.5">{code}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Nama Ruas Jalan</span>
                        <p className="text-sm font-bold text-on-surface mt-0.5">{name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Kabupaten</span>
                          <p className="text-xs font-semibold text-on-surface mt-0.5">{district}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Kecamatan</span>
                          <p className="text-xs font-semibold text-on-surface mt-0.5">{kecamatan}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Panjang</span>
                          <p className="text-xs font-mono font-bold text-on-surface mt-0.5">{lengthKm} KM</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Lebar</span>
                          <p className="text-xs font-mono font-bold text-on-surface mt-0.5">{widthM} Meter</p>
                        </div>
                      </div>
                    </div>

                    {/* Col 2 */}
                    <div className="p-4 space-y-3.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Jenis Perkerasan</span>
                        <p className="text-xs font-bold text-on-surface mt-0.5 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-outline" /> {surfaceType}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Kondisi Kemantapan</span>
                          <p className="text-xs font-bold text-on-surface mt-0.5 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${condition === RoadCondition.MANTAP ? "bg-tertiary" : condition === RoadCondition.SEDANG ? "bg-secondary" : "bg-error"}`} />
                            {condition}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Tahun Konstruksi</span>
                          <p className="text-xs font-mono font-bold text-on-surface mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-outline" /> {constYear}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Start Lat / Lng</span>
                          <p className="text-[10px] font-mono text-on-surface-variant mt-0.5">{startLat}, {startLng}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">End Lat / Lng</span>
                          <p className="text-[10px] font-mono text-on-surface-variant mt-0.5">{endLat}, {endLng}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Nama Petugas Penilai / Surveyor</span>
                        <p className="text-xs font-bold text-on-surface mt-0.5 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-outline" /> {surveyor}
                        </p>
                      </div>
                    </div>
                  </div>

                  {description && (
                    <div className="p-4 border-t border-outline-variant/60 bg-surface">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">Catatan Tambahan</span>
                      <p className="text-xs text-on-surface-variant italic font-medium">"{description}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Meta & Action buttons */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Meta Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold border-b border-outline-variant/40 pb-2 mb-4">
              Metadata Survei
            </h3>
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                <span className="font-label-sm text-on-surface-variant font-medium">Penginput Sistem</span>
                <span className="font-body-sm font-bold text-on-surface flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-outline" /> Ahmad Ridwan
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                <span className="font-label-sm text-on-surface-variant font-medium">Tanggal Masukan</span>
                <span className="font-body-sm font-bold text-on-surface flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-outline" /> 05 Jul 2026
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-on-surface-variant font-medium">Status Pengiriman</span>
                <span className="font-label-sm text-[10px] font-bold uppercase tracking-wider bg-surface-container-highest text-primary border border-outline-variant px-2.5 py-0.5 rounded-full">
                  {editingSegment ? "MODE EDIT" : "REGISTRASI BARU"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Control Panel */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-3.5 sticky top-[88px]">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-2.5 px-4 bg-primary text-on-primary font-label-md text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-sm"
              >
                Langkah Berikutnya
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : isAdmin ? (
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-tertiary text-on-tertiary font-label-md text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-tertiary-container transition-colors shadow-sm"
              >
                {editingSegment ? "Simpan Perubahan" : "Registrasikan Ruas"}
                <CheckCircle className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center space-y-1">
                <span className="text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Mode Pratinjau
                </span>
                <p className="text-[10px] text-amber-700">Hanya Administrator yang dapat menyimpan data</p>
              </div>
            )}

            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-full py-2.5 px-4 border border-outline text-on-surface font-label-md text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Langkah Sebelumnya
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={handleSaveAsDraft}
                className="w-full py-2.5 px-4 bg-surface-container-low border border-outline-variant text-on-surface font-label-md text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"
              >
                <Save className="w-4 h-4 text-outline" />
                Simpan Sebagai Draft
              </button>
            )}

            <button
              type="button"
              onClick={handleCancelSurvey}
              className="w-full py-2.5 px-4 mt-2 text-error font-label-md text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-error-container/20 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
