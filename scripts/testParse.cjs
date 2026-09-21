const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('scripts/user_data.csv');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
console.log('Total rows:', data.length);
console.log('First row keys:', Object.keys(data[0]));
console.log('Sample row 0:', JSON.stringify(data[0], null, 2));
console.log('Sample row 1:', JSON.stringify(data[1], null, 2));
