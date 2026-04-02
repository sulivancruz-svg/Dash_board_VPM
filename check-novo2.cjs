const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'C:/Users/suliv/OneDrive/\u00c1rea de Trabalho/RESULTADO (1).xlsx';
const wb = XLSX.read(fs.readFileSync(filePath), { cellDates: true });

// Analisa cada aba
for (const sheetName of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { raw: false, defval: null });
  console.log('\n===', sheetName, '=== rows:', rows.length);
  if (rows.length > 0) {
    console.log('Keys:', JSON.stringify(Object.keys(rows[0])));
    // Mostra amostras de Faturamento não-vazio
    const comFat = rows.filter(r => {
      const fk = Object.keys(r).find(k => k.toLowerCase().includes('faturamento') || k.toLowerCase().includes('fat'));
      return fk && r[fk] && r[fk] !== '';
    });
    console.log('Rows com faturamento:', comFat.length);
    if (comFat.length > 0) {
      const fk = Object.keys(comFat[0]).find(k => k.toLowerCase().includes('faturamento') || k.toLowerCase().includes('fat'));
      console.log('Faturamento key:', JSON.stringify(fk));
      console.log('Faturamento samples:', comFat.slice(0,5).map(r => r[fk]));
    }
  }
}
