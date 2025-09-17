const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const p = path.join(process.cwd(), 'backend', 'elderly_data.json');
    const rows = JSON.parse(fs.readFileSync(p, 'utf8')) || [];
    const byUF = new Map();
    for (const r of rows) {
      const sigla = (r.sigla || r.uf || '').toUpperCase();
      if (!sigla) continue;
      if (!byUF.has(sigla)) {
        byUF.set(sigla, { sigla, name: r.name || sigla });
      }
    }
    const list = Array.from(byUF.values()).sort((a,b)=>a.sigla.localeCompare(b.sigla));
    // Adiciona BR no topo
    list.unshift({ sigla: 'BR', name: 'Brasil' });
    res.status(200).json(list);
  } catch (e) {
    res.status(200).json([{ sigla: 'BR', name: 'Brasil' }]);
  }
};
