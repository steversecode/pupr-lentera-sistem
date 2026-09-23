import json

data = """
KOTA KUPANG
1	5371001 K	Jl. Yos Sudarso	3,89
2	5371002 K	Sp. Tiga Terminal LLBK - Sp. Tiga Straat A	2,13
3	5371003 K	Sp. Patung Sonbai - Sp. Tiga Bundaran Oebufu	5,10
4	5371004 K	Jl. Frans Lebu Raya	2,55
5	5371005 K	Jl. Mesakh Amalo	0,84
6	5371006 K	Sp. Patung Sonbai - Bello (Bts. Kab. Kupang)	9,74
7	5371007 K	Jl. A. Nisnoni	6,62
8	5371008 K	Sp. Polda - Sp. Patung Merpati	8,06
9	5371009 K	Jl. Amabi	2,27

KABUPATEN KUPANG
1	5303010	Jl. Dalam K.I. Bolok	1,80
2	5303011	Lingkar Luar Kota Kupang - Tablolong	17,40
3	5303012	Oelomin (Bts. Kota Kupang) - Baun	15,10
4	5303013	Baun - Ekam	20,43
5	5303014	Oesao - Buraen	24,48
6	5303015	Oekabiti - Oemoro (Bts. Kab. TTS)	55,10
7	5303016	Oelmasi - Sp. Sulamu	27,80
8	5303017	Sp. Sulamu - Barate	13,00
9	5303018	Barate - Manubelon	36,90
10	5303019	Manubelon - Naikliu	36,40
11	5303020	Naikliu - Oepoli (Bts. Negara)	27,90
12	5303021	Netemnanu (Bts. Kab. TTS) - Sp. Noelelo	1,03
13	5303022	Bokong - Lelogama	44,30
14	5303023	Hansisi - Oesalaen	38,52

KABUPATEN TIMOR TENGAH SELATAN
1	5304024	Pollo (Bts. Kab. TTS) - Sp. Panite	3,10
2	5304025	Batu Putih - Panite	22,23
3	5304026	Panite - Kolbano	47,88
4	5304027	Kolbano - Boking	51,76
5	5304028	Boking - Skinu (Bts. Kab. Malaka)	9,15
6	5304029	Soe - Kapan	16,80
7	5304030	Kapan - Nenas	25,75
8	5304031	Nenas - Nuapain (Bts. Kab. Kupang)	20,30
9	5304032	Kapan - Fatumnutu (Bts. Kab. TTU)	23,43
10	5304033	Sp. Niki-niki - Oenlasi	19,45
11	5304034	Oenlasi - Boking	30,92

KABUPATEN TIMOR TENGAH UTARA
1	5305035	Lemon (Bts. Kab. TTS) - Kefamenanu	36,85
2	5305036	Eban - Sp. Saenam	5,36
3	5305037	Maubesi - Sp. Manamas	33,48
4	5305038	Keliting (Bts. Kab. Belu) - Wini Sakato (Bts. Negara)	47,83

KABUPATEN BELU
1	5306039	Teun (Bts. Kab. Malaka) - Halilulik	16,60
2	5306040	Atambua - Sp. Manleten	13,37
3	5306041	Sp. Dualasi - Weluli	10,37
4	5306042	Lakafehan - Keliting (Bts. Kab. TTU)	5,25
5	5306043	Sp. Berluli - Teluk Gurita	6,14

KABUPATEN MALAKA
1	5321044	Lamea (Bts. Kab. TTS) - Wanibesak	10,18
2	5321045	Wanibesak - Betun	25,00
3	5321046	Betun - Motamasin (Bts. Negara)	30,06
4	5321047	Sp. Welaus - Kusa (Bts. Kab. Belu)	20,57

KABUPATEN ROTE NDAO
1	5314048	Baa - Batutua	27,82

KABUPATEN SABU RAIJUA
1	5320049	Seba - Ege	15,82
2	5320050	Ledeana - Teriu	11,10
3	5320051	Ledemanu - Lobodei	16,61

KABUPATEN ALOR
1	5307052	Kalabahi - Kokar	29,85
2	5307053	Kokar - Mali	28,30
3	5307054	Watatuku (Sp. Mola) - Mataraben	37,20
4	5307055	Baranusa - Puntaru	13,30
5	5307056	Beangonong - Boloang	23,20

KABUPATEN SUMBA TIMUR
1	5302057	Sp. Mohubukul - Lumbung	18,95
2	5302058	Melolo - Kananggar	49,05
3	5302059	Kananggar - Sp. Aukakehok	13,20
4	5302060	Sp.Aukakehok - Baing	48,81
5	5302061	Sp. Aukakehok - Sp. Lailunggi	32,55
6	5302062	Sp. Lailunggi - Malahar	42,66
7	5302063	Malahar - Praipaha	53,33

KABUPATEN SUMBA TENGAH
1	5316064	Weeluri (Bts. Kab. Sumba Barat) - Mamboro	23,70

KABUPATEN SUMBA BARAT
1	5301065	Waikabubak - Tana Rara (Bts. Kab. Sumba Tengah)	13,78
2	5301066	Waikabubak - Wanokaka	14,93
3	5301067	Sp. Padedeweri - Sp. Patiala	15,22
4	5301068	Sp. Patiala - Wetana (Bts. Kab. Sumba Barat Daya)	31,73

KABUPATEN SUMBA BARAT DAYA
1	5317069	Karang Indah (Bts. Kab. Sumba Barat) - Bondokodi	22,50
2	5317070	Bondokodi - Waitabula	32,88
3	5317071	Radamata - Ketewer	15,25

KABUPATEN MANGGARAI BARAT
1	5315072	Sp. Nggorang - Sp. Terang	32,90
2	5315073	Sp. Terang - Sp. Noa	23,40
3	5315074	Sp. Noa - Wontong (Bts. Kab. Manggarai)	25,20
4	5315075	Sp. Noa - Golowelu (Bts. Kab. Manggarai)	23,30

KABUPATEN MANGGARAI
1	5313076	Nggalak (Bts. Kab. Manggarai Barat) - Kedindi	30,30
2	5313077	Reo - Wae Gongger (Bts. Kab. Manggarai Timur)	0,60
3	5313078	Sp. Cumbi - Iteng	40,72

KABUPATEN MANGGARAI TIMUR
1	5319079	Wae Gongger (Bts. Kab. Manggarai) - Pota	46,30
2	5319080	Pota - Labuan Kelambu (Bts. Kab. Ngada)	35,00
3	5319081	Bealaing - Wae Rasan (Bts. Kab. Ngada)	73,82
4	5319082	Borong - Nceang	24,52
5	5319083	Sp. Dangka Mangkang - Dampek	50,83

KABUPATEN NGADA
1	5312084	Mbazang (Bts. Kab. Manggarai Timur) - Sp. Waepana	35,92
2	5312085	Malanuza - Maumbawa (Bts. Kab. Nagekeo)	19,91
3	5312086	Labuan Kelambu (Bts. Kab. Manggarai Timur) - Riung	25,06
4	5312087	Riung - Poma	30,22
5	5312088	Poma - Bajawa	37,84
6	5312089	Riung - Lengkosambi (Bts. Kab. Nagekeo)	17,90

KABUPATEN NAGEKEO
1	5318090	Nggolonio (Bts. Kab. Ngada) - Danga	18,80
2	5318091	Marapokot - Aeramo	6,66
3	5318092	Aeramo - Kaburea (Bts. Kab. Ende)	34,50
4	5318093	Maumbawa (Bts. Kab. Ngada) - Sp. Gako	29,72

KABUPATEN ENDE
1	5311094	Kaburea (Bts. Kab. Nagekeo) - Ranakolo	37,24
2	5311095	Detusoko - Maurole	48,65
3	5311096	Maurole - Koro (Bts. Kab. Sikka)	41,15
4	5311097	Wologai - Detukeli	15,35
5	5311098	Ende - Nuabosi	7,85

KABUPATEN SIKKA
1	5310099	Koro (Bts. Kab. Ende) - Maumere	36,58
2	5310100	Hepang - Sikka	8,65
3	5310101	Waepare - Bola	20,00
4	5310102	Napungmali - Mudajebak (Bts. Kab. Flores Timur)	25,70

KABUPATEN FLORES TIMUR
1	5309103	Mudajebak (Bts. Kab. Sikka) - Wairunu	17,62
2	5309104	Larantuka - Watowiti	5,44
3	5309105	Watowiti - Waiklibang	25,00
4	5309106	Wailebe - Waiwerang	23,45
5	5309107	Waiwerang - Sp. Withiama	13,10
6	5309108	Sp. Kolilanang - Sagu	10,31
7	5309109	Ritaebang - Lamakera	46,65

KABUPATEN LEMBATA
1	5308110	Balauring - Wairiang	20,52
2	5308111	Waijarang - Wulandoni	55,70
"""

