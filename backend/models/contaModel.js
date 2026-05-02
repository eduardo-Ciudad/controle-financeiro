const db = require('../database/db');

const getAllContas = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM contas ORDER BY id', (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
};

const getContaById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM contas WHERE id = ?', [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });
};

const createConta = (nome, valor, data) => {
  return new Promise((resolve, reject) => {
    const query = 'INSERT INTO contas (nome, valor, data, status) VALUES (?, ?, ?, ?)';
    const params = [nome, valor, data, 'pendente'];

    db.run(query, params, function (err) {
      if (err) {
        return reject(err);
      }

      resolve({
        id: this.lastID,
        nome,
        valor,
        data,
        status: 'pendente',
      });
    });
  });
};

const pagarConta = (id, novoSaldo) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (beginErr) => {
        if (beginErr) {
          return reject(beginErr);
        }

        db.run(
          'UPDATE contas SET status = ? WHERE id = ? AND status = ?',
          ['pago', id, 'pendente'],
          function (updateErr) {
            if (updateErr) {
              return db.run('ROLLBACK', () => reject(updateErr));
            }

            if (this.changes === 0) {
              return db.run('ROLLBACK', () => reject(new Error('Conta não encontrada ou já paga.')));
            }

            db.run('UPDATE saldo SET valor = ? WHERE id = 1', [novoSaldo], function (saldoErr) {
              if (saldoErr) {
                return db.run('ROLLBACK', () => reject(saldoErr));
              }

              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  return db.run('ROLLBACK', () => reject(commitErr));
                }

                resolve({ id, novoSaldo });
              });
            });
          }
        );
      });
    });
  });
};

const deleteConta = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM contas WHERE id = ?', [id], function (err) {
      if (err) {
        return reject(err);
      }
      resolve(this.changes);
    });
  });
};

const getSaldo = () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT valor FROM saldo WHERE id = 1', (err, row) => {
      if (err) {
        return reject(err);
      }
      if (!row) {
        return reject(new Error('Saldo não encontrado.'));
      }
      resolve(row.valor);
    });
  });
};

const updateSaldo = (valor) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE saldo SET valor = ? WHERE id = 1', [valor], function (err) {
      if (err) {
        return reject(err);
      }
      if (this.changes === 0) {
        return reject(new Error('Saldo não encontrado.'));
      }
      resolve({ valor });
    });
  });
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
