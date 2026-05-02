const express = require('express');
const router = express.Router();
const contaController = require('../controllers/contaController');
router.put('/saldo', contaController.updateSaldo);
router.get('/contas', contaController.getAllContas);
router.post('/contas', contaController.createConta);
router.put('/contas/:id/pagar', contaController.pagarConta);
router.delete('/contas/:id', contaController.deleteConta);
router.get('/saldo', contaController.getSaldo);

module.exports = router;
