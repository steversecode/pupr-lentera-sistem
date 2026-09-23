import fs from 'fs';
import path from 'path';

const kmlPath = 'g:\\lentera-sistem\\scratch\\extracted_kmz\\doc.kml';
const outPath = 'g:\\lentera-sistem\\src\\data\\ntt_roads_geojson.json';

const content = fs.readFileSync(kmlPath, 'utf8');
const placemarks = content.split('<Placemark');

const features = [];

function parseKmlDescription(html) {
  const props = {};
  if (!html) return props;
  
  // Extract all table rows <tr>...</tr>
  const trMatches = html.match(/<tr[^>]*?>[\s\S]*?<\/tr>/g) || [];
  for (const tr of trMatches) {
    // Extract td text inside rows
    const tdMatches = tr.match(/<td>([\s\S]*?)<\/td>/g) || [];
    if (tdMatches.length === 2) {
      const key = tdMatches[0].replace(/<\/?td>/g, '').replace(/<[^>]*?>/g, '').trim();
      const val = tdMatches[1].replace(/<\/?td>/g, '').replace(/<[^>]*?>/g, '').trim();
      if (key && val && !key.includes('FID') && !key.includes('Kl_Dat_Das') && !key.includes('Nm_Ruas')) {
        props[key] = val;
      } else if (key && val) {
        props[key] = val;
      }
    }
  }
  return props;
}

for (let i = 1; i < placemarks.length; i++) {
  const p = placemarks[i];
  
  // Only extract LineStrings (roads)
  if (!p.includes('<LineString>')) {
    continue;
  }

  // Extract name
  const nameMatch = p.match(/<name>(.*?)<\/name>/);
  const name = nameMatch ? nameMatch[1].trim() : 'Ruas Tanpa Nama';

  // Extract description if exists
  const descMatch = p.match(/<description>([\s\S]*?)<\/description>/);
  const description = descMatch ? descMatch[1].trim() : '';

  // Extract coordinates
  const coordMatch = p.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
  if (!coordMatch) {
    continue;
  }

  const rawCoords = coordMatch[1].trim();
  const coordPairs = rawCoords.split(/\s+/);
  
  const coordinates = [];
  for (const pair of coordPairs) {
    if (!pair) continue;
    const parts = pair.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        coordinates.push([lng, lat]);
      }
    }
  }

  if (coordinates.length > 0) {
    // Parse road code from name if it follows the format '53.00.xxx.K ...'
    const codeMatch = name.match(/^([A-Za-z0-9\.\-]+)\s+(.*)$/);
    const code = codeMatch ? codeMatch[1] : '';
    const roadName = codeMatch ? codeMatch[2] : name;

    const attributes = parseKmlDescription(description);

    features.push({
      type: 'Feature',
      properties: {
        fullName: name,
        code: code,
        name: roadName,
        attributes: attributes
      },
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    });
  }
}

const geojson = {
  type: 'FeatureCollection',
  features: features
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf8');
console.log(`Successfully converted KML to GeoJSON!`);
console.log(`Total roads extracted: ${features.length}`);
console.log(`Saved to: ${outPath}`);
