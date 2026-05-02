const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'financeiro.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar com o banco de dados:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
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

  db.get('SELECT valor FROM saldo WHERE id = 1', (err, row) => {
    if (err) {
      console.error('Erro ao inicializar saldo:', err.message);
      return;
    }

    if (!row) {
      db.run('INSERT INTO saldo (id, valor) VALUES (1, 0)', (insertErr) => {
        if (insertErr) {
          console.error('Erro ao inserir saldo inicial:', insertErr.message);
        }
      });
    }
  });
});

module.exports = db;
