const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'financeiro.db');

let db;

const getDb = async () => {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS contas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    valor REAL NOT NULL,
    data TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pendente','pago'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS saldo (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    valor REAL NOT NULL
  )`);

  const rows = db.exec('SELECT valor FROM saldo WHERE id = 1');
  if (rows.length === 0) {
    db.run('INSERT INTO saldo (id, valor) VALUES (1, 0)');
  }

  return db;
};

const saveDb = () => {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
};

module.exports = { getDb, saveDb };
