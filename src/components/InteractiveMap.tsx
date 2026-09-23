/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * InteractiveMap — Leaflet JS + NTT Provincial Road Network (GeoJSON 2023)
 * Follows exact geometry, categorical palette, and interaction from leger_jalan_demo.html
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import { useRoads } from "../context/RoadContext";
import {
  Search,
  Locate,
  X,
  MapPin,
  Filter,
  AlertCircle,
  RefreshCw,
  Route,
  Maximize2
} from "lucide-react";
import { DISTRICT_LIST } from "../data/initialData";

// ─── Fix Leaflet default icon paths (Vite breaks them) ────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Constants & Palette from leger_jalan_demo.html ──────────────────────────
const NTT_CENTER: L.LatLngExpression = [-9.0, 121.5];
const NTT_ZOOM = 8;

type LayerMode = "map" | "satellite" | "terrain";

// Exact categorical palette from leger_jalan_demo.html
const DEMO_PALETTE = [
  "#3388ff", "#e6550d", "#31a354", "#e7298a", "#756bb1", "#636363",
  "#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d",
  "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#a65628", "#f781bf", "#999999",
  "#66c2a5", "#fc8d62"
];

// Base tile layers
const TILE_LAYERS: Record<LayerMode, { url: string; attribution: string; maxZoom: number }> = {
  map: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  },
  satellite: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: "&copy; Google Maps",
    maxZoom: 20,
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; OpenStreetMap | Style: &copy; OpenTopoMap',
    maxZoom: 17,
  },
};

export interface RoadFeatureProperties {
  FID?: string;
  Kl_Dat_Das?: string;
  Nm_Ruas?: string;
  Thn_Data?: string;
  Status?: string;
  Fungsi?: string;
  Mendukung?: string;
  Kd_Bd_Pu?: string;
  Kd_Jns_Inf?: string;
  Kd_Inf?: string;
  Provinsi?: string;
  Kab_Kota?: string;
  Tk_Ruas_Aw?: string;
  Tk_Ruas_Ak?: string;
  Km_Awal?: string;
  Km_Akhir?: string;
  Panjang?: string;
  Lbr_Keras?: string;
  Jns_Pen?: string;
  Koord_X_Aw?: string;
  Koord_Y_Aw?: string;
  Koord_X_Ak?: string;
  Koord_Y_Ak?: string;
}

export interface RoadFeature {
  type: "Feature";
  properties: RoadFeatureProperties;
  geometry: { type: "LineString" | "MultiLineString"; coordinates: any };
}

function fmtKm(v?: string | number) {
  if (!v) return "-";
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? String(v) : n.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " km";
}

function popupHtml(p: RoadFeatureProperties) {
  const rows: [string, string | undefined][] = [
    ["Status", p.Status],
    ["Fungsi", p.Fungsi],
    ["Kab/Kota", p.Kab_Kota],
    ["Panjang", fmtKm(p.Panjang)],
    ["Km", p.Km_Awal !== undefined && p.Km_Akhir !== undefined ? `${p.Km_Awal} - ${p.Km_Akhir}` : undefined],
    ["Lebar perkerasan", p.Lbr_Keras ? `${p.Lbr_Keras} m` : "-"],
    ["Jenis perkerasan", p.Jns_Pen],
    ["Tahun data", p.Thn_Data],
    ["Mendukung", p.Mendukung],
  ];

  const tr = rows
    .filter(([_, val]) => val !== undefined && val !== "")
    .map(([label, val]) => `
      <tr>
        <td style="padding: 2px 8px 2px 0; color: #6b7280; white-space: nowrap; font-size: 12px; vertical-align: top;">${label}</td>
        <td style="padding: 2px 0; color: #14181f; font-size: 12px; font-weight: 500;">${val}</td>
      </tr>
    `).join("");

  return `
    <div style="font-family: -apple-system, 'Segoe UI', Arial, sans-serif; padding: 2px;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px; color: #14181f; line-height: 1.3;">
        ${p.Nm_Ruas || "(tanpa nama)"}
      </div>
      <table style="font-size: 12px; border-collapse: collapse; width: 100%;">
        ${tr}
      </table>
    </div>
  `;
}

