const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const p = path.join(process.cwd(), 'backend', 'elderly_data.json');
    const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
    const total = Array.isArray(rows)
      ? rows.reduce((acc, r) => acc + (Number(r.elder_population) || 0), 0)
      : 0;
    res.status(200).json({ ok: true, total });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Falha ao ler elderly_data.json' });
  }
};
