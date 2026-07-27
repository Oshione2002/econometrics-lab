const state = {
  dataset: null,
  datasetName: null,
  columnInfo: [],
  webR: null,
  engineReady: false,
  dataBound: false,
  latestResult: null,
  generatedCode: '',
  selectedFamily: 'All',
};

const methods = [
  { name: 'Descriptive statistics', family: 'Diagnostics', pkg: 'base', fn: 'summary', status: 'live', description: 'Summary measures, distributions, missingness, and variable profiles.' },
  { name: 'Correlation matrix', family: 'Diagnostics', pkg: 'stats', fn: 'cor', status: 'live', description: 'Pairwise linear correlation for numeric variables.' },
  { name: 'Ordinary Least Squares', family: 'Regression', pkg: 'stats', fn: 'lm', status: 'live', description: 'Linear regression with classical or HC1 robust inference.' },
  { name: 'Breusch–Pagan test', family: 'Diagnostics', pkg: 'base implementation', fn: 'lm', status: 'live', description: 'Tests whether residual variance changes with model regressors.' },
  { name: 'Breusch–Godfrey test', family: 'Diagnostics', pkg: 'base implementation', fn: 'lm', status: 'live', description: 'Tests first-order serial correlation in regression residuals.' },
  { name: 'Jarque–Bera test', family: 'Diagnostics', pkg: 'base implementation', fn: 'pchisq', status: 'live', description: 'Residual normality test based on skewness and kurtosis.' },
  { name: 'Variance inflation factor', family: 'Diagnostics', pkg: 'base implementation', fn: 'lm', status: 'live', description: 'Checks linear dependence among numeric predictors.' },
  { name: 'Logit regression', family: 'Regression', pkg: 'stats', fn: 'glm', status: 'live', description: 'Binary outcome model using the logistic link.' },
  { name: 'Probit regression', family: 'Regression', pkg: 'stats', fn: 'glm', status: 'live', description: 'Binary outcome model using the normal probability link.' },
  { name: 'Instrumental variables / 2SLS', family: 'Regression', pkg: 'ivreg', fn: 'ivreg', status: 'indexed', description: 'Linear estimation with endogenous regressors and instruments.' },
  { name: 'Quantile regression', family: 'Regression', pkg: 'quantreg', fn: 'rq', status: 'indexed', description: 'Conditional quantile models robust to heterogeneous effects.' },
  { name: 'Tobit regression', family: 'Regression', pkg: 'AER', fn: 'tobit', status: 'indexed', description: 'Regression for censored dependent variables.' },
  { name: 'Poisson regression', family: 'Regression', pkg: 'stats', fn: 'glm', status: 'indexed', description: 'Count-data regression with a log link.' },
  { name: 'Negative binomial regression', family: 'Regression', pkg: 'MASS', fn: 'glm.nb', status: 'indexed', description: 'Count model allowing overdispersion.' },
  { name: 'Augmented Dickey–Fuller', family: 'Time series', pkg: 'urca', fn: 'ur.df', status: 'indexed', description: 'Unit-root test with configurable deterministic terms and lags.' },
  { name: 'Phillips–Perron test', family: 'Time series', pkg: 'urca', fn: 'ur.pp', status: 'indexed', description: 'Nonparametric correction unit-root test.' },
  { name: 'KPSS test', family: 'Time series', pkg: 'urca', fn: 'ur.kpss', status: 'indexed', description: 'Tests level or trend stationarity.' },
  { name: 'ARDL bounds model', family: 'Time series', pkg: 'ARDL', fn: 'ardl', status: 'indexed', description: 'Short-run and long-run dynamic relationships.' },
  { name: 'VAR', family: 'Time series', pkg: 'vars', fn: 'VAR', status: 'indexed', description: 'Multivariate autoregressive systems and dynamic analysis.' },
  { name: 'VECM', family: 'Time series', pkg: 'urca', fn: 'ca.jo', status: 'indexed', description: 'Cointegrated multivariate time-series model.' },
  { name: 'ARIMA', family: 'Time series', pkg: 'stats', fn: 'arima', status: 'indexed', description: 'Autoregressive integrated moving-average modelling.' },
  { name: 'Pooled panel regression', family: 'Panel', pkg: 'plm', fn: 'plm', status: 'indexed', description: 'Linear regression on stacked panel observations.' },
  { name: 'Fixed effects panel model', family: 'Panel', pkg: 'plm', fn: 'plm', status: 'indexed', description: 'Controls for time-invariant unobserved panel heterogeneity.' },
  { name: 'Random effects panel model', family: 'Panel', pkg: 'plm', fn: 'plm', status: 'indexed', description: 'Variance-components model for panel data.' },
  { name: 'Difference GMM', family: 'Panel', pkg: 'plm', fn: 'pgmm', status: 'indexed', description: 'Dynamic-panel GMM using differenced moment conditions.' },
  { name: 'System GMM', family: 'Panel', pkg: 'plm', fn: 'pgmm', status: 'indexed', description: 'Dynamic-panel GMM combining level and difference equations.' },
  { name: 'Difference-in-differences', family: 'Causal', pkg: 'fixest', fn: 'feols', status: 'indexed', description: 'Treatment-effect estimation using changes across groups and time.' },
  { name: 'Regression discontinuity', family: 'Causal', pkg: 'rdrobust', fn: 'rdrobust', status: 'indexed', description: 'Local causal estimation around an assignment cutoff.' },
  { name: 'Synthetic control', family: 'Causal', pkg: 'Synth', fn: 'synth', status: 'indexed', description: 'Counterfactual construction from weighted control units.' },
  { name: 'Propensity-score matching', family: 'Causal', pkg: 'MatchIt', fn: 'matchit', status: 'indexed', description: 'Balances observed covariates before treatment comparisons.' },
  { name: 'GARCH volatility', family: 'Financial', pkg: 'rugarch', fn: 'ugarchfit', status: 'indexed', description: 'Conditional volatility modelling for financial returns.' },
  { name: 'Value at Risk', family: 'Financial', pkg: 'PerformanceAnalytics', fn: 'VaR', status: 'indexed', description: 'Quantifies downside risk at a selected probability level.' },
  { name: 'Event study', family: 'Financial', pkg: 'estudy2', fn: 'eventstudy', status: 'indexed', description: 'Measures abnormal returns around an event window.' },
];

