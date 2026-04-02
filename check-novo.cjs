const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'C:/Users/suliv/OneDrive/\u00c1rea de Trabalho/RESULTADO (1).xlsx';
const wb = XLSX.read(fs.readFileSync(filePath), { cellDates: true });

console.log('Sheets:', wb.SheetNames);

const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null });
console.log('Total rows:', rows.length);

if (rows.length > 0) {
  console.log('Keys:', JSON.stringify(Object.keys(rows[0])));
  console.log('\nFirst 3 rows:');
  rows.slice(0, 3).forEach((r, i) => console.log('Row', i, JSON.stringify(r)));
}

// Canais únicos
const canais = {};
rows.forEach(r => {
  const key = Object.keys(r).find(k => k.toLowerCase().includes('canal'));
  const val = key ? (r[key] || '(vazio)') : '(sem coluna canal)';
  canais[val] = (canais[val] || 0) + 1;
});
console.log('\nCanais únicos:');
Object.entries(canais).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(' ', n.toString().padStart(3), c));
