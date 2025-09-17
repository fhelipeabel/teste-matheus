const data = require('../backend/elderly_data.json');

module.exports = (req, res) => {
  // Exemplo simples: totais nacionais
  const total = data.reduce((acc, item) => acc + (item.total_idosos || 0), 0);
  res.status(200).json({ ok: true, total });
};
