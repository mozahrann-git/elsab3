const XLSX = require('xlsx');
const fs = require('fs');

const fileStr = fs.readFileSync('scripts/user_data.csv', 'utf8');
const workbook = XLSX.read(fileStr, { type: 'string' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
console.log('Arabic text check:');
console.log('DISTRICT row 0:', rawRows[0].DISTRICT);
console.log('Details row 0:', rawRows[0].Details.substring(0, 50));
console.log('Note row 1:', rawRows[1].Note);