export const InteractiveMap: React.FC = () => {
  const { districtList } = useRoads();

  // UI state
  const [selectedKab, setSelectedKab] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [layerMode, setLayerMode] = useState<LayerMode>("map"); // Default OpenStreetMap as in demo
  const [kmzLoading, setKmzLoading] = useState(false);
  const [kmzError, setKmzError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("map");
  const [activePanel, setActivePanel] = useState<"list" | "detail">("list");
  const [selectedFeature, setSelectedFeature] = useState<RoadFeature | null>(null);

  // GeoJSON dataset
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const layerByFeatureRef = useRef<Map<any, L.Layer>>(new Map());

  // Dynamic Kab/Kota List
  const kabList = useMemo(() => {
    if (!geoJsonData?.features) return [];
    const set = new Set<string>();
    geoJsonData.features.forEach((f: RoadFeature) => {
      if (f.properties?.Kab_Kota) set.add(f.properties.Kab_Kota);
    });
    return Array.from(set).sort();
  }, [geoJsonData]);

  // Color Map per Kab/Kota
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    kabList.forEach((k, i) => {
      map[k] = DEMO_PALETTE[i % DEMO_PALETTE.length];
    });
    return map;
  }, [kabList]);

  // Filtered features for the sidebar list
  const filteredFeatures = useMemo(() => {
    if (!geoJsonData?.features) return [];
    const q = searchQuery.trim().toLowerCase();
    return geoJsonData.features.filter((f: RoadFeature) => {
      const p = f.properties;
      const name = (p.Nm_Ruas || "").toLowerCase();
      const matchQ = !q || name.includes(q);
      const matchKab = !selectedKab || p.Kab_Kota === selectedKab;
      return matchQ && matchKab;
    });
  }, [geoJsonData, searchQuery, selectedKab]);

  // ─── 1. Inisialisasi Peta Leaflet persis seperti demo HTML ──────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView(NTT_CENTER, NTT_ZOOM);

    // Zoom control at top-right
    L.control.zoom({ position: "topright" }).addTo(map);

    // Default tile: OpenStreetMap (same as html demo)
    const cfg = TILE_LAYERS["map"];
    const tile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    });
    tile.addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tile;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── 2. Switch Base Tile (Map / Satelit / Terrain) ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const cfg = TILE_LAYERS[layerMode];
    const newTile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    });
    newTile.addTo(map);
    tileLayerRef.current = newTile;
  }, [layerMode]);

  // ─── 3. Fetch GeoJSON Data ─────────────────────────────────────────────────
  useEffect(() => {
    setKmzLoading(true);
    setKmzError(null);

    const loadData = async () => {
      try {
        let resp = await fetch("/data/leger_jalan_ntt.geojson");
        if (!resp.ok) {
          resp = await fetch("/data/ntt_roads_geojson.json");
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const geojson = await resp.json();
        setGeoJsonData(geojson);
      } catch (err: any) {
        console.error("[LENTERA] Failed to load GeoJSON:", err);
        setKmzError("Gagal memuat dataset jalan SK NTT.");
      } finally {
        setKmzLoading(false);
      }
    };

    loadData();
  }, []);

  // ─── 4. Render GeoJSON Layer via L.geoJSON (persis seperti leger_jalan_demo.html) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoJsonData || !geoJsonData.features) return;

    // Hapus layer lama jika ada
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
    }
    layerByFeatureRef.current.clear();

    const geoLayer = L.geoJSON(geoJsonData, {
      style: (f: any) => ({
        color: colorMap[f.properties?.Kab_Kota || "Lainnya"] || "#3388ff",
        weight: 3.5,
        opacity: 0.85,
      }),
      onEachFeature: (f: any, layer: any) => {
        layer.bindPopup(popupHtml(f.properties));
        layer.on({
          mouseover: (e: any) => {
            e.target.setStyle({ weight: 6, opacity: 1 });
            if (e.target.bringToFront) e.target.bringToFront();
          },
          mouseout: (e: any) => {
            if (selectedFeature?.properties?.FID !== f.properties?.FID) {
              geoLayer.resetStyle(e.target);
            }
          },
          click: () => {
            setSelectedFeature(f);
            setActivePanel("detail");
          },
        });
        layerByFeatureRef.current.set(f, layer);
      },
    }).addTo(map);

    geoLayerRef.current = geoLayer;

    // Fit bounds pada initial load
    map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
  }, [geoJsonData, colorMap]);

  // ─── 5. Update Visibility Layer saat Filter Search / Kab_Kota berubah ───────
  useEffect(() => {
    if (!geoJsonData?.features) return;
    const q = searchQuery.trim().toLowerCase();
    const kab = selectedKab;

    geoJsonData.features.forEach((f: RoadFeature) => {
      const p = f.properties;
      const name = (p.Nm_Ruas || "").toLowerCase();
      const matchQ = !q || name.includes(q);
      const matchKab = !kab || p.Kab_Kota === kab;
      const visible = matchQ && matchKab;

      const layer: any = layerByFeatureRef.current.get(f);
      if (layer) {
        layer.setStyle({
          opacity: visible ? 0.85 : 0,
          weight: visible ? 3.5 : 0,
        });
        if (layer._path) {
          layer._path.style.display = visible ? "" : "none";
        }
      }
    });
  }, [searchQuery, selectedKab, geoJsonData]);

  // ─── 6. Handler klik ruas di list sidebar ──────────────────────────────────
  const handleItemClick = useCallback((f: RoadFeature) => {
    setSelectedFeature(f);
    setActivePanel("detail");

    const layer: any = layerByFeatureRef.current.get(f);
    const map = mapRef.current;
    if (layer && map) {
      map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 13 });
      layer.openPopup();
    }
  }, []);

  const handleResetView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (geoLayerRef.current) {
      map.fitBounds(geoLayerRef.current.getBounds(), { padding: [20, 20] });
    } else {
      map.setView(NTT_CENTER, NTT_ZOOM);
    }
    setSelectedFeature(null);
    setActivePanel("list");
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Bar Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-black text-on-surface tracking-wide flex items-center gap-2">
            <Route className="w-4 h-4 text-primary" />
            Leger Jalan Provinsi NTT
          </h2>
          <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">
            Ruas jalan provinsi • Data 2023 • Menampilkan <b>{filteredFeatures.length}</b> dari <b>{geoJsonData?.features?.length || 0}</b> ruas
          </p>
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileView("map")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileView === "map" ? "bg-primary text-white" : "bg-surface-container border border-outline-variant text-on-surface"
            }`}
          >
            Peta
          </button>
          <button
            onClick={() => setMobileView("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileView === "list" ? "bg-primary text-white" : "bg-surface-container border border-outline-variant text-on-surface"
            }`}
          >
            Daftar ({filteredFeatures.length})
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden gap-3 px-4 pb-4">

        {/* ── Left Sidebar (List & Filter) ──────────────────────────────────── */}
        <div className={`w-80 md:w-88 flex-shrink-0 flex flex-col gap-2.5 overflow-hidden ${
          mobileView === "map" ? "hidden md:flex" : "flex"
        }`}>

          {/* Search & District Filter Container */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 space-y-2 flex-shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-3.5 h-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama ruas..."
                className="w-full bg-surface-bright border border-outline-variant rounded-lg pl-8 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary transition-all text-on-surface"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-error transition-colors p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Kabupaten / Kota */}
            <select
              value={selectedKab}
              onChange={(e) => setSelectedKab(e.target.value)}
              className="w-full bg-surface-bright border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary transition-all text-on-surface"
            >
              <option value="">Semua kabupaten/kota</option>
              {(kabList.length > 0 ? kabList : (districtList || DISTRICT_LIST)).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Bar */}
          <div className="px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/60 text-[11px] text-on-surface-variant flex justify-between items-center flex-shrink-0">
            <span>Menampilkan <b>{filteredFeatures.length}</b> dari <b>{geoJsonData?.features?.length || 0}</b> ruas</span>
            {selectedKab && (
              <button onClick={() => setSelectedKab("")} className="text-[10px] text-primary font-bold hover:underline">
                Reset
              </button>
            )}
          </div>

          {/* Road List or Detail Panel */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {activePanel === "detail" && selectedFeature ? (
              /* ── Detail Panel ── */
              <div className="bg-surface-bright border border-outline-variant rounded-xl overflow-hidden animate-fadeIn">
                <div
                  className="p-3 text-white flex justify-between items-start"
                  style={{
                    backgroundColor: colorMap[selectedFeature.properties.Kab_Kota || "Lainnya"] || "#3388ff"
                  }}
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/20 text-white tracking-wider inline-block mb-1">
                      {selectedFeature.properties.Kab_Kota || "Jalan Provinsi"}
                    </span>
                    <h4 className="text-xs font-black text-white leading-snug">
                      {selectedFeature.properties.Nm_Ruas || "(tanpa nama)"}
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFeature(null);
                      setActivePanel("list");
                    }}
                    className="p-1 bg-black/20 hover:bg-black/40 rounded-lg transition-colors text-white shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 space-y-2 text-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-outline-variant/30">
                        <td className="py-1 text-on-surface-variant text-[11px] font-medium">Status</td>
                        <td className="py-1 text-on-surface font-bold text-[11px]">{selectedFeature.properties.Status || "-"}</td>
                      </tr>
                      <tr className="border-b border-outline-variant/30">
                        <td className="py-1 text-on-surface-variant text-[11px] font-medium">Fungsi</td>
                        <td className="py-1 text-on-surface font-bold text-[11px]">{selectedFeature.properties.Fungsi || "-"}</td>
                      </tr>
                      <tr className="border-b border-outline-variant/30">
                        <td className="py-1 text-on-surface-variant text-[11px] font-medium">Kab/Kota</td>
                        <td className="py-1 text-on-surface font-bold text-[11px]">{selectedFeature.properties.Kab_Kota || "-"}</td>
                      </tr>
                      <tr className="border-b border-outline-variant/30">
                        <td className="py-1 text-on-surface-variant text-[11px] font-medium">Panjang</td>
                        <td className="py-1 text-primary font-bold text-[11px]">{fmtKm(selectedFeature.properties.Panjang)}</td>
                      </tr>
                      <tr className="border-b border-outline-variant/30">
                        <td className="py-1 text-on-surface-variant text-[11px] font-medium">Km</td>
                        <td className="py-1 text-on-surface font-bold text-[11px]">{selectedFeature.properties.Km_Awal || "0"} - {selectedFeature.properties.Km_Akhir || "-"}</td>
                      </tr>
                      <tr className="border-b border-outline-variant/30">
                        <td className="py-1 text-on-surface-variant text-[11px] font-medium">Lebar perkerasan</td>
                        <td className="py-1 text-on-surface font-bold text-[11px]">{selectedFeature.properties.Lbr_Keras ? `${selectedFeature.properties.Lbr_Keras} m` : "-"}</td>
                      </tr>
                      <tr className="border-b border-outline-variant/30">
                        <td className="py-1 text-on-surface-variant text-[11px] font-medium">Jenis perkerasan</td>
                        <td className="py-1 text-on-surface font-bold text-[11px]">{selectedFeature.properties.Jns_Pen || "-"}</td>
                      </tr>
                      <tr className="border-b border-outline-variant/30">
                        <td className="py-1 text-on-surface-variant text-[11px] font-medium">Tahun data</td>
                        <td className="py-1 text-on-surface font-bold text-[11px]">{selectedFeature.properties.Thn_Data || "-"}</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-on-surface-variant text-[11px] font-medium">Mendukung</td>
                        <td className="py-1 text-on-surface font-bold text-[11px]">{selectedFeature.properties.Mendukung || "-"}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => handleItemClick(selectedFeature)}
                      className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-1"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Fokuskan Peta
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFeature(null);
                        setActivePanel("list");
                      }}
                      className="px-3 py-1.5 bg-surface-container-low border border-outline-variant text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container transition-all"
                    >
                      Kembali
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Road List (persis seperti .road-item di demo HTML) ── */
              <>
                {kmzLoading ? (
                  <div className="space-y-2 p-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="border border-outline-variant/50 rounded-xl p-3 bg-surface-bright animate-pulse flex gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-surface-container-high shrink-0 mt-1" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-surface-container-high rounded w-3/4" />
                          <div className="h-2.5 bg-surface-container-high rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredFeatures.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-bold">Tidak ada ruas yang cocok.</p>
                  </div>
                ) : (
                  filteredFeatures.map((f: RoadFeature, idx: number) => {
                    const p = f.properties;
                    const kab = p.Kab_Kota || "Lainnya";
                    const color = colorMap[kab] || "#3388ff";
                    const isSelected = selectedFeature?.properties?.FID === p.FID;

                    return (
                      <div
                        key={p.FID || idx}
                        onClick={() => handleItemClick(f)}
                        className={`w-full text-left border rounded-xl p-2.5 flex items-start gap-2.5 transition-all hover:shadow-xs cursor-pointer group ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                            : "border-outline-variant bg-surface-bright hover:border-primary/40 hover:bg-surface-container-low"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {p.Nm_Ruas || "(tanpa nama)"}
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {p.Kab_Kota || "-"} &middot; {fmtKm(p.Panjang)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right Map View ────────────────────────────────────────────────── */}
        <div className={`flex-1 relative rounded-2xl overflow-hidden border border-outline-variant shadow-xs ${
          mobileView === "list" ? "hidden md:block" : "block"
        }`}>

          {/* Leaflet map container */}
          <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "520px" }} />

          {/* Layer Mode Switcher — Top Left */}
          <div className="absolute top-3 left-3 z-[1000] flex gap-1 bg-surface/90 backdrop-blur-xs p-1 rounded-xl border border-outline-variant shadow-md">
            {(["map", "satellite", "terrain"] as LayerMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setLayerMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all capitalize ${
                  layerMode === mode
                    ? "bg-primary text-white shadow-xs"
                    : "text-on-surface hover:bg-surface-container"
                }`}
              >
                {mode === "map" ? "Standar" : mode === "satellite" ? "Satelit" : "Terrain"}
              </button>
            ))}
          </div>

          {/* Reset NTT View Button — Top Right */}
          <div className="absolute top-3 right-12 z-[1000]">
            <button
              onClick={handleResetView}
              className="p-2 bg-surface/95 border border-outline-variant rounded-xl shadow-md text-on-surface hover:bg-surface-container transition-all flex items-center gap-1 text-[11px] font-bold"
              title="Reset ke Tampilan Keseluruhan NTT"
            >
              <Locate className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Reset NTT</span>
            </button>
          </div>

          {/* Loading Indicator */}
          {kmzLoading && (
            <div className="absolute bottom-16 left-3 z-[1000] flex items-center gap-2.5 bg-surface/95 border border-outline-variant rounded-xl px-3.5 py-2 shadow-lg backdrop-blur-xs">
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              <span className="text-[11px] font-bold text-on-surface">Memuat data ruas jalan...</span>
            </div>
          )}

          {/* Error Notice */}
          {kmzError && (
            <div className="absolute bottom-16 left-3 z-[1000] flex items-center gap-2 bg-error-container border border-error/20 rounded-xl px-3.5 py-2 shadow-lg max-w-xs">
              <AlertCircle className="w-4 h-4 text-error shrink-0" />
              <span className="text-[10px] font-bold text-on-error-container">{kmzError}</span>
              <button onClick={() => setKmzError(null)} className="ml-1 text-error hover:opacity-70">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Palet Wilayah Legenda — Bottom Left */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-surface/95 backdrop-blur-xs border border-outline-variant rounded-xl p-3 shadow-lg max-w-[280px] max-h-[160px] overflow-y-auto">
            <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Warna Kabupaten / Kota</span>
              <span className="text-[8px] text-primary">{kabList.length} Wilayah</span>
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {kabList.slice(0, 10).map((kab) => (
                <div key={kab} className="flex items-center gap-1.5 text-[9px] truncate" title={kab}>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                    style={{ backgroundColor: colorMap[kab] }}
                  />
                  <span className="font-semibold text-on-surface truncate">
                    {kab.replace(/^KAB\.\s*/, "").replace(/^KOTA\s*/, "")}
                  </span>
                </div>
              ))}
              {kabList.length > 10 && (
                <div className="col-span-2 text-[8px] text-on-surface-variant/80 font-bold pt-1 border-t border-outline-variant/30">
                  + {kabList.length - 10} wilayah lainnya
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

