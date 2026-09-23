import fs from 'fs';

const content = fs.readFileSync('g:\\lentera-sistem\\scratch\\extracted_kmz\\doc.kml', 'utf8');
const regex = /<Placemark[\s\S]*?<name>([\s\S]*?)<\/name>/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null && count < 20) {
  console.log(`- ${match[1].trim()}`);
  count++;
}
