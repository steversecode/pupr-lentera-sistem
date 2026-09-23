import fs from 'fs';

const content = fs.readFileSync('g:\\lentera-sistem\\scratch\\extracted_kmz\\doc.kml', 'utf8');
const parts = content.split('<Placemark');
for (let i = 1; i < parts.length; i++) {
  if (parts[i].includes('<LineString>')) {
    console.log('FOUND ROAD PLACEMARK (index ' + i + '):');
    console.log('<Placemark' + parts[i].slice(0, 1500));
    break;
  }
}
