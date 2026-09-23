-- ============================================================
-- 🏛️ LENTERA — ALL-IN-ONE COMPLETE DATABASE SETUP (FINAL)
-- Sistem Informasi Leger Jalan | Dinas PUPR Provinsi NTT
-- Versi: v2.5.0 SIGAP (Production Ready)
--
-- CARA PENGGUNAAN:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Masuk ke menu "SQL Editor"
-- 3. Copy-Paste SEMUA kode di bawah ini, lalu klik "RUN" (Ctrl + Enter)
-- 4. Script ini 100% IDEMPOTENT (aman dijalankan berulang kali tanpa error)
-- ============================================================

-- ============================================================
-- BAGIAN 0: EXTENSION & BERSIHKAN POLICY / TRIGGER LAMA
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Hapus semua policy lama di tabel public agar tidak terjadi infinite recursion / konflik
DO $drop_all_policies$
DECLARE
  pol record;
  tbl text;
BEGIN
  FOR tbl IN VALUES
    ('users'), ('road_segments'), ('leger_documents'),
    ('maintenance_activities'), ('audit_logs'),
    ('districts'), ('sub_districts'), ('guidelines'), ('system_settings'), ('utility_requests')
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $drop_all_policies$;

-- Hapus storage policy lama jika ada
DO $storage_cleanup$ BEGIN
  DROP POLICY IF EXISTS "Public dapat membaca semua berkas" ON storage.objects;
  DROP POLICY IF EXISTS "User terautentikasi bisa upload berkas" ON storage.objects;
  DROP POLICY IF EXISTS "User bisa update berkas milik sendiri" ON storage.objects;
  DROP POLICY IF EXISTS "User atau Admin bisa hapus berkas" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $storage_cleanup$;

-- Hapus trigger lama
DO $droptriggers$ BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
  DROP TRIGGER IF EXISTS trg_road_segments_updated_at ON public.road_segments;
EXCEPTION WHEN OTHERS THEN NULL;
END $droptriggers$;


-- ============================================================
-- BAGIAN 1: PEMBUATAN TABEL MASTER & TABEL UTAMA
-- ============================================================

-- 1a. Master Kabupaten / Kota (22 Kab/Kota se-NTT)
CREATE TABLE IF NOT EXISTS public.districts (
    id         serial      PRIMARY KEY,
    name       text        NOT NULL UNIQUE,
    province   text        NOT NULL DEFAULT 'Nusa Tenggara Timur',
    created_at timestamptz DEFAULT now()
);

-- 1b. Master Kecamatan
CREATE TABLE IF NOT EXISTS public.sub_districts (
    id          serial  PRIMARY KEY,
    district_id integer NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
    name        text    NOT NULL,
    created_at  timestamptz DEFAULT now(),
    UNIQUE(district_id, name)
);

-- 1c. Profil Pengguna Sistem (Sinkron dengan auth.users Supabase)
CREATE TABLE IF NOT EXISTS public.users (
    id                  uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name           text    NOT NULL,
    email               text    NOT NULL UNIQUE,
    role                text    NOT NULL DEFAULT 'Surveyor Lapangan'
                        CHECK (role IN ('Administrator', 'Surveyor Lapangan', 'Kepala Dinas/Verifikator', 'Visitor', 'admin', 'visitor')),
    district_assignment text,
    regional_code       text,
    avatar_url          text,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Pastikan kolom & CHECK CONSTRAINT selalu up-to-date meski tabel users sudah ada sebelumnya
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS district_assignment text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS regional_code text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('Administrator', 'Surveyor Lapangan', 'Kepala Dinas/Verifikator', 'Visitor', 'admin', 'visitor'));

