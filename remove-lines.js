const fs = require('fs');
const lines = fs.readFileSync('components/QuestionRenderer.tsx', 'utf-8').split('\n');
const newLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  if (lineNum === 555 || lineNum === 907) {
    skip = true;
  }
  
  if (!skip) {
    newLines.push(lines[i]);
  }
  
  if (lineNum === 784 || lineNum === 997) {
    skip = false;
  }
}
fs.writeFileSync('components/QuestionRenderer.tsx', newLines.join('\n'));
console.log('done');
