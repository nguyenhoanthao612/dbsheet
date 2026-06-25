const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'AdminDashboard.tsx');
console.log('Validating/Sanitizing file:', filePath);

try {
  const buf = fs.readFileSync(filePath);
  // Decode using TextDecoder with fatal: false to ignore invalid UTF-8 characters and replace with standard characters or empty
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const text = decoder.decode(buf);
  
  // Make sure we strip any weird characters if any, but TextDecoder with fatal: false does a great job cleaning it up
  fs.writeFileSync(filePath, text, 'utf8');
  console.log('Successfully sanitized AdminDashboard.tsx to valid UTF-8!');
} catch (err) {
  console.error('Error during sanitization:', err);
}
