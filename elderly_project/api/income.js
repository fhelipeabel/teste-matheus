const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const p = path.join(process.cwd(), 'backend', 'elderly_data.json');
    const rows = JSON.parse(fs.readFileSync(p, 'utf8')) || [];
    rows.sort((a,b)=>Number(b.year)-Number(a.year));
    let out = { averageIncome: null, averagePensionIncome: null };
    for (const r of rows) {
      if (r.income && typeof r.income === 'object') {
        out = {
          averageIncome: Number(r.income.averageIncome)||null,
          averagePensionIncome: Number(r.income.averagePensionIncome)||null
        };
        break;
      }
    }
    res.status(200).json(out);
  } catch {
    res.status(200).json({ averageIncome:null, averagePensionIncome:null });
  }
};
