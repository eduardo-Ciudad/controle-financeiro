const contaModel = require('../models/contaModel');

const getAllContas = async (req, res) => {
  try {
    const contas = await contaModel.getAllContas();
    return res.json({ success: true, data: contas });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Falha ao listar contas.' });
  }
};

const createConta = async (req, res) => {
  try {
    const { nome, valor, data } = req.body;

    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
    }

    if (valor === undefined || typeof valor !== 'number' || Number.isNaN(valor) || valor <= 0) {
      return res.status(400).json({ success: false, error: 'Valor deve ser um número positivo.' });
    }

    if (!data || typeof data !== 'string' || !data.trim()) {
      return res.status(400).json({ success: false, error: 'Data é obrigatória.' });
    }

    const conta = await contaModel.createConta(nome.trim(), valor, data.trim());
    return res.status(201).json({ success: true, data: conta });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Falha ao criar conta.' });
  }
};

const pagarConta = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    const conta = await contaModel.getContaById(id);

    if (!conta) {
      return res.status(404).json({ success: false, error: 'Conta não encontrada.' });
    }

    if (conta.status === 'pago') {
      return res.status(400).json({ success: false, error: 'Conta já foi paga.' });
    }

    const saldoAtual = await contaModel.getSaldo();
    const novoSaldo = saldoAtual - conta.valor;

    await contaModel.pagarConta(id, novoSaldo);

    return res.json({
      success: true,
      data: {
        id,
        novoSaldo,
      },
    });
  } catch (error) {
    console.error(error);

    if (error.message.includes('Conta não encontrada') || error.message.includes('já paga')) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Falha ao pagar conta.' });
  }
};

const deleteConta = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    const deletedRows = await contaModel.deleteConta(id);

    if (deletedRows === 0) {
      return res.status(404).json({ success: false, error: 'Conta não encontrada.' });
    }

    return res.json({ success: true, data: { id } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Falha ao deletar conta.' });
  }
};



const updateSaldo = async (req, res) => {
  try {
    const { valor } = req.body;

    if (valor === undefined || typeof valor !== 'number' || valor < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valor inválido.'
      });
    }

    await contaModel.updateSaldo(valor);

    return res.json({
      success: true,
      data: { valor }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Falha ao atualizar saldo.'
    });
  }
};

const getSaldo = async (req, res) => {
  try {
    const valor = await contaModel.getSaldo();
    return res.json({ success: true, data: { valor } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Falha ao obter saldo.' });
  }
};

module.exports = {
  getAllContas,
  createConta,
  pagarConta,
  deleteConta,
  getSaldo,
   updateSaldo, 
};

