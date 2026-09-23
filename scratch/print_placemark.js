import fs from 'fs';

const content = fs.readFileSync('g:\\lentera-sistem\\scratch\\extracted_kmz\\doc.kml', 'utf8');
const match = content.match(/<Placemark[\s\S]*?<\/Placemark>/);
if (match) {
  console.log('First Placemark contents:');
  console.log(match[0].slice(0, 1000)); // limit to first 1000 characters
} else {
  console.log('No Placemark found.');
}
