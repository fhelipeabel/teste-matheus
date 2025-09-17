const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const p = path.join(process.cwd(), 'backend', 'elderly_data.json');
    const rows = JSON.parse(fs.readFileSync(p, 'utf8')) || [];
    // Estratégia: tenta achar BR no ano mais recente com "living".
    rows.sort((a,b)=>Number(b.year)-Number(a.year));
    let out = { alone: 0, withOthers: 0, withFamilyOrOther: 0 };
    for (const r of rows) {
      if (r.living && typeof r.living === 'object') {
        out = {
          alone: Number(r.living.alone)||0,
          withOthers: Number(r.living.withOthers)||0,
          withFamilyOrOther: Number(r.living.withFamilyOrOther)||0
        };
        break;
      }
    }
    res.status(200).json(out);
  } catch {
    res.status(200).json({ alone:0, withOthers:0, withFamilyOrOther:0 });
  }
};
