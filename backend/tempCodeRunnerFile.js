const express = require('express');
const cors = require('cors');
const contaRoutes = require('./routes/contaRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', contaRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});