const $ = (id) => document.getElementById(id);
const qsa = (selector) => [...document.querySelectorAll(selector)];

function toast(message, type = 'success') {
  const element = document.createElement('div');
  element.className = `toast ${type}`;
  element.textContent = message;
  $('toastRegion').appendChild(element);
  setTimeout(() => element.remove(), 3600);
}

function setEngineStatus(status, label) {
  const dot = $('engineStatus').querySelector('.status-dot');
  dot.className = `status-dot ${status}`;
  $('engineStatus').querySelector('span:last-child').textContent = label;
}

function switchView(name) {
  qsa('.view').forEach((view) => view.classList.remove('active'));
  qsa('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === name));
  $(`${name}View`).classList.add('active');
  $('sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function sanitiseName(name, used) {
  let safe = String(name).trim().replace(/[^A-Za-z0-9_.]/g, '_');
  if (!safe || /^[0-9]/.test(safe)) safe = `X_${safe}`;
  let candidate = safe;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${safe}_${suffix++}`;
  used.add(candidate);
  return candidate;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  if (rows.length < 2) throw new Error('The CSV file does not contain data rows.');
  const headers = rows[0].map((h, i) => h.trim() || `Variable_${i + 1}`);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])));
}

async function readDataset(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === 'csv') return parseCSV(await file.text());
  if (['xlsx', 'xls'].includes(extension)) {
    if (!globalThis.XLSX) throw new Error('Excel parser failed to load. Try CSV or reconnect to the internet.');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  throw new Error('Only CSV and Excel files are supported in this MVP.');
}

function analyseColumns(rows) {
  if (!rows.length) return [];
  const used = new Set();
  return Object.keys(rows[0]).map((name) => {
    const values = rows.map((row) => row[name]);
    const present = values.filter((v) => v !== '' && v !== null && v !== undefined);
    const numericValues = present.filter((v) => Number.isFinite(Number(String(v).replace(/,/g, ''))));
    const numeric = present.length > 0 && numericValues.length / present.length >= 0.85;
    return {
      name,
      safeName: sanitiseName(name, used),
      type: numeric ? 'numeric' : 'text',
      missing: values.length - present.length,
      unique: new Set(present.map(String)).size,
    };
  });
}

function numericValue(value) {
  if (value === '' || value === null || value === undefined) return null;
  const result = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(result) ? result : null;
}

function setDataset(rows, name = 'dataset.csv') {
  if (!Array.isArray(rows) || rows.length < 3) throw new Error('At least three observations are required.');
  state.dataset = rows;
  state.datasetName = name;
  state.columnInfo = analyseColumns(rows);
  state.dataBound = false;
  state.latestResult = null;
  $('projectName').textContent = name.replace(/\.[^.]+$/, '');
  updateDatasetUI();
  toast(`Loaded ${rows.length.toLocaleString()} rows from ${name}.`);
}
