const data = require('../backend/elderly_data.json');

module.exports = (req, res) => {
  const { uf, cidade } = req.query; // ?uf=SP&cidade=São Paulo
  let result = data;

  if (uf) result = result.filter(r => (r.uf || '').toUpperCase() === uf.toUpperCase());
  if (cidade) result = result.filter(r => (r.cidade || '').toLowerCase() === cidade.toLowerCase());

  res.status(200).json({ ok: true, count: result.length, items: result });
};
