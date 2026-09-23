import fs from 'fs';
import path from 'path';

const kmlPath = 'g:\\lentera-sistem\\scratch\\extracted_kmz\\doc.kml';
const content = fs.readFileSync(kmlPath, 'utf8');

console.log('Total KML file size:', content.length, 'characters');
console.log('KML Head (500 chars):');
console.log(content.slice(0, 500));

// Count key KML elements
const placemarkCount = (content.match(/<Placemark/g) || []).length;
const lineStringCount = (content.match(/<LineString/g) || []).length;
const polygonCount = (content.match(/<Polygon/g) || []).length;
const pointCount = (content.match(/<Point/g) || []).length;

console.log('\nElement counts:');
console.log('- Placemark:', placemarkCount);
console.log('- LineString:', lineStringCount);
console.log('- Polygon:', polygonCount);
console.log('- Point:', pointCount);
