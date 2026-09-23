/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { useRoads } from "../context/RoadContext";
import { RoadCondition, SurfaceType } from "../types";
import { FileText, Printer, BarChart2, TrendingUp, AlertCircle, PieChart, ShieldAlert } from "lucide-react";

export const Reports: React.FC = () => {
  const { segments, showToast } = useRoads();

  // Dynamic statistics calculations for reports
  const reportsData = useMemo(() => {
    let totalLength = 0;
    const condCounts: Record<RoadCondition, number> = {
      [RoadCondition.MANTAP]: 0,
      [RoadCondition.SEDANG]: 0,
      [RoadCondition.RUSAK_RINGAN]: 0,
      [RoadCondition.RUSAK_BERAT]: 0
    };

    const surfaceCounts: Record<SurfaceType, number> = {
      [SurfaceType.ASPHALT]: 0,
      [SurfaceType.HOTMIX_AC_WC]: 0,
      [SurfaceType.HOTMIX_AC_BC]: 0,
      [SurfaceType.RIGID_PAVEMENT]: 0,
      [SurfaceType.TELFORD]: 0
    };

    segments.forEach((seg) => {
      totalLength += seg.lengthKm;
      condCounts[seg.condition] += 1;
      surfaceCounts[seg.surfaceType] += 1;
    });

    return {
      totalLength: Math.round(totalLength * 10) / 10,
      condCounts,
      surfaceCounts,
      totalCount: segments.length || 1
    };
  }, [segments]);

  const handlePrint = () => {
    showToast("Membuka dialog cetak laporan PDF...", "success");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-gutter pt-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface">Pelaporan &amp; Analisis</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            Analisis sebaran geometris, kemantapan, dan sebaran jenis perkerasan jalan provinsi.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-primary text-on-primary px-5 py-2.5 rounded font-label-md text-sm flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm font-bold"
        >
          <Printer className="w-4 h-4" />
          Cetak Dokumen
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Kondisi Kemantapan */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
            <PieChart className="text-primary w-5 h-5" />
            Distribusi Kondisi Jalan (Ruas)
          </h3>
          <div className="space-y-3">
            {Object.entries(reportsData.condCounts).map(([cond, count]) => {
              const pct = Math.round(((count as number) / reportsData.totalCount) * 100);
              const color = {
                [RoadCondition.MANTAP]: "bg-tertiary",
                [RoadCondition.SEDANG]: "bg-secondary",
                [RoadCondition.RUSAK_RINGAN]: "bg-orange-500",
                [RoadCondition.RUSAK_BERAT]: "bg-error"
              }[cond as RoadCondition];

              return (
                <div key={cond} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-on-surface-variant">
                      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      {cond}
                    </span>
                    <span className="text-on-surface font-mono">{count} Ruas ({pct}%)</span>
                  </div>
                  <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                    <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Jenis Perkerasan */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
            <BarChart2 className="text-primary w-5 h-5" />
            Analisis Jenis Perkerasan (Ruas)
          </h3>
          <div className="space-y-3">
            {Object.entries(reportsData.surfaceCounts).map(([type, count]) => {
              const pct = Math.round(((count as number) / reportsData.totalCount) * 100);
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-on-surface-variant">{type}</span>
                    <span className="text-on-surface font-mono">{count} Ruas ({pct}%)</span>
                  </div>
                  <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary report alert section */}
      <div className="bg-surface-container border border-outline-variant/60 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <ShieldAlert className="w-10 h-10 text-primary shrink-0" />
        <div>
          <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">Rencana Pemeliharaan Strategis NTT</h4>
          <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
            Berdasarkan data terkini, terdapat sekitar <b>{Math.round((reportsData.condCounts[RoadCondition.RUSAK_BERAT] / reportsData.totalCount) * 100)}%</b> ruas jalan provinsi yang berkategori <b>Rusak Berat</b>. Wilayah tersebut memerlukan alokasi anggaran penanganan darurat berkala (rehabilitasi mayor) pada triwulan ini.
          </p>
        </div>
      </div>
    </div>
  );
};
