const fs = require('fs');
const path = require('path');

function percent(elder, total) {
  const e = Number(elder)||0, t = Number(total)||0;
  return t > 0 ? (e/t)*100 : 0;
}

module.exports = (req, res) => {
  try {
    const p = path.join(process.cwd(), 'backend', 'elderly_data.json');
    const rows = JSON.parse(fs.readFileSync(p, 'utf8')) || [];
    const { state, year } = req.query || {};

    if (state) {
      const UF = String(state).toUpperCase();
      const filtered = rows.filter(r => (String(r.sigla||r.uf||'').toUpperCase() === UF));
      const byYear = {};
      for (const r of filtered) {
        const y = String(r.year||'');
        if (!y) continue;
        const elder = Number(r.elder_population)||0;
        const total = Number(r.total_population)||0;
        byYear[y] = {
          elder_population: elder,
          total_population: total,
          elder_percentage: percent(elder,total)
        };
      }
      return res.status(200).json(byYear);
    }

    if (year) {
      const Y = Number(year);
      const filtered = rows.filter(r => Number(r.year) === Y);
      const byUF = new Map();
      let brElder = 0, brTotal = 0;

      for (const r of filtered) {
        const sigla = (r.sigla || r.uf || '').toUpperCase();
        const name = r.name || sigla;
        const elder = Number(r.elder_population)||0;
        const total = Number(r.total_population)||0;
        if (sigla) {
          byUF.set(sigla, {
            sigla, name,
            elder_population: elder,
            total_population: total,
            elder_percentage: percent(elder,total)
          });
        }
        brElder += elder; brTotal += total;
      }

      const list = Array.from(byUF.values());
      list.unshift({
        sigla: 'BR',
        name: 'Brasil',
        elder_population: brElder,
        total_population: brTotal,
        elder_percentage: percent(brElder, brTotal)
      });
      return res.status(200).json(list);
    }

    // Sem params: ajuda a depurar
    return res.status(400).json({ ok:false, error:'Use ?state=UF ou ?year=YYYY' });

  } catch (e) {
    res.status(500).json({ ok:false, error:'Falha ao processar elderly' });
  }
};
