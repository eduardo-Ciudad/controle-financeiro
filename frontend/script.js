/* ================================================
   CONFIGURAÇÃO
   ================================================ */
const API_BASE = 'https://controle-financeiro-api-owce.onrender.com';

let todasContas = [];
let filtroAtivo = 'todas';
let chartPizza = null;
let chartBarras = null;

/* ================================================
   UTILITÁRIOS
   ================================================ */

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

function isDark() {
  return document.body.classList.contains('dark-mode');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = 'toast';
  }, 3200);
}

function setLoading(active) {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.toggle('active', active);
}

function clearFieldErrors() {
  ['erroNome', 'erroValor', 'erroData'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  ['inputNome', 'inputValor', 'inputData'].forEach(id => {
    document.getElementById(id).classList.remove('error');
  });
}

function setHeaderDate() {
  const el = document.getElementById('headerDate');
  const now = new Date();
  el.textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/* ================================================
   DARK MODE
   ================================================ */
function toggleDarkMode() {
  const dark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  syncThemeIcon(dark);

  // Recriar gráficos com cores do tema atual
  if (chartPizza)  { chartPizza.destroy();  chartPizza  = null; }
  if (chartBarras) { chartBarras.destroy(); chartBarras = null; }
  updateCharts();
}

function syncThemeIcon(dark) {
  document.getElementById('iconMoon').style.display = dark ? 'none' : '';
  document.getElementById('iconSun').style.display  = dark ? ''     : 'none';
}

function applyStoredTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.body.classList.add('dark-mode');
    syncThemeIcon(true);
  }
}

/* ================================================
   CARREGAR SALDO
   ================================================ */
async function loadSaldo() {
  try {
    const response = await fetch(`${API_BASE}/saldo`);
    const result = await response.json();

    if (!result.success) throw new Error(result.error || 'Erro ao carregar saldo.');

    const saldo = result.data.valor;
    document.getElementById('saldoNumero').textContent = formatCurrency(saldo);
  } catch (err) {
    document.getElementById('saldoNumero').textContent = 'Erro';
    console.error('loadSaldo:', err);
  }
}

/* ================================================
   ATUALIZAR SALDO (PUT /saldo)
   ================================================ */
