const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const uf = (req.query.uf || req.query.UF || req.query.id || '').toUpperCase()
      || (req.url.split('/').pop() || '').toUpperCase(); // fallback

    // Em rotas dinâmicas do Vercel, /api/projections/SP → req.query.uf = 'SP'
    // O fallback acima só garante se algo variar no ambiente.

    if (!uf) return res.status(400).json({ ok: false, error: 'Informe UF' });

    const p = path.join(process.cwd(), 'backend', 'elderly_data.json');
    const rows = JSON.parse(fs.readFileSync(p, 'utf8')) || [];

    const filtered = rows.filter(r => String(r.sigla || r.uf || '').toUpperCase() === uf);

    const byYear = {};
    for (const r of filtered) {
      const y = String(r.year || '');
      if (!y) continue;
      const elder = Number(r.elder_population) || 0;
      const total = Number(r.total_population) || 0;
      byYear[y] = {
        elder_population: elder,
        total_population: total,
        elder_percentage: total > 0 ? (elder / total) * 100 : 0
      };
    }

    return res.status(200).json(byYear);
  } catch (e) {
    return res.status(200).json({});
  }
};
