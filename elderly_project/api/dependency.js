const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const p = path.join(process.cwd(), 'backend', 'elderly_data.json');
    const rows = JSON.parse(fs.readFileSync(p, 'utf8')) || [];
    rows.sort((a,b)=>Number(b.year)-Number(a.year));
    let out = { independentOrPartial: 0, total: 0 };
    for (const r of rows) {
      if (r.dependency && typeof r.dependency === 'object') {
        out = {
          independentOrPartial: Number(r.dependency.independentOrPartial)||0,
          total: Number(r.dependency.total)||0
        };
        break;
      }
    }
    res.status(200).json(out);
  } catch {
    res.status(200).json({ independentOrPartial:0, total:0 });
  }
};