async function updateSaldo() {
  const input    = document.getElementById('inputSaldoNovo');
  const btn      = document.getElementById('btnAtualizarSaldo');
  const feedback = document.getElementById('saldoFeedback');

  const valor = parseFloat(input.value);

  if (input.value.trim() === '' || isNaN(valor)) {
    feedback.textContent = 'Informe um valor válido.';
    feedback.className = 'saldo-feedback error';
    return;
  }

  btn.disabled = true;
  feedback.textContent = '';
  feedback.className = 'saldo-feedback';

  try {
    const response = await fetch(`${API_BASE}/saldo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor }),
    });
    const result = await response.json();

    if (!result.success) throw new Error(result.error || 'Erro ao atualizar saldo.');

    document.getElementById('saldoNumero').textContent = formatCurrency(valor);
    input.value = '';

    feedback.textContent = 'Saldo atualizado!';
    feedback.className = 'saldo-feedback success';
    showToast('Saldo atualizado com sucesso!', 'success');

    setTimeout(() => {
      feedback.textContent = '';
      feedback.className = 'saldo-feedback';
    }, 3000);
  } catch (err) {
    console.error('updateSaldo:', err);
    feedback.textContent = err.message || 'Falha ao atualizar saldo.';
    feedback.className = 'saldo-feedback error';
    showToast(err.message || 'Falha ao atualizar saldo.', 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ================================================
   CARREGAR CONTAS
   ================================================ */
async function loadContas() {
  try {
    const response = await fetch(`${API_BASE}/contas`);
    const result = await response.json();

    if (!result.success) throw new Error(result.error || 'Erro ao carregar contas.');

    todasContas = result.data;
    renderContas();
    updateSummary();
    updateCharts();
  } catch (err) {
    console.error('loadContas:', err);
    showToast('Falha ao carregar contas. Verifique o servidor.', 'error');
  }
}

/* ================================================
   RENDERIZAR LISTA DE CONTAS
   ================================================ */
function renderContas() {
  const lista = document.getElementById('listaContas');
  const emptyState = document.getElementById('emptyState');

  const contasFiltradas = filtroAtivo === 'todas'
    ? todasContas
    : todasContas.filter(c => c.status === filtroAtivo);

  if (contasFiltradas.length === 0) {
    lista.innerHTML = '';
    lista.appendChild(emptyState);
    emptyState.querySelector('p').textContent =
      filtroAtivo === 'todas'
        ? 'Nenhuma conta cadastrada'
        : `Nenhuma conta ${filtroAtivo === 'pendente' ? 'pendente' : 'paga'}`;
    return;
  }

  lista.innerHTML = '';

  contasFiltradas.forEach(conta => {
    const isPago = conta.status === 'pago';

    const item = document.createElement('div');
    item.className = `conta-item ${conta.status}`;
    item.dataset.id = conta.id;

    item.innerHTML = `
      <div class="conta-status-dot"></div>
      <div class="conta-info">
        <div class="conta-nome">${escapeHtml(conta.nome)}</div>
        <div class="conta-data">Venc. ${formatDate(conta.data)}</div>
      </div>
      <span class="conta-badge badge-${conta.status}">
        ${isPago ? 'Pago' : 'Pendente'}
      </span>
      <div class="conta-valor">R$ ${formatCurrency(conta.valor)}</div>
      <div class="conta-actions">
        <button
          class="btn btn-pay"
          onclick="pagarConta(${conta.id})"
          ${isPago ? 'disabled title="Conta já paga"' : ''}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Pagar
        </button>
        <button
          class="btn btn-delete"
          onclick="deleteConta(${conta.id})"
          title="Remover conta"
          aria-label="Remover ${escapeHtml(conta.nome)}"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    `;

    lista.appendChild(item);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ================================================
   RESUMO (chips)
   ================================================ */
function updateSummary() {
  const totalPendente = todasContas
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + c.valor, 0);

  const totalPago = todasContas
    .filter(c => c.status === 'pago')
    .reduce((sum, c) => sum + c.valor, 0);

  document.getElementById('totalPendente').textContent = `R$ ${formatCurrency(totalPendente)}`;
  document.getElementById('totalPago').textContent = `R$ ${formatCurrency(totalPago)}`;
  document.getElementById('totalContas').textContent = todasContas.length;
}

/* ================================================
   CRIAR CONTA
   ================================================ */
async function createConta(nome, valor, data) {
  const response = await fetch(`${API_BASE}/contas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, valor, data }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Erro ao criar conta.');
  return result.data;
}

/* ================================================
   PAGAR CONTA
   ================================================ */
async function pagarConta(id) {
  const btn = document.querySelector(`.conta-item[data-id="${id}"] .btn-pay`);
  if (btn) btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/contas/${id}/pagar`, { method: 'PUT' });
    const result = await response.json();

    if (!result.success) throw new Error(result.error || 'Erro ao pagar conta.');

    const { novoSaldo } = result.data;

    document.getElementById('saldoNumero').textContent = formatCurrency(novoSaldo);

    const idx = todasContas.findIndex(c => c.id === id);
    if (idx !== -1) todasContas[idx].status = 'pago';

    renderContas();
    updateSummary();
    updateCharts();
    showToast('Conta paga com sucesso!', 'success');
  } catch (err) {
    console.error('pagarConta:', err);
    showToast(err.message || 'Falha ao pagar conta.', 'error');
    if (btn) btn.disabled = false;
  }
}

/* ================================================
   DELETAR CONTA
   ================================================ */
async function deleteConta(id) {
  const conta = todasContas.find(c => c.id === id);
  const nome = conta ? conta.nome : 'esta conta';

  if (!confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return;

  setLoading(true);
  try {
    const response = await fetch(`${API_BASE}/contas/${id}`, { method: 'DELETE' });
    const result = await response.json();

    if (!result.success) throw new Error(result.error || 'Erro ao deletar conta.');

    todasContas = todasContas.filter(c => c.id !== id);
    updateSummary();
    updateCharts();
    renderContas();
    await loadSaldo();
    showToast('Conta removida.', 'info');
  } catch (err) {
    console.error('deleteConta:', err);
    showToast(err.message || 'Falha ao remover conta.', 'error');
  } finally {
    setLoading(false);
  }
}

/* ================================================
   GRÁFICOS — cores dependem do tema ativo
   ================================================ */
function updateCharts() {
  updatePieChart();
  updateBarChart();
}

function updatePieChart() {
  const totalPago = todasContas
    .filter(c => c.status === 'pago')
    .reduce((sum, c) => sum + c.valor, 0);

  const totalPendente = todasContas
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + c.valor, 0);

  const tooltipBg = isDark() ? '#0f172a' : '#1e293b';
  const ctx = document.getElementById('chartPizza').getContext('2d');

  if (chartPizza) {
    chartPizza.data.datasets[0].data = [totalPago, totalPendente];
    chartPizza.options.plugins.tooltip.backgroundColor = tooltipBg;
    chartPizza.update('active');
  } else {
    chartPizza = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pago', 'Pendente'],
        datasets: [{
          data: [totalPago, totalPendente],
          backgroundColor: ['#10b981', '#f59e0b'],
          borderColor: ['#059669', '#d97706'],
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` R$ ${formatCurrency(ctx.parsed)}`,
            },
            backgroundColor: tooltipBg,
            titleFont: { size: 12, weight: '600' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
          },
        },
        animation: { duration: 400 },
      },
    });
  }

  const legend = document.getElementById('legendPizza');
  legend.innerHTML = `
    <div class="legend-item">
      <div class="legend-dot" style="background:#10b981"></div>
      Pago: R$ ${formatCurrency(totalPago)}
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background:#f59e0b"></div>
      Pendente: R$ ${formatCurrency(totalPendente)}
    </div>
  `;
}

function updateBarChart() {
  const labels = todasContas.map(c => c.nome.length > 12 ? c.nome.slice(0, 12) + '…' : c.nome);
  const valores = todasContas.map(c => c.valor);
  const cores = todasContas.map(c =>
    c.status === 'pago' ? 'rgba(16,185,129,0.85)' : 'rgba(245,158,11,0.85)'
  );
  const coresBorda = todasContas.map(c =>
    c.status === 'pago' ? '#059669' : '#d97706'
  );

  const dark       = isDark();
  const tickColorX = dark ? '#94a3b8' : '#64748b';
  const tickColorY = dark ? '#64748b' : '#94a3b8';
  const gridColorY = dark ? '#1e3a5f' : '#f1f5f9';
  const tooltipBg  = dark ? '#0f172a' : '#1e293b';

  const ctx = document.getElementById('chartBarras').getContext('2d');

  if (chartBarras) {
    chartBarras.data.labels = labels;
    chartBarras.data.datasets[0].data = valores;
    chartBarras.data.datasets[0].backgroundColor = cores;
    chartBarras.data.datasets[0].borderColor = coresBorda;
    chartBarras.options.scales.x.ticks.color = tickColorX;
    chartBarras.options.scales.y.ticks.color = tickColorY;
    chartBarras.options.scales.y.grid.color   = gridColorY;
    chartBarras.options.plugins.tooltip.backgroundColor = tooltipBg;
    chartBarras.update('active');
  } else {
    chartBarras = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Valor (R$)',
          data: valores,
          backgroundColor: cores,
          borderColor: coresBorda,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.2,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` R$ ${formatCurrency(ctx.parsed.y)}`,
            },
            backgroundColor: tooltipBg,
            titleFont: { size: 12, weight: '600' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11, weight: '500' },
              color: tickColorX,
              maxRotation: 35,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColorY,
              drawBorder: false,
            },
            ticks: {
              font: { size: 11 },
              color: tickColorY,
              callback: v => `R$ ${formatCurrency(v)}`,
            },
          },
        },
        animation: { duration: 400 },
      },
    });
  }
}

/* ================================================
   FORMULÁRIO — NOVA CONTA
   ================================================ */
function validateForm(nome, valor, data) {
  let valid = true;
  clearFieldErrors();

  if (!nome.trim()) {
    document.getElementById('erroNome').textContent = 'Informe o nome da conta.';
    document.getElementById('inputNome').classList.add('error');
    valid = false;
  }

  const valorNum = parseFloat(valor);
  if (!valor || isNaN(valorNum) || valorNum <= 0) {
    document.getElementById('erroValor').textContent = 'Informe um valor válido maior que zero.';
    document.getElementById('inputValor').classList.add('error');
    valid = false;
  }

  if (!data) {
    document.getElementById('erroData').textContent = 'Informe a data de vencimento.';
    document.getElementById('inputData').classList.add('error');
    valid = false;
  }

  return valid;
}

document.getElementById('formConta').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome  = document.getElementById('inputNome').value;
  const valor = document.getElementById('inputValor').value;
  const data  = document.getElementById('inputData').value;

  if (!validateForm(nome, valor, data)) return;

  const btnAdicionar = document.getElementById('btnAdicionar');
  const feedback = document.getElementById('formFeedback');

  btnAdicionar.disabled = true;
  btnAdicionar.textContent = 'Salvando…';
  feedback.textContent = '';
  feedback.className = 'form-feedback';

  try {
    await createConta(nome.trim(), parseFloat(valor), data);
    await loadSaldo();
    await loadContas();

    document.getElementById('inputNome').value  = '';
    document.getElementById('inputValor').value = '';
    document.getElementById('inputData').value  = '';
    clearFieldErrors();

    feedback.textContent = 'Conta adicionada com sucesso!';
    feedback.className = 'form-feedback success';
    showToast('Conta criada com sucesso!', 'success');

    setTimeout(() => { feedback.textContent = ''; feedback.className = 'form-feedback'; }, 3000);
  } catch (err) {
    console.error('createConta:', err);
    feedback.textContent = err.message || 'Falha ao criar conta.';
    feedback.className = 'form-feedback error';
    showToast(err.message || 'Falha ao criar conta.', 'error');
  } finally {
    btnAdicionar.disabled = false;
    btnAdicionar.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Adicionar Conta
    `;
  }
});

/* ================================================
   EVENT LISTENERS
   ================================================ */
document.getElementById('btnThemeToggle').addEventListener('click', toggleDarkMode);

document.getElementById('btnAtualizarSaldo').addEventListener('click', updateSaldo);

document.getElementById('inputSaldoNovo').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') updateSaldo();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroAtivo = btn.dataset.filter;
    renderContas();
  });
});

/* ================================================
   INICIALIZAÇÃO
   ================================================ */
async function init() {
  applyStoredTheme();
  setHeaderDate();
  setLoading(true);
  try {
    await loadSaldo();
    await loadContas();
  } catch (err) {
    showToast('Falha ao conectar ao servidor. Verifique se o backend está rodando.', 'error');
  } finally {
    setLoading(false);
  }
}

init();
