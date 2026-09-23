import fs from 'fs';
import path from 'path';

const srcPath = 'g:\\lentera-sistem\\src\\data\\ntt_roads_geojson.json';
const destPath = 'g:\\lentera-sistem\\public\\data\\ntt_roads_geojson.json';

fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.copyFileSync(srcPath, destPath);
// delete src version to avoid bloating the source bundle
fs.unlinkSync(srcPath);

console.log('Successfully copied GeoJSON file to public/data and cleaned up src/data!');
