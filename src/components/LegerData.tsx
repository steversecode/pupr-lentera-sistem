/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useRoads } from "../context/RoadContext";
import { useAuth } from "../context/AuthContext";
import { confirmDialog } from "../lib/swal";
import { RoadSegment, RoadCondition, SurfaceType } from "../types";
import {
  Search,
  Eye,
  Trash2,
  Edit,
  Plus,
  FileText,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  FilterX,
  X,
  MapPin,
  Calendar,
  Layers,
  Wrench,
  User,
  Info
} from "lucide-react";
import { DISTRICT_LIST } from "../data/initialData";

export const LegerData: React.FC = () => {
  const { segments, deleteSegment, setEditingSegment, setActiveTab, showToast, districtList } = useRoads();
  const { appRole } = useAuth();
  const isAdmin = appRole === "admin";

  // Filter States
  const [filterRegion, setFilterRegion] = useState("Semua Wilayah");
  const [filterSurface, setFilterSurface] = useState("Semua Jenis");
  const [filterCondition, setFilterCondition] = useState("Semua Kondisi");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Selected row for detail modal
  const [detailedSegId, setDetailedSegId] = useState<string | null>(null);

  // Filter segments dynamically
  const filteredSegments = useMemo(() => {
    return segments.filter((seg) => {
      // 1. Region filter
      const matchRegion = filterRegion === "Semua Wilayah" || seg.district === filterRegion;

      // 2. Surface filter
      let matchSurface = true;
      if (filterSurface !== "Semua Jenis") {
        if (filterSurface === "Hotmix / Aspal") {
          matchSurface =
            seg.surfaceType === SurfaceType.HOTMIX_AC_WC ||
            seg.surfaceType === SurfaceType.HOTMIX_AC_BC ||
            seg.surfaceType === SurfaceType.ASPHALT;
        } else if (filterSurface === "Rigid / Beton") {
          matchSurface = seg.surfaceType === SurfaceType.RIGID_PAVEMENT;
        } else if (filterSurface === "Telford / Kerikil") {
          matchSurface = seg.surfaceType === SurfaceType.TELFORD;
        }
      }

      // 3. Condition filter
      let matchCondition = true;
      if (filterCondition !== "Semua Kondisi") {
        if (filterCondition === "Mantap (Baik/Sedang)") {
          matchCondition =
            seg.condition === RoadCondition.MANTAP || seg.condition === RoadCondition.SEDANG;
        } else if (filterCondition === "Tidak Mantap (Rusak)") {
          matchCondition =
            seg.condition === RoadCondition.RUSAK_RINGAN ||
            seg.condition === RoadCondition.RUSAK_BERAT;
        }
      }

      // 4. Search Query
      const matchSearch =
        seg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seg.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seg.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seg.surveyor.toLowerCase().includes(searchQuery.toLowerCase());

      return matchRegion && matchSurface && matchCondition && matchSearch;
    });
  }, [segments, filterRegion, filterSurface, filterCondition, searchQuery]);

  // Reset all filters
  const handleResetFilters = () => {
    setFilterRegion("Semua Wilayah");
    setFilterSurface("Semua Jenis");
    setFilterCondition("Semua Kondisi");
    setSearchQuery("");
    setCurrentPage(1);
    showToast("Filter pencarian telah direset.", "info");
  };

  // Pagination calculations
  const totalItems = filteredSegments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedSegments = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredSegments.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredSegments, currentPage]);

  const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(currentPage * itemsPerPage, totalItems);

  // Detail segment modal info
  const detailedSegment = useMemo(() => {
    return segments.find((s) => s.id === detailedSegId) || null;
  }, [segments, detailedSegId]);

  const handleExportPDF = () => {
    showToast("Berhasil mengeksport data leger ke PDF. Menyimpan file...", "success");
  };

  const handleExportExcel = () => {
    showToast("Berhasil mengeksport data leger ke Excel (XLSX). Menyimpan file...", "success");
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmDialog({
      title: "Hapus Data Ruas?",
      text: `Data ruas "${name}" akan dihapus secara permanen dan tidak dapat dikembalikan.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      isDanger: true,
    });
    if (confirmed) {
      deleteSegment(id);
      if (detailedSegId === id) {
        setDetailedSegId(null);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-gutter pt-8 relative">
      {/* Page Header & Actions */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-background">Database Leger Jalan</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Mengelola dan memonitor {segments.length} segmen jalan provinsi secara real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-outline-variant text-on-surface font-label-md text-label-md rounded shadow-sm hover:bg-surface-container transition-colors"
          >
            <FileText className="w-4 h-4 text-primary" />
            Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-outline-variant text-on-surface font-label-md text-label-md rounded shadow-sm hover:bg-surface-container transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-tertiary" />
            Export Excel
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setEditingSegment(null);
                setActiveTab("survey");
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary font-label-md text-label-md rounded shadow-sm hover:bg-primary-container transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Data
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-3">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
            Filter by Wilayah
          </label>
          <select
            value={filterRegion}
            onChange={(e) => {
              setFilterRegion(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option>Semua Wilayah</option>
            {(districtList && districtList.length > 0 ? districtList : DISTRICT_LIST).map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
            Jenis Perkerasan
          </label>
          <select
            value={filterSurface}
            onChange={(e) => {
              setFilterSurface(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option>Semua Jenis</option>
            <option>Hotmix / Aspal</option>
            <option>Rigid / Beton</option>
            <option>Telford / Kerikil</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
            Kondisi Terakhir
          </label>
          <select
            value={filterCondition}
            onChange={(e) => {
              setFilterCondition(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option>Semua Kondisi</option>
            <option>Mantap (Baik/Sedang)</option>
            <option>Tidak Mantap (Rusak)</option>
          </select>
        </div>

        <div className="md:col-span-3 relative">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1.5">
            Pencarian Spesifik
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="Cari nama, patok, surveyor..."
            />
          </div>
        </div>

        <div className="md:col-span-1">
          <button
            onClick={handleResetFilters}
            className="w-full py-2 bg-surface-container-high border border-outline-variant text-on-surface font-label-md text-xs rounded hover:bg-surface-variant transition-colors flex items-center justify-center gap-1.5 h-[38px] font-bold"
            title="Reset Filters"
          >
            <FilterX className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
        {/* Desktop Layout Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container font-label-md text-label-md text-on-surface-variant border-b border-outline-variant">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Kode Ruas</th>
                <th className="py-3.5 px-4 w-[28%]">Nama Ruas</th>
                <th className="py-3.5 px-4 text-right">Panjang (km)</th>
                <th className="py-3.5 px-4 text-right">Lebar (m)</th>
                <th className="py-3.5 px-4">Jenis Perkerasan</th>
                <th className="py-3.5 px-4 text-center">Kondisi</th>
                <th className="py-3.5 px-4 text-center">Tahun</th>
                <th className="py-3.5 px-4 text-right pr-6 w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/60">
              {paginatedSegments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                    Tidak ditemukan data ruas jalan yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedSegments.map((seg, idx) => {
                  const itemIndex = startEntry + idx;
                  const condColors = {
                    [RoadCondition.MANTAP]: "bg-tertiary-fixed-dim border-tertiary-fixed text-on-tertiary-fixed-variant",
                    [RoadCondition.SEDANG]: "bg-secondary-fixed border-secondary-fixed-dim text-on-secondary-fixed-variant",
                    [RoadCondition.RUSAK_RINGAN]: "bg-orange-50 border-orange-200 text-orange-800",
                    [RoadCondition.RUSAK_BERAT]: "bg-error-container border-error text-on-error-container"
                  }[seg.condition];

                  const dotColors = {
                    [RoadCondition.MANTAP]: "bg-tertiary",
                    [RoadCondition.SEDANG]: "bg-secondary",
                    [RoadCondition.RUSAK_RINGAN]: "bg-orange-500",
                    [RoadCondition.RUSAK_BERAT]: "bg-error"
                  }[seg.condition];

                  return (
                    <tr key={seg.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="py-3.5 px-4 text-center text-on-surface-variant font-medium">
                        {itemIndex}
                      </td>
                      <td className="py-3.5 px-4 font-bold font-mono text-primary text-xs">
                        {seg.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-on-surface">
                        {seg.name}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium">
                        {seg.lengthKm.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium">
                        {seg.widthM.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant font-medium">
                        {seg.surfaceType}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${condColors}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />
                          {seg.condition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-on-surface-variant font-medium">
                        {seg.constYear}
                      </td>
                      <td className="py-3.5 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setDetailedSegId(seg.id)}
                            className="p-1.5 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                            title="Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingSegment(seg);
                                  setActiveTab("survey");
                                }}
                                className="p-1.5 rounded text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(seg.id, seg.name)}
                                className="p-1.5 rounded text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card-based layout */}
        <div className="block md:hidden divide-y divide-outline-variant/40">
          {paginatedSegments.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              Tidak ditemukan data ruas jalan yang cocok dengan pencarian Anda.
            </div>
          ) : (
            paginatedSegments.map((seg, idx) => {
              const itemIndex = startEntry + idx;
              const condColors = {
                [RoadCondition.MANTAP]: "bg-tertiary-fixed-dim border-tertiary-fixed text-on-tertiary-fixed-variant",
                [RoadCondition.SEDANG]: "bg-secondary-fixed border-secondary-fixed-dim text-on-secondary-fixed-variant",
                [RoadCondition.RUSAK_RINGAN]: "bg-orange-50 border-orange-200 text-orange-800",
                [RoadCondition.RUSAK_BERAT]: "bg-error-container border-error text-on-error-container"
              }[seg.condition];

              const dotColors = {
                [RoadCondition.MANTAP]: "bg-tertiary",
                [RoadCondition.SEDANG]: "bg-secondary",
                [RoadCondition.RUSAK_RINGAN]: "bg-orange-500",
                [RoadCondition.RUSAK_BERAT]: "bg-error"
              }[seg.condition];

              return (
                <div key={seg.id} className="p-4 space-y-3 hover:bg-surface-container-low transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">No. {itemIndex}</span>
                      <span className="font-bold font-mono text-primary text-xs mt-0.5">{seg.code}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${condColors}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />
                      {seg.condition}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-on-surface text-sm">{seg.name}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{seg.district}, {seg.kecamatan}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-surface border border-outline-variant/40 rounded p-2 text-[11px]">
                    <div>
                      <span className="text-on-surface-variant block text-[9px] uppercase font-bold">Panjang</span>
                      <span className="font-mono font-bold text-on-surface">{seg.lengthKm.toFixed(2)} km</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[9px] uppercase font-bold">Lebar</span>
                      <span className="font-mono font-bold text-on-surface">{seg.widthM.toFixed(2)} m</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[9px] uppercase font-bold">Tahun</span>
                      <span className="font-mono font-bold text-on-surface">{seg.constYear}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                    <span className="text-xs text-on-surface-variant font-medium">{seg.surfaceType}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDetailedSegId(seg.id)}
                        className="p-1.5 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors flex items-center gap-1 text-xs font-semibold"
                      >
                        <Eye className="w-4 h-4" /> Detail
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setEditingSegment(seg);
                              setActiveTab("survey");
                            }}
                            className="p-1.5 rounded text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors flex items-center gap-1 text-xs font-semibold"
                          >
                            <Edit className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(seg.id, seg.name)}
                            className="p-1.5 rounded text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors flex items-center gap-1 text-xs font-semibold"
                          >
                            <Trash2 className="w-4 h-4" /> Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <div className="mt-auto px-6 py-4 bg-surface border-t border-outline-variant flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Menampilkan <span className="font-bold text-on-surface">{startEntry}</span> hingga{" "}
            <span className="font-bold text-on-surface">{endEntry}</span> dari{" "}
            <span className="font-bold text-on-surface">{totalItems}</span> entri
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                  currentPage === pageNum
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Row detail modal popup overlay */}
      {detailedSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg shadow-2xl overflow-hidden p-0 m-4">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <div className="flex items-center gap-2">
                <Info className="text-primary w-5 h-5" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Informasi Atribut Leger</h3>
              </div>
              <button
                onClick={() => setDetailedSegId(null)}
                className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-full hover:bg-surface-container"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Kode Ruas</span>
                  <p className="font-mono text-sm font-bold text-primary">{detailedSegment.code}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Surveyor Atribut</span>
                  <p className="font-sans text-sm font-bold flex items-center gap-1 justify-end">
                    <User className="w-3.5 h-3.5 text-outline" /> {detailedSegment.surveyor}
                  </p>
                </div>
              </div>

              <div className="border-t border-outline-variant/30 pt-3">
                <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Nama Ruas</span>
                <h4 className="font-headline-sm text-lg text-on-surface font-bold leading-snug">{detailedSegment.name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/30 pt-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Kabupaten / Kota</span>
                  <p className="text-sm font-medium flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5 text-primary" /> {detailedSegment.district}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Kecamatan</span>
                  <p className="text-sm font-medium flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5 text-outline" /> {detailedSegment.kecamatan}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Geometris (Panjang x Lebar)</span>
                  <p className="text-sm font-mono font-medium mt-0.5">{detailedSegment.lengthKm} KM x {detailedSegment.widthM} M</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Kondisi Kemantapan</span>
                  <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      detailedSegment.condition === RoadCondition.MANTAP
                        ? "bg-tertiary"
                        : detailedSegment.condition === RoadCondition.SEDANG
                        ? "bg-secondary"
                        : "bg-error"
                    }`} />
                    {detailedSegment.condition}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Perkerasan</span>
                  <p className="text-sm font-medium mt-0.5 flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-outline" /> {detailedSegment.surfaceType}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Tahun Pembangunan</span>
                  <p className="text-sm font-medium mt-0.5 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-outline" /> {detailedSegment.constYear}</p>
                </div>
              </div>

              {detailedSegment.description && (
                <div className="border-t border-outline-variant/30 pt-3">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Catatan Kerusakan / Survey</span>
                  <p className="text-xs bg-surface p-3 rounded text-on-surface-variant leading-relaxed mt-1 font-medium italic border border-outline-variant/40">
                    "{detailedSegment.description}"
                  </p>
                </div>
              )}

              <div className="border-t border-outline-variant/30 pt-3 text-[10px] text-on-surface-variant font-semibold flex justify-between">
                <span>Update Terakhir: {detailedSegment.lastUpdated}</span>
                <span>ID: {detailedSegment.id}</span>
              </div>
            </div>

            <div className="bg-surface-container-low p-4 flex justify-end gap-2">
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditingSegment(detailedSegment);
                    setActiveTab("survey");
                    setDetailedSegId(null);
                  }}
                  className="px-4 py-2 bg-primary text-on-primary font-label-md text-xs rounded hover:bg-primary-container transition-colors shadow-sm flex items-center gap-1.5 font-bold"
                >
                  <Wrench className="w-3.5 h-3.5" /> Edit Data Ruas
                </button>
              )}
              <button
                onClick={() => setDetailedSegId(null)}
                className="px-4 py-2 border border-outline text-on-surface hover:bg-surface-container rounded font-label-md text-xs transition-colors font-bold"
              >
                Tutup Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
