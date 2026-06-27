const fs = require('fs');
const lines = fs.readFileSync('components/QuestionRenderer.tsx', 'utf-8').split('\n');
const newLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  // 309 has comment // --- 6. DRAG & DROP ---
  if (lineNum === 309) {
    skip = true;
  }
  
  if (!skip) {
    newLines.push(lines[i]);
  }
  
  if (lineNum === 554) {
    skip = false;
  }
}
fs.writeFileSync('components/QuestionRenderer.tsx', newLines.join('\n'));
console.log('done');
