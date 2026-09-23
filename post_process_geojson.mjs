import fs from 'fs';

const data = JSON.parse(fs.readFileSync('g:/LENTERA/public/data/ntt_roads_geojson.json'));

data.features.forEach(f => {
  const props = f.properties;
  if (!props) return;
  
  const attributes = {};
  
  if (props.description && props.description.value) {
    const html = props.description.value;
    const tdRegex = /<td>(.*?)<\/td>\s*<td>(.*?)<\/td>/g;
    let match;
    while ((match = tdRegex.exec(html)) !== null) {
      attributes[match[1].trim()] = match[2].trim();
    }
  }

  props.attributes = attributes;
  props.code = attributes['Nm_Ruas'] ? attributes['Nm_Ruas'].split(' ')[0] : (props.name ? props.name.split(' ')[0] : '');
  props.fullName = attributes['Nm_Ruas'] || props.name;
  
  // Clean up description so it doesn't clutter
  delete props.description;
});

fs.writeFileSync('g:/LENTERA/public/data/ntt_roads_geojson.json', JSON.stringify(data));
console.log('Processed!');
