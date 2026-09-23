import fs from 'fs';
const content = fs.readFileSync('g:\\lentera-sistem\\scratch\\extracted_kmz\\doc.kml', 'utf8');
const placemarks = content.split('<Placemark');
console.log('Total split parts:', placemarks.length);
for (let i = 1; i < Math.min(placemarks.length, 15); i++) {
  const p = placemarks[i];
  const nameMatch = p.match(/<name>(.*?)<\/name>/);
  const name = nameMatch ? nameMatch[1] : 'No Name';
  console.log(`Placemark ${i}: name = ${name}`);
  if (p.includes('<LineString>')) {
    console.log('  Type: LineString');
    const coordMatch = p.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (coordMatch) {
      console.log('  Coordinates count:', coordMatch[1].trim().split(/\s+/).length);
    }
  } else if (p.includes('<Point>')) {
    console.log('  Type: Point');
    const coordMatch = p.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (coordMatch) {
      console.log('  Coordinates:', coordMatch[1].trim());
    }
  }
}
