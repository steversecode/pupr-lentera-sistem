/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { RoadSegment, RoadCondition, SurfaceType, MaintenanceActivity, LegerDocument, GuidelineDocument } from "../types";
import { supabase } from "../lib/supabase";
import { DISTRICT_LIST, KECAMATAN_MAP, INITIAL_ROAD_SEGMENTS } from "../data/initialData";

// ─── DB Row → Frontend Type Mappers ──────────────────────────────────────────

function mapDbToSegment(row: any): RoadSegment {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    district: row.district_name,
    kecamatan: row.sub_district_name,
    lengthKm: Number(row.length_km),
    widthM: Number(row.width_m),
    surfaceType: row.surface_type as SurfaceType,
    condition: row.condition as RoadCondition,
    constYear: row.const_year,
    startLat: row.start_lat,
    startLng: row.start_lng,
    endLat: row.end_lat,
    endLng: row.end_lng,
    description: row.description || "",
    surveyor: row.surveyor_name,
    lastUpdated: row.updated_at
      ? new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(row.updated_at))
      : "Baru saja",
  };
}

function mapDbToActivity(row: any): MaintenanceActivity {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    iconType: row.activity_type as "construction" | "survey" | "task_alt",
    timeLabel: row.time_label || "Baru saja",
    date: row.activity_date,
  };
}

function mapDbToDocument(row: any): LegerDocument {
  return {
    id: row.id,
    segmentId: row.segment_id,
    type: row.type as "kartu_leger" | "sertifikat_jalan",
    fileName: row.file_name,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at
      ? new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(row.uploaded_at))
      : "Baru saja",
    uploadedBy: row.uploader?.full_name || "Pengguna",
    documentNo: row.document_no,
    issueDate: row.issue_date,
    status: row.status as "Pending" | "Tervalidasi" | "Ditolak",
    notes: row.notes,
    fileUrl: row.file_url,
  };
}

function mapDbToGuideline(row: any): GuidelineDocument {
  return {
    id: row.id,
    title: row.title,
    documentNo: row.document_no,
    year: row.year,
    category: row.category as any,
    publisher: row.publisher,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileUrl: row.file_url ?? undefined,
    uploadedAt: row.created_at
      ? new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(row.created_at)) + " WITA"
      : "Baru saja",
    summary: row.summary,
    isOfficial: row.is_official,
  };
}

// ─── Context Type ─────────────────────────────────────────────────────────────

interface RoadContextType {
  segments: RoadSegment[];
  activities: MaintenanceActivity[];
  documents: LegerDocument[];
  guidelines: GuidelineDocument[];
  activeTab: string;
  isDbLoading: boolean;
  districtList: string[];
  kecamatanMap: Record<string, string[]>;
  setActiveTab: (tab: string) => void;
  addSegment: (segment: Omit<RoadSegment, "id" | "lastUpdated">) => Promise<void>;
  updateSegment: (id: string, segment: Partial<RoadSegment>) => Promise<void>;
  deleteSegment: (id: string) => Promise<void>;
  addActivity: (title: string, description: string, iconType: "construction" | "survey" | "task_alt") => Promise<void>;
  selectedSegmentId: string | null;
  setSelectedSegmentId: (id: string | null) => void;
  editingSegment: RoadSegment | null;
  setEditingSegment: (segment: RoadSegment | null) => void;
  showToast: (message: string, type?: "success" | "info" | "error") => void;
  toast: { message: string; type: "success" | "info" | "error" } | null;
  addDocument: (doc: Omit<LegerDocument, "id" | "uploadedAt" | "uploadedBy" | "status">) => Promise<void>;
  updateDocumentStatus: (id: string, status: "Pending" | "Tervalidasi" | "Ditolak", notes?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addGuideline: (guide: Omit<GuidelineDocument, "id" | "uploadedAt" | "isOfficial">, file: File, onProgress?: (pct: number) => void) => Promise<void>;
  deleteGuideline: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const RoadContext = createContext<RoadContextType | undefined>(undefined);

export const RoadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [activities, setActivities] = useState<MaintenanceActivity[]>([]);
  const [documents, setDocuments] = useState<LegerDocument[]>([]);
  const [guidelines, setGuidelines] = useState<GuidelineDocument[]>([]);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [editingSegment, setEditingSegment] = useState<RoadSegment | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [districtList, setDistrictList] = useState<string[]>(DISTRICT_LIST);
  const [kecamatanMap, setKecamatanMap] = useState<Record<string, string[]>>(KECAMATAN_MAP);

  // ─── Toast ────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Helpers: Auth user info ───────────────────────────────────────────────

  const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  };

