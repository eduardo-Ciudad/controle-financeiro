const { getDb, saveDb } = require('../database/db');

const getAllContas = async () => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM contas ORDER BY id');
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
};

const getContaById = async (id) => {
  const db = await getDb();
  const result = db.exec('SELECT * FROM contas WHERE id = ?', [id]);
  if (result.length === 0) return null;
  const { columns, values } = result[0];
  return Object.fromEntries(columns.map((col, i) => [col, values[0][i]]));
};

const createConta = async (nome, valor, data) => {
  const db = await getDb();
  db.run('INSERT INTO contas (nome, valor, data, status) VALUES (?, ?, ?, ?)', [nome, valor, data, 'pendente']);
  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];
  saveDb();
  return { id, nome, valor, data, status: 'pendente' };
};

const pagarConta = async (id, novoSaldo) => {
  const db = await getDb();
  db.run('UPDATE contas SET status = ? WHERE id = ? AND status = ?', ['pago', id, 'pendente']);
  const changes = db.exec('SELECT changes() as c')[0].values[0][0];
  if (changes === 0) throw new Error('Conta não encontrada ou já paga.');
  db.run('UPDATE saldo SET valor = ? WHERE id = 1', [novoSaldo]);
  saveDb();
  return { id, novoSaldo };
};

const deleteConta = async (id) => {
  const db = await getDb();
  db.run('DELETE FROM contas WHERE id = ?', [id]);
  const changes = db.exec('SELECT changes() as c')[0].values[0][0];
  saveDb();
  return changes;
};

const getSaldo = async () => {
  const db = await getDb();
  const result = db.exec('SELECT valor FROM saldo WHERE id = 1');
  if (result.length === 0) throw new Error('Saldo não encontrado.');
  return result[0].values[0][0];
};

const updateSaldo = async (valor) => {
  const db = await getDb();
  db.run('UPDATE saldo SET valor = ? WHERE id = 1', [valor]);
  const changes = db.exec('SELECT changes() as c')[0].values[0][0];
  if (changes === 0) throw new Error('Saldo não encontrado.');
  saveDb();
  return { valor };
};

module.exports = {
  getAllContas,
  getContaById,
  createConta,
  pagarConta,
  deleteConta,
  getSaldo,
  updateSaldo,
};