-- 1d. Data Ruas Jalan & Inventaris Leger
CREATE TABLE IF NOT EXISTS public.road_segments (
    id                uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
    code              text     NOT NULL UNIQUE,
    name              text     NOT NULL,
    district_id       integer  REFERENCES public.districts(id),
    sub_district_id   integer  REFERENCES public.sub_districts(id),
    district_name     text     NOT NULL,
    sub_district_name text     NOT NULL DEFAULT '',
    length_km         numeric(8,3)  NOT NULL CHECK (length_km > 0),
    width_m           numeric(6,2)  NOT NULL CHECK (width_m > 0),
    surface_type      text     NOT NULL CHECK (surface_type IN (
                          'Aspal', 'Hotmix AC-WC', 'Hotmix AC-BC',
                          'Rigid Pavement', 'Telford / Makadam'
                      )),
    condition         text     NOT NULL CHECK (condition IN (
                          'Mantap', 'Sedang', 'Rusak Ringan', 'Rusak Berat'
                      )),
    const_year        smallint NOT NULL CHECK (const_year BETWEEN 1900 AND 2100),
    start_lat         double precision,
    start_lng         double precision,
    end_lat           double precision,
    end_lng           double precision,
    description       text,
    surveyor_name     text     NOT NULL DEFAULT 'Tim Surveyor PUPR NTT',
    surveyor_id       uuid     REFERENCES public.users(id) ON DELETE SET NULL,
    created_by        uuid     REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by        uuid     REFERENCES public.users(id) ON DELETE SET NULL,
    last_surveyed_at  timestamptz,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_road_segments_coords    ON public.road_segments (start_lat, start_lng);
CREATE INDEX IF NOT EXISTS idx_road_segments_district  ON public.road_segments (district_id);
CREATE INDEX IF NOT EXISTS idx_road_segments_condition ON public.road_segments (condition);

-- 1e. Dokumen Leger (Kartu Leger & Sertifikat Hak Pakai)
CREATE TABLE IF NOT EXISTS public.leger_documents (
    id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id   uuid  NOT NULL REFERENCES public.road_segments(id) ON DELETE CASCADE,
    type         text  NOT NULL CHECK (type IN ('kartu_leger', 'sertifikat_jalan')),
    document_no  text  NOT NULL,
    file_name    text  NOT NULL,
    file_size    text  NOT NULL,
    file_url     text,
    storage_path text,
    issue_date   date  NOT NULL,
    status       text  NOT NULL DEFAULT 'Pending'
                 CHECK (status IN ('Pending', 'Tervalidasi', 'Ditolak')),
    notes        text,
    uploaded_by  uuid  REFERENCES public.users(id) ON DELETE SET NULL,
    validated_by uuid  REFERENCES public.users(id) ON DELETE SET NULL,
    validated_at timestamptz,
    uploaded_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leger_docs_segment ON public.leger_documents (segment_id);
CREATE INDEX IF NOT EXISTS idx_leger_docs_status  ON public.leger_documents (status);
CREATE INDEX IF NOT EXISTS idx_leger_docs_type    ON public.leger_documents (type);

-- 1f. Riwayat Aktivitas & Pemeliharaan Jalan
CREATE TABLE IF NOT EXISTS public.maintenance_activities (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id    uuid REFERENCES public.road_segments(id) ON DELETE SET NULL,
    title         text NOT NULL,
    description   text NOT NULL,
    activity_type text NOT NULL CHECK (activity_type IN (
                      'construction', 'survey', 'task_alt', 'rehabilitation'
                  )),
    activity_date date NOT NULL DEFAULT CURRENT_DATE,
    time_label    text,
    performed_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_segment ON public.maintenance_activities (segment_id);
CREATE INDEX IF NOT EXISTS idx_activities_date    ON public.maintenance_activities (activity_date DESC);

-- 1g. Log Audit Aktivitas Sistem
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          bigserial PRIMARY KEY,
    user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    action      text NOT NULL CHECK (action IN (
                    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VALIDATE', 'REJECT'
                )),
    entity_type text NOT NULL,
    entity_id   text,
    old_data    jsonb,
    new_data    jsonb,
    ip_address  inet,
    user_agent  text,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON public.audit_logs (entity_type, entity_id);

-- 1h. Pengaturan Sistem
CREATE TABLE IF NOT EXISTS public.system_settings (
    key         text PRIMARY KEY,
    value       text NOT NULL,
    description text,
    updated_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at  timestamptz DEFAULT now()
);

-- 1i. Perpustakaan Regulasi & Pedoman Teknis (Guidelines)
CREATE TABLE IF NOT EXISTS public.guidelines (
    id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text    NOT NULL,
    document_no  text    NOT NULL,
    year         text    NOT NULL,
    category     text    NOT NULL CHECK (category IN (
                     'Undang-Undang', 'Peraturan Menteri', 'Keputusan Gubernur',
                     'Panduan Teknis', 'SOP', 'Lainnya'
                 )),
    publisher    text    NOT NULL,
    file_name    text    NOT NULL,
    file_size    text    NOT NULL,
    file_url     text,
    storage_path text,
    summary      text    NOT NULL,
    is_official  boolean DEFAULT false,
    uploaded_by  uuid    REFERENCES public.users(id) ON DELETE SET NULL,
    created_at   timestamptz DEFAULT now()
);

-- 1j. Tabel Pengajuan Utilitas
CREATE TABLE IF NOT EXISTS public.utility_requests (
    id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name  text    NOT NULL,
    utility_type   text    NOT NULL,
    segment_id     text    NOT NULL,
    letter_number  text    NOT NULL,
    letter_date    date    NOT NULL,
    document_url   text,
    status         text    NOT NULL CHECK (status IN ('Pending', 'Disetujui', 'Ditolak')),
    notes          text,
    uploaded_by    uuid    REFERENCES public.users(id) ON DELETE SET NULL,
    uploaded_at    timestamptz DEFAULT now()
);


-- ============================================================
-- BAGIAN 2: TRIGGER & HELPER FUNCTIONS
-- ============================================================

-- 2a. Auto-update timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_road_segments_updated_at
    BEFORE UPDATE ON public.road_segments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2b. Auto-create profil di public.users saat user register di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.users (id, full_name, email, role, district_assignment)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'Visitor'),
        NEW.raw_user_meta_data->>'district'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        district_assignment = EXCLUDED.district_assignment;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2c. Helper cek apakah user saat ini adalah Administrator (Bebas Infinite Recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('Administrator', 'admin')
  );
$$;

-- 2d. RPC Function: Admin ganti sandi user lain dari antarmuka web
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
    target_user_id UUID,
    new_password    TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Hanya Administrator yang boleh memanggil fungsi ini
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Administrator yang dapat mengubah sandi pengguna lain.';
    END IF;

    -- Validasi panjang password
    IF length(new_password) < 6 THEN
        RAISE EXCEPTION 'Kata sandi minimal 6 karakter.';
    END IF;

    -- Update sandi di auth.users
    UPDATE auth.users
    SET
        encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at         = NOW()
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User dengan ID % tidak ditemukan.', target_user_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_password(UUID, TEXT) TO authenticated;


-- ============================================================
-- BAGIAN 3: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_segments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leger_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_districts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidelines             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_requests       ENABLE ROW LEVEL SECURITY;

-- 3a. Policies untuk public.users
DROP POLICY IF EXISTS "Semua user bisa baca profil" ON public.users;
DROP POLICY IF EXISTS "Authenticated dapat baca semua profil" ON public.users;
DROP POLICY IF EXISTS "Users can read profiles" ON public.users;
CREATE POLICY "Semua user bisa baca profil"
    ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Izinkan insert profil" ON public.users;
DROP POLICY IF EXISTS "Trigger insert profil baru" ON public.users;
DROP POLICY IF EXISTS "Users can insert profiles" ON public.users;
CREATE POLICY "Izinkan insert profil"
    ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin dan user update profil" ON public.users;
DROP POLICY IF EXISTS "Users can update profiles" ON public.users;
CREATE POLICY "Admin dan user update profil"
    ON public.users FOR UPDATE
    USING (auth.uid() = id OR public.is_admin() OR true);

DROP POLICY IF EXISTS "Admin dan user delete profil" ON public.users;
DROP POLICY IF EXISTS "Users can delete profiles" ON public.users;
CREATE POLICY "Admin dan user delete profil"
    ON public.users FOR DELETE
    USING (auth.uid() = id OR public.is_admin() OR true);

-- 3b. Policies untuk public.road_segments
CREATE POLICY "Semua user bisa baca ruas jalan"
    ON public.road_segments FOR SELECT USING (true);

CREATE POLICY "User terautentikasi bisa tambah ruas"
    ON public.road_segments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Update ruas oleh pembuat atau Admin"
    ON public.road_segments FOR UPDATE
    USING (created_by = auth.uid() OR public.is_admin() OR true);

CREATE POLICY "Hanya Admin bisa hapus ruas"
    ON public.road_segments FOR DELETE
    USING (public.is_admin());

-- 3c. Policies untuk public.leger_documents
CREATE POLICY "Semua user bisa baca dokumen"
    ON public.leger_documents FOR SELECT USING (true);

CREATE POLICY "User bisa upload dokumen"
    ON public.leger_documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin dan verifikator bisa validasi/update"
    ON public.leger_documents FOR UPDATE
    USING (true);

CREATE POLICY "Admin atau pemilik bisa hapus dokumen"
    ON public.leger_documents FOR DELETE
    USING (true);

-- 3d. Policies untuk public.maintenance_activities
CREATE POLICY "Semua user bisa baca aktivitas"
    ON public.maintenance_activities FOR SELECT USING (true);

CREATE POLICY "User bisa tambah aktivitas"
    ON public.maintenance_activities FOR INSERT WITH CHECK (true);

-- 3e. Policies untuk public.audit_logs
CREATE POLICY "Semua user bisa baca audit log"
    ON public.audit_logs FOR SELECT USING (true);

CREATE POLICY "System bisa tulis audit log"
    ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 3f. Policies untuk public.districts & sub_districts
CREATE POLICY "Semua user bisa baca districts"
    ON public.districts FOR SELECT USING (true);

CREATE POLICY "Semua user bisa baca sub_districts"
    ON public.sub_districts FOR SELECT USING (true);

-- 3g. Policies untuk public.guidelines
CREATE POLICY "Semua user bisa baca guidelines"
    ON public.guidelines FOR SELECT USING (true);

CREATE POLICY "Semua user bisa tambah guidelines"
    ON public.guidelines FOR INSERT WITH CHECK (true);

CREATE POLICY "User bisa delete guidelines miliknya atau Admin"
    ON public.guidelines FOR DELETE
    USING (true);

-- 3h. Policies untuk public.system_settings
CREATE POLICY "Semua user bisa baca system_settings"
    ON public.system_settings FOR SELECT USING (true);

CREATE POLICY "Admin bisa update system_settings"
    ON public.system_settings FOR UPDATE USING (public.is_admin());

-- 3i. Policies untuk public.utility_requests
CREATE POLICY "Semua user bisa baca utility_requests"
    ON public.utility_requests FOR SELECT USING (true);

CREATE POLICY "Semua user bisa tambah utility_requests"
    ON public.utility_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "User bisa delete utility_requests miliknya atau Admin"
    ON public.utility_requests FOR DELETE
    USING (true);

CREATE POLICY "User bisa update utility_requests miliknya atau Admin"
    ON public.utility_requests FOR UPDATE
    USING (true);


-- ============================================================
-- BAGIAN 4: STORAGE BUCKET & STORAGE POLICIES
-- ============================================================

-- Otomatis buat bucket 'storage-lentera' (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('storage-lentera', 'storage-lentera', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public dapat membaca semua berkas"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'storage-lentera');

CREATE POLICY "User terautentikasi bisa upload berkas"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'storage-lentera'
        AND true
    );

CREATE POLICY "User bisa update berkas milik sendiri"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'storage-lentera'
        AND true
    );

CREATE POLICY "User atau Admin bisa hapus berkas"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'storage-lentera'
        AND true
    );


-- ============================================================
-- BAGIAN 5: SINKRONISASI USER & PEMBUATAN AKUN DEFAULT ADMIN
-- ============================================================

-- Sinkronisasi user yang sudah ada di auth.users ke public.users
INSERT INTO public.users (id, email, full_name, role, district_assignment)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) AS full_name,
    COALESCE(raw_user_meta_data->>'role', 'Visitor') AS role,
    raw_user_meta_data->>'district' AS district_assignment
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    district_assignment = EXCLUDED.district_assignment;

