import fs from 'fs';
import { DOMParser } from '@xmldom/xmldom';
import * as togeojson from '@tmcw/togeojson';

const kmlText = fs.readFileSync('g:/LENTERA/database/extracted_kmz/doc.kml', 'utf8');
const kmlDOM = new DOMParser().parseFromString(kmlText, 'text/xml');
const converted = togeojson.kml(kmlDOM);

fs.writeFileSync('g:/LENTERA/public/data/ntt_roads_geojson.json', JSON.stringify(converted, null, 2));
console.log('Done!');