import re

segments = []
current_district = ""

for line in data.strip().split('\n'):
    line = line.strip()
    if not line:
        continue
    
    # If line doesn't start with a number, it's a district name
    if not re.match(r'^\d+', line):
        current_district = line
        # Title case for District name, except 'KABUPATEN' -> 'Kab.', 'KOTA' -> 'Kota'
        if current_district.startswith("KABUPATEN"):
            current_district = "Kab. " + current_district[10:].title()
        elif current_district.startswith("KOTA"):
            current_district = "Kota " + current_district[5:].title()
        continue
    
    # Format: 1    5371001 K    Jl. Yos Sudarso    3,89
    parts = line.split('\t')
    if len(parts) == 4:
        code = parts[1].strip()
        # Some codes have spaces like '5371001 K', some don't. We keep them as is.
        # But we format them consistently if needed? The PDF has '5371001 K' or '5303010'.
        # Actually, let's keep it as in PDF.
        # In setup_database_lengkap.sql, Kota Kupang uses 53.71.001.K format!
        # But the SK says 5371001 K. We can use the SK code directly since it's the official code.
        
        name = parts[2].strip()
        length_str = parts[3].strip().replace(',', '.')
        length = float(length_str)
        
        segments.append({
            "code": code,
            "name": name,
            "district": current_district,
            "length": length
        })

print(f"Extracted {len(segments)} segments.")
with open('extracted_roads.json', 'w') as f:
    json.dump(segments, f, indent=2)