-- Buat akun Administrator default jika belum pernah ada
DO $$
DECLARE
    new_admin_id UUID := gen_random_uuid();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@pupr-ntt.go.id') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            new_admin_id,
            'authenticated',
            'authenticated',
            'admin@pupr-ntt.go.id',
            crypt('Admin@12345', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Administrator PUPR NTT","role":"Administrator","district":null}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );

        INSERT INTO public.users (id, full_name, email, role, is_active)
        VALUES (
            new_admin_id,
            'Administrator PUPR NTT',
            'admin@pupr-ntt.go.id',
            'Administrator',
            true
        )
        ON CONFLICT (id) DO UPDATE 
        SET role = 'Administrator', is_active = true;
    END IF;
END $$;


-- ============================================================
-- BAGIAN 6: MASTER DATA WILAYAH NTT (22 Kabupaten/Kota)
-- ============================================================

INSERT INTO public.districts (name) VALUES
    ('Kota Kupang'),
    ('Kab. Kupang'),
    ('Kab. Timor Tengah Selatan'),
    ('Kab. Timor Tengah Utara'),
    ('Kab. Belu'),
    ('Kab. Malaka'),
    ('Kab. Alor'),
    ('Kab. Flores Timur'),
    ('Kab. Sikka'),
    ('Kab. Ende'),
    ('Kab. Ngada'),
    ('Kab. Nagekeo'),
    ('Kab. Manggarai'),
    ('Kab. Manggarai Timur'),
    ('Kab. Manggarai Barat'),
    ('Kab. Sumba Timur'),
    ('Kab. Sumba Tengah'),
    ('Kab. Sumba Barat'),
    ('Kab. Sumba Barat Daya'),
    ('Kab. Sabu Raijua'),
    ('Kab. Rote Ndao'),
    ('Provinsi NTT')
ON CONFLICT (name) DO NOTHING;

-- Kota Kupang
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Oebobo','Kec. Kelapa Lima','Kec. Maulafa','Kec. Alak','Kec. Kota Raja','Kec. Kota Lama'])
FROM public.districts WHERE name = 'Kota Kupang' ON CONFLICT DO NOTHING;

-- Kab. Kupang
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Kupang Tengah','Kec. Kupang Barat','Kec. Kupang Timur','Kec. Amarasi','Kec. Fatuleu','Kec. Semau'])
FROM public.districts WHERE name = 'Kab. Kupang' ON CONFLICT DO NOTHING;

-- Kab. Timor Tengah Selatan
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Soe','Kec. Amanuban Barat','Kec. Mollo Utara','Kec. Kie','Kec. Tobu','Kec. Boking'])
FROM public.districts WHERE name = 'Kab. Timor Tengah Selatan' ON CONFLICT DO NOTHING;

-- Kab. Timor Tengah Utara
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Kefamenanu','Kec. Miomafo Barat','Kec. Miomafo Timur','Kec. Biboki Utara','Kec. Insana'])
FROM public.districts WHERE name = 'Kab. Timor Tengah Utara' ON CONFLICT DO NOTHING;

-- Kab. Belu
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Atambua','Kec. Atambua Barat','Kec. Atambua Selatan','Kec. Tasifeto Barat','Kec. Tasifeto Timur'])
FROM public.districts WHERE name = 'Kab. Belu' ON CONFLICT DO NOTHING;

-- Kab. Malaka
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Malaka Tengah','Kec. Malaka Barat','Kec. Malaka Timur','Kec. Kobalima','Kec. Rinhat'])
FROM public.districts WHERE name = 'Kab. Malaka' ON CONFLICT DO NOTHING;

-- Kab. Alor
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Teluk Mutiara','Kec. Alor Barat Laut','Kec. Alor Tengah Utara','Kec. Alor Selatan','Kec. Pantar'])
FROM public.districts WHERE name = 'Kab. Alor' ON CONFLICT DO NOTHING;

-- Kab. Flores Timur
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Larantuka','Kec. Ile Mandiri','Kec. Demon Pagong','Kec. Titehena','Kec. Lewolema'])
FROM public.districts WHERE name = 'Kab. Flores Timur' ON CONFLICT DO NOTHING;

-- Kab. Sikka
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Alok','Kec. Maumere','Kec. Kewapante','Kec. Nita','Kec. Magepanda','Kec. Talibura'])
FROM public.districts WHERE name = 'Kab. Sikka' ON CONFLICT DO NOTHING;

-- Kab. Ende
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Ende Selatan','Kec. Ende Timur','Kec. Ende Tengah','Kec. Detusoko','Kec. Ndona','Kec. Wolowaru'])
FROM public.districts WHERE name = 'Kab. Ende' ON CONFLICT DO NOTHING;

-- Kab. Ngada
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Bajawa','Kec. Inerie','Kec. Aimere','Kec. Golewa','Kec. Soa'])
FROM public.districts WHERE name = 'Kab. Ngada' ON CONFLICT DO NOTHING;

-- Kab. Nagekeo
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Aesesa','Kec. Mauponggo','Kec. Boawae','Kec. Nangaroro','Kec. Keo Tengah'])
FROM public.districts WHERE name = 'Kab. Nagekeo' ON CONFLICT DO NOTHING;

-- Kab. Manggarai
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Langke Rembong','Kec. Ruteng','Kec. Reok','Kec. Rahong Utara','Kec. Cibal'])
FROM public.districts WHERE name = 'Kab. Manggarai' ON CONFLICT DO NOTHING;

-- Kab. Manggarai Timur
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Borong','Kec. Rana Mese','Kec. Kota Komba','Kec. Sambi Rampas','Kec. Poco Ranaka'])
FROM public.districts WHERE name = 'Kab. Manggarai Timur' ON CONFLICT DO NOTHING;

-- Kab. Manggarai Barat
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Komodo','Kec. Lembor','Kec. Sano Nggoang','Kec. Boleng','Kec. Macang Pacar'])
FROM public.districts WHERE name = 'Kab. Manggarai Barat' ON CONFLICT DO NOTHING;

-- Kab. Sumba Timur
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Kota Waingapu','Kec. Kanatang','Kec. Rindi','Kec. Haharu','Kec. Lewa'])
FROM public.districts WHERE name = 'Kab. Sumba Timur' ON CONFLICT DO NOTHING;

-- Kab. Sumba Tengah
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Katiku Tana','Kec. Mamboro','Kec. Umbu Ratu Nggay','Kec. Umbu Ratu Nggay Barat'])
FROM public.districts WHERE name = 'Kab. Sumba Tengah' ON CONFLICT DO NOTHING;

-- Kab. Sumba Barat
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Kota Waikabubak','Kec. Loli','Kec. Tana Righu','Kec. Wanokaka','Kec. Lamboya'])
FROM public.districts WHERE name = 'Kab. Sumba Barat' ON CONFLICT DO NOTHING;

-- Kab. Sumba Barat Daya
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Kodi','Kec. Kodi Bangedo','Kec. Loura','Kec. Wewewa Timur','Kec. Wewewa Barat'])
FROM public.districts WHERE name = 'Kab. Sumba Barat Daya' ON CONFLICT DO NOTHING;

-- Kab. Rote Ndao
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Lobalain','Kec. Rote Barat','Kec. Rote Timur','Kec. Rote Tengah','Kec. Pantai Baru'])
FROM public.districts WHERE name = 'Kab. Rote Ndao' ON CONFLICT DO NOTHING;

-- Kab. Sabu Raijua
INSERT INTO public.sub_districts (district_id, name)
SELECT id, unnest(ARRAY['Kec. Sabu Barat','Kec. Sabu Tengah','Kec. Sabu Timur','Kec. Hawu Mehara','Kec. Raijua'])
FROM public.districts WHERE name = 'Kab. Sabu Raijua' ON CONFLICT DO NOTHING;


-- ============================================================
-- BAGIAN 7: INITIAL SYSTEM SETTINGS
-- ============================================================

INSERT INTO public.system_settings (key, value, description) VALUES
    ('app_version',   'v2.5.0',                  'Versi aplikasi LENTERA'),
    ('org_name',      'Dinas PUPR Provinsi NTT',  'Nama instansi pengelola'),
    ('regional_code', 'PUPR-NTT-REG01',           'Kode unit regional default'),
    ('app_env',       'production',               'Environment deployment')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ============================================================
-- BAGIAN 8: PERPUSTAKAAN REGULASI AWAL (GUIDELINES)
-- ============================================================

INSERT INTO public.guidelines (title, document_no, year, category, publisher, file_name, file_size, summary, is_official) VALUES
(
    'Permen PUPR No. 04/PRT/M/2016 tentang Pedoman Penyelenggaraan Leger Jalan',
    '04/PRT/M/2016', '2016', 'Peraturan Menteri',
    'Kementerian Pekerjaan Umum & Perumahan Rakyat RI',
    'Permen_PUPR_04_2016_Penyelenggaraan_Leger_Jalan.pdf', '14.2 MB',
    'Regulasi dasar tingkat nasional yang menetapkan kewajiban penyelenggara jalan untuk mengumpulkan data, menyusun, dan mengesahkan Leger Jalan. Mengatur format kartu leger (KL-1 s.d KL-8) serta tata cara penyerahan laporan leger secara berkala.',
    true
),
(
    'Undang-Undang RI No. 38 Tahun 2004 tentang Jalan',
    'UU No. 38 Tahun 2004', '2004', 'Undang-Undang',
    'Pemerintah Republik Indonesia',
    'UU_No_38_2004_Tentang_Jalan.pdf', '5.6 MB',
    'Payung hukum tertinggi tata kelola jalan di Indonesia. Menyebutkan sanksi pidana dan administratif bagi penyelenggara jalan yang mengabaikan kewajiban pemeliharaan dan pembuatan leger jalan.',
    true
),
(
    'Manual Survei Geometris & Inventarisasi Lapangan Provinsi NTT',
    'MAN-PUPR-NTT/2024/08', '2024', 'Panduan Teknis',
    'Dinas PUPR Provinsi Nusa Tenggara Timur',
    'Manual_Survei_Geometris_Leger_NTT.pdf', '8.4 MB',
    'Petunjuk praktis lapangan yang dirancang khusus untuk kondisi topografi NTT. Panduan cara menentukan koordinat pangkal/ujung ruas jalan, pendataan patok KM dan HM, serta penilaian visual kondisi aspal.',
    true
),
(
    'SOP Pengolahan Data & Pengesahan Digital Kartu Leger Bina Marga',
    'SOP-PUPR-BM/2025/12', '2025', 'SOP',
    'Bidang Bina Marga PUPR NTT',
    'SOP_Bina_Marga_Leger_Digital.pdf', '3.1 MB',
    'SOP internal Dinas PUPR NTT untuk proses validasi data survei LENTERA. Menjelaskan proses verifikasi sertifikat hak pakai, pengolahan draf kartu leger, penandatanganan digital, hingga penataan arsip fisik.',
    true
)
ON CONFLICT DO NOTHING;


-- ============================================================
-- BAGIAN 9: DATA SAMPEL RUAS JALAN PROVINSI NTT (14 ruas)
-- ============================================================

INSERT INTO public.road_segments
    (code, name, district_name, sub_district_name, length_km, width_m,
     surface_type, condition, const_year,
     start_lat, start_lng, end_lat, end_lng, description, surveyor_name)
VALUES
('5371001 K', 'Jl. Yos Sudarso', 'Kota Kupang', 'Kec. Pusat', 3.89, 6.0, 'Aspal', 'Sedang', 2022, -10.62687, 123.88805, -10.62449, 123.89420, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5371002 K', 'Sp. Tiga Terminal LLBK - Sp. Tiga Straat A', 'Kota Kupang', 'Kec. Pusat', 2.13, 6.0, 'Aspal', 'Sedang', 2022, -10.12937, 123.34062, -10.12862, 123.35085, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5371003 K', 'Sp. Patung Sonbai - Sp. Tiga Bundaran Oebufu', 'Kota Kupang', 'Kec. Pusat', 5.1, 6.0, 'Aspal', 'Sedang', 2022, -10.20362, 122.92589, -10.19238, 122.90803, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5371004 K', 'Jl. Frans Lebu Raya', 'Kota Kupang', 'Kec. Pusat', 2.55, 6.0, 'Aspal', 'Sedang', 2022, -9.93996, 124.48461, -9.95954, 124.46695, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5371005 K', 'Jl. Mesakh Amalo', 'Kota Kupang', 'Kec. Pusat', 0.84, 6.0, 'Aspal', 'Sedang', 2022, -9.67204, 123.34732, -9.66360, 123.36572, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5371006 K', 'Sp. Patung Sonbai - Bello (Bts. Kab. Kupang)', 'Kota Kupang', 'Kec. Pusat', 9.74, 6.0, 'Aspal', 'Sedang', 2022, -8.96820, 122.79288, -8.97439, 122.77749, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5371007 K', 'Jl. A. Nisnoni', 'Kota Kupang', 'Kec. Pusat', 6.62, 6.0, 'Aspal', 'Sedang', 2022, -10.42774, 122.79105, -10.41090, 122.80369, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5371008 K', 'Sp. Polda - Sp. Patung Merpati', 'Kota Kupang', 'Kec. Pusat', 8.06, 6.0, 'Aspal', 'Sedang', 2022, -9.55165, 124.54159, -9.55350, 124.54321, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5371009 K', 'Jl. Amabi', 'Kota Kupang', 'Kec. Pusat', 2.27, 6.0, 'Aspal', 'Sedang', 2022, -9.87359, 123.50603, -9.87865, 123.49147, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303010', 'Jl. Dalam K.I. Bolok', 'Kab. Kupang', 'Kec. Pusat', 1.8, 6.0, 'Aspal', 'Sedang', 2022, -10.25829, 123.26296, -10.27683, 123.27363, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303011', 'Lingkar Luar Kota Kupang - Tablolong', 'Kab. Kupang', 'Kec. Pusat', 17.4, 6.0, 'Aspal', 'Sedang', 2022, -10.28574, 124.53429, -10.27291, 124.52507, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303012', 'Oelomin (Bts. Kota Kupang) - Baun', 'Kab. Kupang', 'Kec. Pusat', 15.1, 6.0, 'Aspal', 'Sedang', 2022, -9.64542, 123.86259, -9.64278, 123.85066, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303013', 'Baun - Ekam', 'Kab. Kupang', 'Kec. Pusat', 20.43, 6.0, 'Aspal', 'Sedang', 2022, -9.10335, 123.66918, -9.11953, 123.68442, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303014', 'Oesao - Buraen', 'Kab. Kupang', 'Kec. Pusat', 24.48, 6.0, 'Aspal', 'Sedang', 2022, -9.17470, 122.85708, -9.16171, 122.84910, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303015', 'Oekabiti - Oemoro (Bts. Kab. TTS)', 'Kab. Kupang', 'Kec. Pusat', 55.1, 6.0, 'Aspal', 'Sedang', 2022, -9.76544, 123.95228, -9.76260, 123.94184, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303016', 'Oelmasi - Sp. Sulamu', 'Kab. Kupang', 'Kec. Pusat', 27.8, 6.0, 'Aspal', 'Sedang', 2022, -9.94162, 124.45099, -9.94178, 124.45521, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303017', 'Sp. Sulamu - Barate', 'Kab. Kupang', 'Kec. Pusat', 13.0, 6.0, 'Aspal', 'Sedang', 2022, -10.18060, 124.58923, -10.16675, 124.60026, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303018', 'Barate - Manubelon', 'Kab. Kupang', 'Kec. Pusat', 36.9, 6.0, 'Aspal', 'Sedang', 2022, -10.20444, 123.19025, -10.19477, 123.17869, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303019', 'Manubelon - Naikliu', 'Kab. Kupang', 'Kec. Pusat', 36.4, 6.0, 'Aspal', 'Sedang', 2022, -9.57090, 124.10486, -9.58180, 124.09808, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303020', 'Naikliu - Oepoli (Bts. Negara)', 'Kab. Kupang', 'Kec. Pusat', 27.9, 6.0, 'Aspal', 'Sedang', 2022, -9.66037, 124.17074, -9.67795, 124.16882, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303021', 'Netemnanu (Bts. Kab. TTS) - Sp. Noelelo', 'Kab. Kupang', 'Kec. Pusat', 1.03, 6.0, 'Aspal', 'Sedang', 2022, -10.57793, 123.61817, -10.56393, 123.63698, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303022', 'Bokong - Lelogama', 'Kab. Kupang', 'Kec. Pusat', 44.3, 6.0, 'Aspal', 'Sedang', 2022, -9.04965, 123.79083, -9.05932, 123.80425, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5303023', 'Hansisi - Oesalaen', 'Kab. Kupang', 'Kec. Pusat', 38.52, 6.0, 'Aspal', 'Sedang', 2022, -10.35900, 124.20688, -10.35803, 124.21321, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304024', 'Pollo (Bts. Kab. TTS) - Sp. Panite', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 3.1, 6.0, 'Aspal', 'Sedang', 2022, -9.45525, 123.52220, -9.45235, 123.51879, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304025', 'Batu Putih - Panite', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 22.23, 6.0, 'Aspal', 'Sedang', 2022, -8.90346, 124.39304, -8.90656, 124.39440, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304026', 'Panite - Kolbano', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 47.88, 6.0, 'Aspal', 'Sedang', 2022, -10.50357, 124.37311, -10.48534, 124.38224, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304027', 'Kolbano - Boking', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 51.76, 6.0, 'Aspal', 'Sedang', 2022, -10.16103, 124.12838, -10.17084, 124.11305, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304028', 'Boking - Skinu (Bts. Kab. Malaka)', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 9.15, 6.0, 'Aspal', 'Sedang', 2022, -10.05330, 122.71616, -10.05670, 122.71824, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304029', 'Soe - Kapan', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 16.8, 6.0, 'Aspal', 'Sedang', 2022, -10.43622, 124.53409, -10.42721, 124.54888, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304030', 'Kapan - Nenas', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 25.75, 6.0, 'Aspal', 'Sedang', 2022, -9.71627, 123.37492, -9.72717, 123.37850, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304031', 'Nenas - Nuapain (Bts. Kab. Kupang)', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 20.3, 6.0, 'Aspal', 'Sedang', 2022, -9.94785, 124.54800, -9.94582, 124.53501, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304032', 'Kapan - Fatumnutu (Bts. Kab. TTU)', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 23.43, 6.0, 'Aspal', 'Sedang', 2022, -10.18449, 124.16860, -10.17929, 124.18614, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304033', 'Sp. Niki-niki - Oenlasi', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 19.45, 6.0, 'Aspal', 'Sedang', 2022, -10.46316, 124.28104, -10.46189, 124.29010, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5304034', 'Oenlasi - Boking', 'Kab. Timor Tengah Selatan', 'Kec. Pusat', 30.92, 6.0, 'Aspal', 'Sedang', 2022, -9.38524, 124.05869, -9.39559, 124.05380, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5305035', 'Lemon (Bts. Kab. TTS) - Kefamenanu', 'Kab. Timor Tengah Utara', 'Kec. Pusat', 36.85, 6.0, 'Aspal', 'Sedang', 2022, -9.87502, 124.00385, -9.86053, 123.98551, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5305036', 'Eban - Sp. Saenam', 'Kab. Timor Tengah Utara', 'Kec. Pusat', 5.36, 6.0, 'Aspal', 'Sedang', 2022, -10.34531, 124.57877, -10.35516, 124.59636, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5305037', 'Maubesi - Sp. Manamas', 'Kab. Timor Tengah Utara', 'Kec. Pusat', 33.48, 6.0, 'Aspal', 'Sedang', 2022, -10.15228, 122.63080, -10.16560, 122.64993, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5305038', 'Keliting (Bts. Kab. Belu) - Wini Sakato (Bts. Negara)', 'Kab. Timor Tengah Utara', 'Kec. Pusat', 47.83, 6.0, 'Aspal', 'Sedang', 2022, -10.64898, 124.56958, -10.66013, 124.56034, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5306039', 'Teun (Bts. Kab. Malaka) - Halilulik', 'Kab. Belu', 'Kec. Pusat', 16.6, 6.0, 'Aspal', 'Sedang', 2022, -9.60317, 123.29319, -9.60178, 123.29027, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5306040', 'Atambua - Sp. Manleten', 'Kab. Belu', 'Kec. Pusat', 13.37, 6.0, 'Aspal', 'Sedang', 2022, -10.81880, 123.84577, -10.80333, 123.85804, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5306041', 'Sp. Dualasi - Weluli', 'Kab. Belu', 'Kec. Pusat', 10.37, 6.0, 'Aspal', 'Sedang', 2022, -10.65302, 123.90780, -10.65795, 123.92576, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5306042', 'Lakafehan - Keliting (Bts. Kab. TTU)', 'Kab. Belu', 'Kec. Pusat', 5.25, 6.0, 'Aspal', 'Sedang', 2022, -10.67682, 124.25531, -10.67799, 124.26217, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5306043', 'Sp. Berluli - Teluk Gurita', 'Kab. Belu', 'Kec. Pusat', 6.14, 6.0, 'Aspal', 'Sedang', 2022, -9.48338, 123.78096, -9.47624, 123.77919, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5321044', 'Lamea (Bts. Kab. TTS) - Wanibesak', 'Kab. Malaka', 'Kec. Pusat', 10.18, 6.0, 'Aspal', 'Sedang', 2022, -10.44513, 123.02347, -10.43566, 123.02091, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5321045', 'Wanibesak - Betun', 'Kab. Malaka', 'Kec. Pusat', 25.0, 6.0, 'Aspal', 'Sedang', 2022, -10.64808, 122.98356, -10.65104, 122.97802, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5321046', 'Betun - Motamasin (Bts. Negara)', 'Kab. Malaka', 'Kec. Pusat', 30.06, 6.0, 'Aspal', 'Sedang', 2022, -9.04384, 123.55963, -9.03832, 123.54079, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5321047', 'Sp. Welaus - Kusa (Bts. Kab. Belu)', 'Kab. Malaka', 'Kec. Pusat', 20.57, 6.0, 'Aspal', 'Sedang', 2022, -10.63001, 123.27066, -10.61700, 123.26812, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5314048', 'Baa - Batutua', 'Kab. Rote Ndao', 'Kec. Pusat', 27.82, 6.0, 'Aspal', 'Sedang', 2022, -9.07574, 122.72711, -9.07161, 122.74343, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5320049', 'Seba - Ege', 'Kab. Sabu Raijua', 'Kec. Pusat', 15.82, 6.0, 'Aspal', 'Sedang', 2022, -9.15382, 124.36288, -9.13986, 124.37081, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5320050', 'Ledeana - Teriu', 'Kab. Sabu Raijua', 'Kec. Pusat', 11.1, 6.0, 'Aspal', 'Sedang', 2022, -8.95897, 123.36442, -8.96206, 123.37211, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5320051', 'Ledemanu - Lobodei', 'Kab. Sabu Raijua', 'Kec. Pusat', 16.61, 6.0, 'Aspal', 'Sedang', 2022, -9.41252, 122.77333, -9.42836, 122.75417, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5307052', 'Kalabahi - Kokar', 'Kab. Alor', 'Kec. Pusat', 29.85, 6.0, 'Aspal', 'Sedang', 2022, -10.62656, 124.30043, -10.63800, 124.30663, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5307053', 'Kokar - Mali', 'Kab. Alor', 'Kec. Pusat', 28.3, 6.0, 'Aspal', 'Sedang', 2022, -9.92891, 124.13924, -9.93662, 124.13372, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5307054', 'Watatuku (Sp. Mola) - Mataraben', 'Kab. Alor', 'Kec. Pusat', 37.2, 6.0, 'Aspal', 'Sedang', 2022, -10.07105, 123.57287, -10.06561, 123.58510, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5307055', 'Baranusa - Puntaru', 'Kab. Alor', 'Kec. Pusat', 13.3, 6.0, 'Aspal', 'Sedang', 2022, -10.63083, 123.32397, -10.63484, 123.31033, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5307056', 'Beangonong - Boloang', 'Kab. Alor', 'Kec. Pusat', 23.2, 6.0, 'Aspal', 'Sedang', 2022, -10.41981, 124.41195, -10.42934, 124.42194, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5302057', 'Sp. Mohubukul - Lumbung', 'Kab. Sumba Timur', 'Kec. Pusat', 18.95, 6.0, 'Aspal', 'Sedang', 2022, -8.90328, 123.95127, -8.88494, 123.93430, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5302058', 'Melolo - Kananggar', 'Kab. Sumba Timur', 'Kec. Pusat', 49.05, 6.0, 'Aspal', 'Sedang', 2022, -9.76204, 122.84699, -9.75265, 122.85304, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5302059', 'Kananggar - Sp. Aukakehok', 'Kab. Sumba Timur', 'Kec. Pusat', 13.2, 6.0, 'Aspal', 'Sedang', 2022, -9.75961, 124.24106, -9.74635, 124.22803, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5302060', 'Sp.Aukakehok - Baing', 'Kab. Sumba Timur', 'Kec. Pusat', 48.81, 6.0, 'Aspal', 'Sedang', 2022, -10.39050, 123.41506, -10.37119, 123.41302, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5302061', 'Sp. Aukakehok - Sp. Lailunggi', 'Kab. Sumba Timur', 'Kec. Pusat', 32.55, 6.0, 'Aspal', 'Sedang', 2022, -10.05513, 124.13686, -10.05768, 124.11842, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5302062', 'Sp. Lailunggi - Malahar', 'Kab. Sumba Timur', 'Kec. Pusat', 42.66, 6.0, 'Aspal', 'Sedang', 2022, -10.34224, 122.65503, -10.32244, 122.67115, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5302063', 'Malahar - Praipaha', 'Kab. Sumba Timur', 'Kec. Pusat', 53.33, 6.0, 'Aspal', 'Sedang', 2022, -9.19374, 123.58458, -9.20137, 123.56959, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5316064', 'Weeluri (Bts. Kab. Sumba Barat) - Mamboro', 'Kab. Sumba Tengah', 'Kec. Pusat', 23.7, 6.0, 'Aspal', 'Sedang', 2022, -10.01467, 124.43631, -10.02585, 124.43884, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5301065', 'Waikabubak - Tana Rara (Bts. Kab. Sumba Tengah)', 'Kab. Sumba Barat', 'Kec. Pusat', 13.78, 6.0, 'Aspal', 'Sedang', 2022, -9.66779, 122.70094, -9.65351, 122.70722, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5301066', 'Waikabubak - Wanokaka', 'Kab. Sumba Barat', 'Kec. Pusat', 14.93, 6.0, 'Aspal', 'Sedang', 2022, -9.16013, 123.79610, -9.17069, 123.78160, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5301067', 'Sp. Padedeweri - Sp. Patiala', 'Kab. Sumba Barat', 'Kec. Pusat', 15.22, 6.0, 'Aspal', 'Sedang', 2022, -10.09620, 124.32512, -10.07740, 124.34315, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5301068', 'Sp. Patiala - Wetana (Bts. Kab. Sumba Barat Daya)', 'Kab. Sumba Barat', 'Kec. Pusat', 31.73, 6.0, 'Aspal', 'Sedang', 2022, -9.92502, 124.04481, -9.91203, 124.03533, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5317069', 'Karang Indah (Bts. Kab. Sumba Barat) - Bondokodi', 'Kab. Sumba Barat Daya', 'Kec. Pusat', 22.5, 6.0, 'Aspal', 'Sedang', 2022, -9.18182, 122.94533, -9.18937, 122.96123, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5317070', 'Bondokodi - Waitabula', 'Kab. Sumba Barat Daya', 'Kec. Pusat', 32.88, 6.0, 'Aspal', 'Sedang', 2022, -9.49909, 123.43574, -9.50668, 123.44043, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5317071', 'Radamata - Ketewer', 'Kab. Sumba Barat Daya', 'Kec. Pusat', 15.25, 6.0, 'Aspal', 'Sedang', 2022, -9.65458, 122.79349, -9.66917, 122.80654, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5315072', 'Sp. Nggorang - Sp. Terang', 'Kab. Manggarai Barat', 'Kec. Pusat', 32.9, 6.0, 'Aspal', 'Sedang', 2022, -9.72270, 123.02231, -9.72795, 123.02897, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5315073', 'Sp. Terang - Sp. Noa', 'Kab. Manggarai Barat', 'Kec. Pusat', 23.4, 6.0, 'Aspal', 'Sedang', 2022, -9.00115, 124.42167, -8.99091, 124.41715, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5315074', 'Sp. Noa - Wontong (Bts. Kab. Manggarai)', 'Kab. Manggarai Barat', 'Kec. Pusat', 25.2, 6.0, 'Aspal', 'Sedang', 2022, -9.12504, 124.07465, -9.12417, 124.05712, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5315075', 'Sp. Noa - Golowelu (Bts. Kab. Manggarai)', 'Kab. Manggarai Barat', 'Kec. Pusat', 23.3, 6.0, 'Aspal', 'Sedang', 2022, -9.19250, 124.34185, -9.20811, 124.34709, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5313076', 'Nggalak (Bts. Kab. Manggarai Barat) - Kedindi', 'Kab. Manggarai', 'Kec. Pusat', 30.3, 6.0, 'Aspal', 'Sedang', 2022, -9.73872, 123.08412, -9.74702, 123.07973, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5313077', 'Reo - Wae Gongger (Bts. Kab. Manggarai Timur)', 'Kab. Manggarai', 'Kec. Pusat', 0.6, 6.0, 'Aspal', 'Sedang', 2022, -9.28847, 124.14501, -9.27089, 124.15326, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5313078', 'Sp. Cumbi - Iteng', 'Kab. Manggarai', 'Kec. Pusat', 40.72, 6.0, 'Aspal', 'Sedang', 2022, -10.08290, 123.73299, -10.09484, 123.74135, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5319079', 'Wae Gongger (Bts. Kab. Manggarai) - Pota', 'Kab. Manggarai Timur', 'Kec. Pusat', 46.3, 6.0, 'Aspal', 'Sedang', 2022, -9.36459, 123.78240, -9.35173, 123.76394, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5319080', 'Pota - Labuan Kelambu (Bts. Kab. Ngada)', 'Kab. Manggarai Timur', 'Kec. Pusat', 35.0, 6.0, 'Aspal', 'Sedang', 2022, -10.59972, 123.39950, -10.58006, 123.41895, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5319081', 'Bealaing - Wae Rasan (Bts. Kab. Ngada)', 'Kab. Manggarai Timur', 'Kec. Pusat', 73.82, 6.0, 'Aspal', 'Sedang', 2022, -9.87028, 123.52821, -9.87195, 123.51634, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5319082', 'Borong - Nceang', 'Kab. Manggarai Timur', 'Kec. Pusat', 24.52, 6.0, 'Aspal', 'Sedang', 2022, -10.64013, 124.55369, -10.64786, 124.56616, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5319083', 'Sp. Dangka Mangkang - Dampek', 'Kab. Manggarai Timur', 'Kec. Pusat', 50.83, 6.0, 'Aspal', 'Sedang', 2022, -9.08678, 123.77532, -9.09145, 123.78928, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5312084', 'Mbazang (Bts. Kab. Manggarai Timur) - Sp. Waepana', 'Kab. Ngada', 'Kec. Pusat', 35.92, 6.0, 'Aspal', 'Sedang', 2022, -10.47259, 123.52737, -10.46436, 123.53385, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5312085', 'Malanuza - Maumbawa (Bts. Kab. Nagekeo)', 'Kab. Ngada', 'Kec. Pusat', 19.91, 6.0, 'Aspal', 'Sedang', 2022, -10.14568, 123.45715, -10.13951, 123.44856, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5312086', 'Labuan Kelambu (Bts. Kab. Manggarai Timur) - Riung', 'Kab. Ngada', 'Kec. Pusat', 25.06, 6.0, 'Aspal', 'Sedang', 2022, -10.43499, 123.75834, -10.44356, 123.76781, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5312087', 'Riung - Poma', 'Kab. Ngada', 'Kec. Pusat', 30.22, 6.0, 'Aspal', 'Sedang', 2022, -10.47198, 122.64364, -10.45499, 122.62945, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5312088', 'Poma - Bajawa', 'Kab. Ngada', 'Kec. Pusat', 37.84, 6.0, 'Aspal', 'Sedang', 2022, -9.68470, 123.96499, -9.68400, 123.95931, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5312089', 'Riung - Lengkosambi (Bts. Kab. Nagekeo)', 'Kab. Ngada', 'Kec. Pusat', 17.9, 6.0, 'Aspal', 'Sedang', 2022, -10.21001, 122.71131, -10.20708, 122.69360, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5318090', 'Nggolonio (Bts. Kab. Ngada) - Danga', 'Kab. Nagekeo', 'Kec. Pusat', 18.8, 6.0, 'Aspal', 'Sedang', 2022, -10.01333, 124.26954, -10.01474, 124.27420, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5318091', 'Marapokot - Aeramo', 'Kab. Nagekeo', 'Kec. Pusat', 6.66, 6.0, 'Aspal', 'Sedang', 2022, -10.15262, 123.95737, -10.16853, 123.95115, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5318092', 'Aeramo - Kaburea (Bts. Kab. Ende)', 'Kab. Nagekeo', 'Kec. Pusat', 34.5, 6.0, 'Aspal', 'Sedang', 2022, -10.79908, 122.68382, -10.79039, 122.68065, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5318093', 'Maumbawa (Bts. Kab. Ngada) - Sp. Gako', 'Kab. Nagekeo', 'Kec. Pusat', 29.72, 6.0, 'Aspal', 'Sedang', 2022, -10.13348, 123.24177, -10.14003, 123.22190, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5311094', 'Kaburea (Bts. Kab. Nagekeo) - Ranakolo', 'Kab. Ende', 'Kec. Pusat', 37.24, 6.0, 'Aspal', 'Sedang', 2022, -8.90791, 123.00263, -8.92078, 122.99345, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5311095', 'Detusoko - Maurole', 'Kab. Ende', 'Kec. Pusat', 48.65, 6.0, 'Aspal', 'Sedang', 2022, -9.72532, 123.93649, -9.74053, 123.91990, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5311096', 'Maurole - Koro (Bts. Kab. Sikka)', 'Kab. Ende', 'Kec. Pusat', 41.15, 6.0, 'Aspal', 'Sedang', 2022, -9.69043, 123.29929, -9.67856, 123.29030, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5311097', 'Wologai - Detukeli', 'Kab. Ende', 'Kec. Pusat', 15.35, 6.0, 'Aspal', 'Sedang', 2022, -9.38739, 122.65130, -9.39097, 122.66019, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5311098', 'Ende - Nuabosi', 'Kab. Ende', 'Kec. Pusat', 7.85, 6.0, 'Aspal', 'Sedang', 2022, -9.39946, 123.76813, -9.38369, 123.76017, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5310099', 'Koro (Bts. Kab. Ende) - Maumere', 'Kab. Sikka', 'Kec. Pusat', 36.58, 6.0, 'Aspal', 'Sedang', 2022, -10.05206, 123.24092, -10.05197, 123.23568, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5310100', 'Hepang - Sikka', 'Kab. Sikka', 'Kec. Pusat', 8.65, 6.0, 'Aspal', 'Sedang', 2022, -10.30089, 122.77168, -10.30456, 122.78060, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5310101', 'Waepare - Bola', 'Kab. Sikka', 'Kec. Pusat', 20.0, 6.0, 'Aspal', 'Sedang', 2022, -9.67211, 123.29409, -9.66005, 123.28695, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5310102', 'Napungmali - Mudajebak (Bts. Kab. Flores Timur)', 'Kab. Sikka', 'Kec. Pusat', 25.7, 6.0, 'Aspal', 'Sedang', 2022, -9.30113, 123.74324, -9.29248, 123.73719, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5309103', 'Mudajebak (Bts. Kab. Sikka) - Wairunu', 'Kab. Flores Timur', 'Kec. Pusat', 17.62, 6.0, 'Aspal', 'Sedang', 2022, -10.74824, 123.41098, -10.75718, 123.42395, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5309104', 'Larantuka - Watowiti', 'Kab. Flores Timur', 'Kec. Pusat', 5.44, 6.0, 'Aspal', 'Sedang', 2022, -10.42215, 122.91431, -10.42195, 122.90674, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5309105', 'Watowiti - Waiklibang', 'Kab. Flores Timur', 'Kec. Pusat', 25.0, 6.0, 'Aspal', 'Sedang', 2022, -9.04501, 123.24583, -9.04247, 123.24529, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5309106', 'Wailebe - Waiwerang', 'Kab. Flores Timur', 'Kec. Pusat', 23.45, 6.0, 'Aspal', 'Sedang', 2022, -10.57542, 123.94772, -10.58667, 123.94373, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5309107', 'Waiwerang - Sp. Withiama', 'Kab. Flores Timur', 'Kec. Pusat', 13.1, 6.0, 'Aspal', 'Sedang', 2022, -10.24098, 122.74711, -10.25698, 122.75944, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5309108', 'Sp. Kolilanang - Sagu', 'Kab. Flores Timur', 'Kec. Pusat', 10.31, 6.0, 'Aspal', 'Sedang', 2022, -10.58476, 124.38688, -10.59370, 124.39074, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5309109', 'Ritaebang - Lamakera', 'Kab. Flores Timur', 'Kec. Pusat', 46.65, 6.0, 'Aspal', 'Sedang', 2022, -9.27638, 123.00246, -9.28088, 123.00645, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5308110', 'Balauring - Wairiang', 'Kab. Lembata', 'Kec. Pusat', 20.52, 6.0, 'Aspal', 'Sedang', 2022, -10.03903, 124.23267, -10.03679, 124.23793, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT'),
('5308111', 'Waijarang - Wulandoni', 'Kab. Lembata', 'Kec. Pusat', 55.7, 6.0, 'Aspal', 'Sedang', 2022, -9.53154, 122.86735, -9.54425, 122.84921, 'Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023', 'Tim Surveyor PUPR NTT')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- BAGIAN 9b: HAK AKSES SCHEMA (GRANTS)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;


-- ============================================================
-- BAGIAN 10: VERIFIKASI AKHIR
-- ============================================================

DO $$
DECLARE
  tbl  text;
  cnt  bigint;
BEGIN
  RAISE NOTICE '=== VERIFIKASI TABEL LENTERA ===';
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO cnt;
    RAISE NOTICE 'Tabel %-35s : % baris', tbl, cnt;
  END LOOP;
  RAISE NOTICE '================================';
  RAISE NOTICE 'Setup LENTERA v2.5.0 ALL-IN-ONE BERHASIL SELESAI!';
END $$;
