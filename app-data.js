function updateDatasetUI() {
  const rows = state.dataset || [];
  const info = state.columnInfo;
  const numeric = info.filter((col) => col.type === 'numeric');
  const missing = info.reduce((sum, col) => sum + col.missing, 0);

  $('datasetPill').textContent = `${rows.length.toLocaleString()} rows`;
  $('rowCount').textContent = rows.length.toLocaleString();
  $('columnCount').textContent = info.length.toLocaleString();
  $('numericCount').textContent = numeric.length.toLocaleString();
  $('missingCount').textContent = missing.toLocaleString();
  $('dropzone').classList.add('hidden');
  $('datasetSummary').classList.remove('hidden');
  $('dataFileName').textContent = state.datasetName;
  $('dataFileMeta').textContent = `${rows.length.toLocaleString()} observations · ${info.length} variables · ${missing.toLocaleString()} missing cells`;

  $('dependentSelect').disabled = false;
  $('dependentSelect').innerHTML = '<option value="">Choose a numeric variable</option>' + numeric.map((col) => `<option value="${col.safeName}">${escapeHtml(col.name)}</option>`).join('');
  $('predictorList').classList.remove('disabled');
  $('predictorList').innerHTML = numeric.map((col) => `<label class="checkbox-option"><input type="checkbox" value="${col.safeName}" data-original="${escapeHtml(col.name)}" /> <span>${escapeHtml(col.name)}</span></label>`).join('');
  qsa('#predictorList input').forEach((input) => input.addEventListener('change', updateRunState));
  $('dependentSelect').addEventListener('change', () => {
    qsa('#predictorList input').forEach((input) => {
      input.disabled = input.value === $('dependentSelect').value;
      if (input.disabled) input.checked = false;
    });
    updateRunState();
  });

  renderDataTable();
  renderVariableGrid();
  updateRunState();
}

function renderDataTable() {
  if (!state.dataset) return;
  const headers = state.columnInfo;
  $('dataTableHead').innerHTML = `<tr>${headers.map((col) => `<th>${escapeHtml(col.name)}</th>`).join('')}</tr>`;
  $('dataTableBody').innerHTML = state.dataset.slice(0, 100).map((row) => `<tr>${headers.map((col) => `<td>${escapeHtml(row[col.name] === '' ? '—' : String(row[col.name]))}</td>`).join('')}</tr>`).join('');
}

function renderVariableGrid() {
  $('variableGrid').innerHTML = state.columnInfo.map((col) => `<article class="variable-card"><div><strong title="${escapeHtml(col.name)}">${escapeHtml(col.name)}</strong><span>${col.type}</span></div><p>${col.missing} missing · ${col.unique} unique values</p></article>`).join('');
}

function updateRunState() {
  const y = $('dependentSelect').value;
  const x = qsa('#predictorList input:checked').map((input) => input.value);
  $('runModelButton').disabled = !state.dataset || !y || x.length === 0;
  $('runHint').textContent = !state.dataset ? 'Upload a dataset first.' : (!y || !x.length ? 'Choose a dependent variable and at least one predictor.' : `${x.length} predictor${x.length > 1 ? 's' : ''} selected.`);
}

function rString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function buildDataFrameCode() {
  return `data <- data.frame(\n${state.columnInfo.map((col) => {
    const values = state.dataset.map((row) => row[col.name]);
    const vector = col.type === 'numeric'
      ? values.map((v) => numericValue(v) === null ? 'NA_real_' : String(numericValue(v))).join(', ')
      : values.map((v) => v === '' || v === null || v === undefined ? 'NA_character_' : rString(v)).join(', ');
    return `  ${col.safeName} = c(${vector})`;
  }).join(',\n')},\n  check.names = FALSE\n)`;
}

async function ensureEngine() {
  if (state.engineReady) return state.webR;
  setEngineStatus('loading', 'Loading R engine');
  try {
    const { WebR } = await import('https://webr.r-wasm.org/latest/webr.mjs');
    state.webR = new WebR();
    await state.webR.init();
    state.engineReady = true;
    setEngineStatus('ready', 'R engine ready');
    toast('R engine loaded in this browser.');
    return state.webR;
  } catch (error) {
    setEngineStatus('error', 'R engine unavailable');
    throw new Error(`Could not start webR: ${error.message}`);
  }
}

async function bindDatasetToR() {
  const webR = await ensureEngine();
  if (!state.dataset || state.dataBound) return;
  await webR.evalRVoid(buildDataFrameCode());
  state.dataBound = true;
}
