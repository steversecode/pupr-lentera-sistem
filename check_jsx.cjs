const fs = require('fs');
const content = fs.readFileSync('src/components/LegerDocuments.tsx', 'utf8');
const lines = content.split('\n');

let openDivs = 0;
let inBlock = false;
for (let i = 256; i <= 525; i++) {
  const line = lines[i] || '';
  if (line.includes('{isAdmin && (')) inBlock = true;
  
  // Count `<div` without `/` 
  const opens = (line.match(/<div(\s|>)/g) || []).length;
  // Count `</div`
  const closes = (line.match(/<\/div>/g) || []).length;
  
  openDivs += opens;
  openDivs -= closes;
  
  if (openDivs < 0) {
    console.log(`Line ${i + 1} drops below 0!`);
  }
  
  if (line.trim() === ')}' && inBlock) {
    console.log(`End at line ${i + 1}. Total open: ${openDivs}`);
    break;
  }
}