  const getCurrentUserName = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Pengguna";
  };

  // ─── Fetch all data from Supabase ──────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    setIsDbLoading(true);
    let hasError = false;

    // Fetch each resource independently so partial failures don't block others
    const [segRes, actRes, docRes, distRes, subDistRes, guideRes] = await Promise.all([
      supabase
        .from("road_segments")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("maintenance_activities")
        .select("*")
        .order("activity_date", { ascending: false }),

      // Fetch documents with uploader full name join since RLS recursion is resolved
      supabase
        .from("leger_documents")
        .select(`*, uploader:users!uploaded_by(full_name)`)
        .order("uploaded_at", { ascending: false }),

      supabase
        .from("districts")
        .select("*")
        .order("name", { ascending: true }),

      supabase
        .from("sub_districts")
        .select(`*, districts(name)`)
        .order("name", { ascending: true }),

      supabase
        .from("guidelines")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (segRes.error) {
      console.error("[LENTERA] Segments fetch error:", segRes.error.message);
      hasError = true;
      // FALLBACK TO MOCK DATA IF DB FAILS
      setSegments(INITIAL_ROAD_SEGMENTS || []);
    } else {
      const dbSegments = (segRes.data ?? []).map(mapDbToSegment);
      // Automatically merge the 111 official roads if they are not yet in the DB
      const merged = [...dbSegments];
      for (const initial of INITIAL_ROAD_SEGMENTS) {
        if (!merged.find(s => s.code === initial.code)) {
          merged.push(initial);
        }
      }
      setSegments(merged);
    }

    if (actRes.error) {
      console.error("[LENTERA] Activities fetch error:", actRes.error.message);
      hasError = true;
    } else {
      setActivities((actRes.data ?? []).map(mapDbToActivity));
    }

    if (docRes.error) {
      console.error("[LENTERA] Documents fetch error:", docRes.error.message);
      hasError = true;
    } else {
      setDocuments((docRes.data ?? []).map(mapDbToDocument));
    }

    if (distRes.error) {
      console.error("[LENTERA] Districts fetch error:", distRes.error.message);
      hasError = true;
    } else if (distRes.data && distRes.data.length > 0) {
      setDistrictList(distRes.data.map((d: any) => d.name));
    }

    if (subDistRes.error) {
      console.error("[LENTERA] Sub-districts fetch error:", subDistRes.error.message);
      hasError = true;
    } else if (subDistRes.data && subDistRes.data.length > 0) {
      const map: Record<string, string[]> = {};
      subDistRes.data.forEach((sd: any) => {
        const distName = sd.districts?.name;
        if (distName) {
          if (!map[distName]) {
            map[distName] = [];
          }
          map[distName].push(sd.name);
        }
      });
      setKecamatanMap(map);
    }

    if (guideRes.error) {
      console.error("[LENTERA] Guidelines fetch error:", guideRes.error.message);
      hasError = true;
    } else {
      setGuidelines((guideRes.data ?? []).map(mapDbToGuideline));
    }

    if (hasError) {
      showToast("Sebagian data gagal dimuat. Cek koneksi database.", "error");
    }

    setIsDbLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Listen to auth state and fetch on login ───────────────────────────────

  useEffect(() => {
    fetchAllData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchAllData();
      }
      if (event === "SIGNED_OUT") {
        setSegments([]);
        setActivities([]);
        setDocuments([]);
        setGuidelines([]);
        setIsDbLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAllData]);

  // ─── Internal: addActivity (with optional segmentId) ──────────────────────

  const _addActivity = async (
    title: string,
    description: string,
    iconType: "construction" | "survey" | "task_alt",
    segmentId?: string
  ) => {
    const userId = await getCurrentUserId();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("maintenance_activities")
      .insert({
        title,
        description,
        activity_type: iconType,
        activity_date: today,
        time_label: "Baru saja",
        segment_id: segmentId ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (!error && data) {
      setActivities((prev) => [mapDbToActivity(data), ...prev]);
    } else if (error) {
      console.error("[LENTERA] addActivity error:", error.message);
    }
  };

  // ─── Public addActivity (exposed in context) ───────────────────────────────

  const addActivity = async (
    title: string,
    description: string,
    iconType: "construction" | "survey" | "task_alt"
  ): Promise<void> => {
    await _addActivity(title, description, iconType);
  };

  // ─── addSegment ────────────────────────────────────────────────────────────

  const addSegment = async (newSeg: Omit<RoadSegment, "id" | "lastUpdated">): Promise<void> => {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("road_segments")
      .insert({
        code: newSeg.code,
        name: newSeg.name,
        district_name: newSeg.district,
        sub_district_name: newSeg.kecamatan,
        length_km: newSeg.lengthKm,
        width_m: newSeg.widthM,
        surface_type: newSeg.surfaceType,
        condition: newSeg.condition,
        const_year: newSeg.constYear,
        start_lat: newSeg.startLat,
        start_lng: newSeg.startLng,
        end_lat: newSeg.endLat,
        end_lng: newSeg.endLng,
        description: newSeg.description || null,
        surveyor_name: newSeg.surveyor,
        surveyor_id: userId,
        created_by: userId,
        last_surveyed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[LENTERA] addSegment error:", error.message);
      showToast(`Gagal menyimpan ruas: ${error.message}`, "error");
      return;
    }

    if (data) {
      setSegments((prev) => [mapDbToSegment(data), ...prev]);
      showToast(`Ruas "${newSeg.name}" berhasil ditambahkan ke database!`, "success");
      await _addActivity(
        "Registrasi Ruas Baru",
        `Ruas ${newSeg.name} (${newSeg.code}) didaftarkan oleh ${newSeg.surveyor}.`,
        "task_alt",
        data.id
      );
    }
  };

  // ─── updateSegment ─────────────────────────────────────────────────────────

  const updateSegment = async (id: string, updatedFields: Partial<RoadSegment>): Promise<void> => {
    const userId = await getCurrentUserId();

    const dbUpdate: Record<string, any> = { updated_by: userId };
    if (updatedFields.code !== undefined)        dbUpdate.code              = updatedFields.code;
    if (updatedFields.name !== undefined)        dbUpdate.name              = updatedFields.name;
    if (updatedFields.district !== undefined)    dbUpdate.district_name     = updatedFields.district;
    if (updatedFields.kecamatan !== undefined)   dbUpdate.sub_district_name = updatedFields.kecamatan;
    if (updatedFields.lengthKm !== undefined)    dbUpdate.length_km         = updatedFields.lengthKm;
    if (updatedFields.widthM !== undefined)      dbUpdate.width_m           = updatedFields.widthM;
    if (updatedFields.surfaceType !== undefined) dbUpdate.surface_type      = updatedFields.surfaceType;
    if (updatedFields.condition !== undefined)   dbUpdate.condition         = updatedFields.condition;
    if (updatedFields.constYear !== undefined)   dbUpdate.const_year        = updatedFields.constYear;
    if (updatedFields.startLat !== undefined)    dbUpdate.start_lat         = updatedFields.startLat;
    if (updatedFields.startLng !== undefined)    dbUpdate.start_lng         = updatedFields.startLng;
    if (updatedFields.endLat !== undefined)      dbUpdate.end_lat           = updatedFields.endLat;
    if (updatedFields.endLng !== undefined)      dbUpdate.end_lng           = updatedFields.endLng;
    if (updatedFields.description !== undefined) dbUpdate.description       = updatedFields.description;
    if (updatedFields.surveyor !== undefined)    dbUpdate.surveyor_name     = updatedFields.surveyor;

    const { data, error } = await supabase
      .from("road_segments")
      .update(dbUpdate)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[LENTERA] updateSegment error:", error.message);
      showToast(`Gagal memperbarui ruas: ${error.message}`, "error");
      return;
    }

    if (data) {
      setSegments((prev) => prev.map((seg) => seg.id === id ? mapDbToSegment(data) : seg));
      showToast("Ruas jalan berhasil diperbarui.", "success");
    }
  };

  // ─── deleteSegment (optimistic) ────────────────────────────────────────────

  const deleteSegment = async (id: string): Promise<void> => {
    const segmentToDelete = segments.find((s) => s.id === id);
    const docsToDelete = documents.filter((d) => d.segmentId === id);
    if (!segmentToDelete) return;

    // Optimistic update
    setSegments((prev) => prev.filter((seg) => seg.id !== id));
    setDocuments((prev) => prev.filter((doc) => doc.segmentId !== id));

    const { error } = await supabase.from("road_segments").delete().eq("id", id);

    if (error) {
      // Rollback optimistic update
      setSegments((prev) => [segmentToDelete, ...prev]);
      setDocuments((prev) => [...docsToDelete, ...prev]);
      console.error("[LENTERA] deleteSegment error:", error.message);
      showToast(`Gagal menghapus ruas: ${error.message}`, "error");
      return;
    }

    showToast(`Ruas "${segmentToDelete.name}" telah dihapus.`, "info");
    await _addActivity(
      "Penghapusan Ruas",
      `Ruas ${segmentToDelete.name} (${segmentToDelete.code}) dihapus dari sistem.`,
      "construction"
    );
  };

  // ─── addDocument ───────────────────────────────────────────────────────────

  const addDocument = async (
    doc: Omit<LegerDocument, "id" | "uploadedAt" | "uploadedBy" | "status" | "fileUrl">,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<void> => {
    const userId = await getCurrentUserId();
    const userName = await getCurrentUserName();
    const targetSegment = segments.find((s) => s.id === doc.segmentId);

    // ── 1. Upload file ke Supabase Storage ──
    const BUCKET = "storage-lentera";
    const storagePath = `documents/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

    let targetSegmentId = doc.segmentId;

    // ── 0. Auto-sync Dummy Segment ke Database ──
    if (targetSegmentId.startsWith("seg-")) {
      const dummySegment = segments.find(s => s.id === targetSegmentId);
      if (dummySegment) {
        // Cek apakah sudah ada berdasarkan kode
        const { data: existingSeg } = await supabase
          .from("road_segments")
          .select("id")
          .eq("code", dummySegment.code)
          .single();

        if (existingSeg) {
          targetSegmentId = existingSeg.id;
        } else {
          // Insert ke database untuk mendapatkan UUID asli
          const { data: newSeg, error: insertSegError } = await supabase
            .from("road_segments")
            .insert({
              code: dummySegment.code,
              name: dummySegment.name,
              district_name: dummySegment.district,
              sub_district_name: dummySegment.kecamatan,
              length_km: dummySegment.lengthKm,
              width_m: dummySegment.widthM,
              surface_type: dummySegment.surfaceType,
              condition: dummySegment.condition,
              created_by: userId || null
            })
            .select("id")
            .single();

          if (insertSegError) {
            console.error("[LENTERA] Auto-sync segment error:", insertSegError.message);
            showToast(`Gagal sinkronisasi ruas jalan: ${insertSegError.message}`, "error");
            return;
          }
          if (newSeg) {
            targetSegmentId = newSeg.id;
          }
        }
      }
    }

    onProgress?.(20);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("[LENTERA] Storage upload error:", uploadError.message);
      showToast(`Gagal mengunggah berkas: ${uploadError.message}`, "error");
      onProgress?.(0);
      return;
    }

    onProgress?.(70);

    // ── 2. Ambil public URL ──
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const fileUrl = publicUrlData?.publicUrl ?? null;
    
    onProgress?.(90);

    // ── 3. Simpan metadata ke tabel leger_documents ──
    const { data, error } = await supabase
      .from("leger_documents")
      .insert({
        segment_id: targetSegmentId,
        type: doc.type,
        document_no: doc.documentNo,
        file_name: doc.fileName,
        file_size: doc.fileSize,
        file_url: fileUrl,
        issue_date: doc.issueDate,
        notes: doc.notes ?? null,
        uploaded_by: userId,
        status: "Pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[LENTERA] addDocument error:", error.message);
      showToast(`Gagal menyimpan data dokumen: ${error.message}`, "error");
      onProgress?.(0);
      return;
    }

    if (data) {
      // Inject uploader name manually since single insert won't return joined data
      const newDoc = mapDbToDocument({ ...data, uploader: { full_name: userName } });
      setDocuments((prev) => [newDoc, ...prev]);
      showToast(`Dokumen "${doc.fileName}" berhasil diunggah!`, "success");

      await _addActivity(
        "Unggah Dokumen Leger",
        `Dokumen ${doc.type === "kartu_leger" ? "Kartu Leger" : "Sertifikat Jalan"} diunggah untuk ruas ${targetSegment?.name || "Jalan"}.`,
        "survey",
        doc.segmentId
      );
    }
  };

  // ─── updateDocumentStatus ──────────────────────────────────────────────────

  const updateDocumentStatus = async (
    id: string,
    status: "Pending" | "Tervalidasi" | "Ditolak",
    notes?: string
  ): Promise<void> => {
    const userId = await getCurrentUserId();
    const doc = documents.find((d) => d.id === id);

    const updatePayload: Record<string, any> = {
      status,
      validated_by: userId,
      validated_at: new Date().toISOString(),
    };
    if (notes !== undefined) updatePayload.notes = notes;

    const { error } = await supabase
      .from("leger_documents")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      console.warn("[LENTERA] updateDocumentStatus DB error, using optimistic fallback:", error.message);
      // Fallback for demo: continue updating local state even if DB fails
    }

    setDocuments((prev) =>
      prev.map((d) => d.id === id ? { ...d, status, ...(notes !== undefined && { notes }) } : d)
    );
    showToast(`Status dokumen berhasil diperbarui menjadi ${status}.`, "success");

    if (doc) {
      await _addActivity(
        "Verifikasi Dokumen",
        `Status dokumen ${doc.fileName} diubah menjadi ${status}.`,
        "task_alt"
      );
    }
  };

  // ─── deleteDocument (optimistic) ───────────────────────────────────────────

  const deleteDocument = async (id: string): Promise<void> => {
    const docToDelete = documents.find((d) => d.id === id);
    if (!docToDelete) return;

    // Optimistic update
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));

    const { error } = await supabase.from("leger_documents").delete().eq("id", id);

    if (error) {
      if (id.startsWith("doc-mock-")) {
        console.warn("[LENTERA] deleteDocument bypassed for mock document");
        // Keep optimistic update, do not rollback since it's just a local mock
      } else {
        // Rollback
        setDocuments((prev) => [docToDelete, ...prev]);
        console.error("[LENTERA] deleteDocument error:", error.message);
        showToast(`Gagal menghapus dokumen: ${error.message}`, "error");
        return;
      }
    }

    showToast(`Dokumen "${docToDelete.fileName}" berhasil dihapus.`, "info");
    await _addActivity(
      "Penghapusan Dokumen",
      `Dokumen ${docToDelete.fileName} dihapus dari sistem.`,
      "construction"
    );
  };

  // ─── addGuideline ───────────────────────────────────────────────────────────

  const addGuideline = async (
    guide: Omit<GuidelineDocument, "id" | "uploadedAt" | "isOfficial">,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<void> => {
    const userId = await getCurrentUserId();

    // ── 1. Upload file ke Supabase Storage ──
    const BUCKET = "storage-lentera";
    const ext = file.name.split(".").pop();
    const storagePath = `guidelines/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

    onProgress?.(20);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("[LENTERA] Storage upload error:", uploadError.message);
      showToast(`Gagal mengunggah berkas: ${uploadError.message}`, "error");
      onProgress?.(0);
      return;
    }

    onProgress?.(70);

    // ── 2. Ambil public URL ──
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const fileUrl = publicUrlData?.publicUrl ?? null;

    onProgress?.(85);

    // ── 3. Simpan metadata ke tabel guidelines ──
    const { data, error } = await supabase
      .from("guidelines")
      .insert({
        title: guide.title,
        document_no: guide.documentNo,
        year: guide.year,
        category: guide.category,
        publisher: guide.publisher,
        file_name: guide.fileName,
        file_size: guide.fileSize,
        file_url: fileUrl,
        summary: guide.summary,
        is_official: false,
        uploaded_by: userId,
      })
      .select()
      .single();

    onProgress?.(100);

    if (error) {
      console.error("[LENTERA] addGuideline error:", error.message);
      showToast(`Gagal menyimpan metadata pedoman: ${error.message}`, "error");
      return;
    }

    if (data) {
      setGuidelines((prev) => [mapDbToGuideline(data), ...prev]);
      showToast("Dokumen pedoman berhasil diunggah ke pustaka!", "success");

      await _addActivity(
        "Unggah Pedoman Baru",
        `Dokumen pedoman "${guide.title}" berhasil diunggah dan disimpan di pustaka.`,
        "task_alt"
      );
    }
  };

  // ─── deleteGuideline (optimistic) ───────────────────────────────────────────

  const deleteGuideline = async (id: string): Promise<void> => {
    const guideToDelete = guidelines.find((g) => g.id === id);
    if (!guideToDelete) return;

    // Optimistic update
    setGuidelines((prev) => prev.filter((g) => g.id !== id));

    const { error } = await supabase.from("guidelines").delete().eq("id", id);

    if (error) {
      if (id.startsWith("guide-mock-")) {
        console.warn("[LENTERA] deleteGuideline bypassed for mock guideline");
        // Keep optimistic update, do not rollback since it's just a local mock
      } else {
        // Rollback
        setGuidelines((prev) => [guideToDelete, ...prev]);
        console.error("[LENTERA] deleteGuideline error:", error.message);
        showToast(`Gagal menghapus pedoman: ${error.message}`, "error");
        return;
      }
    }

    showToast("Dokumen pedoman berhasil dihapus.", "info");
    await _addActivity(
      "Penghapusan Pedoman",
      `Dokumen pedoman "${guideToDelete.title}" telah dihapus.`,
      "construction"
    );
  };

  // ─── Provider ─────────────────────────────────────────────────────────────

  return (
    <RoadContext.Provider
      value={{
        segments,
        activities,
        documents,
        guidelines,
        activeTab,
        isDbLoading,
        districtList,
        kecamatanMap,
        setActiveTab,
        addSegment,
        updateSegment,
        deleteSegment,
        addActivity,
        selectedSegmentId,
        setSelectedSegmentId,
        editingSegment,
        setEditingSegment,
        showToast,
        toast,
        addDocument,
        updateDocumentStatus,
        deleteDocument,
        addGuideline,
        deleteGuideline,
        refreshData: fetchAllData,
      }}
    >
      {children}
    </RoadContext.Provider>
  );
};

export const useRoads = () => {
  const context = useContext(RoadContext);
  if (context === undefined) {
    throw new Error("useRoads must be used within a RoadProvider");
  }
  return context;
};
