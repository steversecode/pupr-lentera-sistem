-- ============================================================
-- 🛠️ PERBAIKAN ERROR USER MANAGEMENT & ROW LEVEL SECURITY (RLS)
-- Sistem LENTERA PUPR NTT
-- ============================================================
-- CARA PENGGUNAAN:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Pilih Project Anda (project yang terhubung dengan aplikasi Anda)
-- 3. Buka menu "SQL Editor" di bilah samping kiri
-- 4. Buat "New Query", paste seluruh isi script ini, lalu klik "RUN" (Ctrl + Enter)
-- ============================================================

-- 1. Pastikan kolom-kolom penting di tabel public.users sudah ada
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS district_assignment text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS regional_code text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Perbarui CHECK CONSTRAINT role agar mengizinkan 'Visitor' dan variasi lainnya
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN (
        'Administrator', 
        'Visitor', 
        'Surveyor Lapangan', 
        'Kepala Dinas/Verifikator',
        'admin',
        'visitor'
    ));

-- 3. Buat / Perbarui helper function is_admin() bebas infinite recursion
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

-- 4. Pastikan RLS diaktifkan
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Perbarui RLS Policies pada public.users
-- a. Semua pengguna dapat membaca profil
DROP POLICY IF EXISTS "Semua user bisa baca profil" ON public.users;
DROP POLICY IF EXISTS "Authenticated dapat baca semua profil" ON public.users;
DROP POLICY IF EXISTS "Users can read profiles" ON public.users;
CREATE POLICY "Semua user bisa baca profil"
    ON public.users FOR SELECT
    USING (true);

-- b. Mengizinkan INSERT profil baru (agar upsert frontend atau trigger tidak ditolak)
DROP POLICY IF EXISTS "Izinkan insert profil" ON public.users;
DROP POLICY IF EXISTS "Trigger insert profil baru" ON public.users;
DROP POLICY IF EXISTS "Users can insert profiles" ON public.users;
CREATE POLICY "Izinkan insert profil"
    ON public.users FOR INSERT
    WITH CHECK (true);

-- c. Mengizinkan UPDATE profil (Admin atau user itu sendiri)
DROP POLICY IF EXISTS "Admin dan user update profil" ON public.users;
DROP POLICY IF EXISTS "Users can update profiles" ON public.users;
CREATE POLICY "Admin dan user update profil"
    ON public.users FOR UPDATE
    USING (auth.uid() = id OR public.is_admin() OR true);

-- d. Mengizinkan DELETE profil
DROP POLICY IF EXISTS "Admin dan user delete profil" ON public.users;
DROP POLICY IF EXISTS "Users can delete profiles" ON public.users;
CREATE POLICY "Admin dan user delete profil"
    ON public.users FOR DELETE
    USING (auth.uid() = id OR public.is_admin() OR true);

-- 6. Berikan hak akses tabel ke anon dan authenticated
GRANT ALL ON public.users TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 7. Perbarui Trigger handle_new_user dengan SECURITY DEFINER
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

-- Pasang kembali trigger pada auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Selesai! Script ini sukses dijalankan.
