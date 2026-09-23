import json
import random
import re

with open('extracted_roads.json', 'r') as f:
    roads = json.load(f)

# Base coordinates for NTT roughly
base_lat = -9.9
base_lng = 123.6

ts_entries = []
sql_entries = []

for i, r in enumerate(roads):
    code = r['code']
    name = r['name']
    district = r['district']
    length = r['length']
    
    # Generic dummy data
    width = 6.0
    year = 2022
    surface_ts = "SurfaceType.ASPHALT"
    surface_sql = "Aspal"
    condition_ts = "RoadCondition.SEDANG"
    condition_sql = "Sedang"
    surveyor = "Tim Surveyor PUPR NTT"
    desc = "Berdasarkan SK Gubernur NTT No 403/KEP/HK/2023"
    kecamatan = "Kec. Pusat"
    
    # Slight coordinate variance so they don't perfectly stack
    s_lat = base_lat + random.uniform(-1, 1)
    s_lng = base_lng + random.uniform(-1, 1)
    e_lat = s_lat + random.uniform(-0.02, 0.02)
    e_lng = s_lng + random.uniform(-0.02, 0.02)
    
    # TS
    ts_entry = f"""  {{
    id: "seg-{i+100}",
    code: "{code}",
    name: "{name}",
    district: "{district}",
    kecamatan: "{kecamatan}",
    lengthKm: {length},
    widthM: {width},
    surfaceType: {surface_ts},
    condition: {condition_ts},
    constYear: {year},
    startLat: {s_lat:.5f},
    startLng: {s_lng:.5f},
    endLat: {e_lat:.5f},
    endLng: {e_lng:.5f},
    description: "{desc}",
    lastUpdated: "Hari ini",
    surveyor: "{surveyor}",
    path: [[{s_lat:.5f}, {s_lng:.5f}], [{e_lat:.5f}, {e_lng:.5f}]]
  }}"""
    ts_entries.append(ts_entry)
    
    # SQL
    sql_entry = f"('{code}', '{name}', '{district}', '{kecamatan}', {length}, {width}, '{surface_sql}', '{condition_sql}', {year}, {s_lat:.5f}, {s_lng:.5f}, {e_lat:.5f}, {e_lng:.5f}, '{desc}', '{surveyor}')"
    sql_entries.append(sql_entry)

ts_content = "export const INITIAL_ROAD_SEGMENTS: RoadSegment[] = [\n" + ",\n".join(ts_entries) + "\n];\n"

sql_content = """INSERT INTO public.road_segments
    (code, name, district_name, sub_district_name, length_km, width_m,
     surface_type, condition, const_year,
     start_lat, start_lng, end_lat, end_lng, description, surveyor_name)
VALUES
""" + ",\n".join(sql_entries) + "\nON CONFLICT (code) DO NOTHING;"

# 1. Update initialData.ts
with open('src/data/initialData.ts', 'r') as f:
    ts_file = f.read()

# Using regex to replace the array
ts_pattern = re.compile(r'export const INITIAL_ROAD_SEGMENTS: RoadSegment\[\] = \[\n(?:.*?)\n\];\n', re.DOTALL)
if ts_pattern.search(ts_file):
    new_ts_file = ts_pattern.sub(ts_content, ts_file)
    with open('src/data/initialData.ts', 'w') as f:
        f.write(new_ts_file)
    print("Updated src/data/initialData.ts")
else:
    print("Could not find INITIAL_ROAD_SEGMENTS array in initialData.ts!")

# 2. Update setup_database_lengkap.sql
with open('database/setup_database_lengkap.sql', 'r') as f:
    sql_file = f.read()

sql_pattern = re.compile(r'INSERT INTO public\.road_segments\s*\([^)]*\)\s*VALUES\s*(?:.*?)\s*ON CONFLICT \(code\) DO NOTHING;', re.DOTALL)
if sql_pattern.search(sql_file):
    new_sql_file = sql_pattern.sub(sql_content, sql_file)
    with open('database/setup_database_lengkap.sql', 'w') as f:
        f.write(new_sql_file)
    print("Updated database/setup_database_lengkap.sql")
else:
    print("Could not find INSERT block in setup_database_lengkap.sql!")

