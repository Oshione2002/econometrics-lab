async function runOLS() {
  const y = $('dependentSelect').value;
  const x = qsa('#predictorList input:checked').map((input) => input.value);
  const options = {
    y, x,
    intercept: $('interceptToggle').checked,
    robust: $('robustToggle').checked,
    confidence: Number($('confidenceSelect').value),
  };
  $('runModelButton').disabled = true;
  $('runModelButton').textContent = 'Running model…';
  setEngineStatus('loading', state.engineReady ? 'Estimating model' : 'Loading R engine');
  try {
    await ensureEngine();
    state.generatedCode = buildModelCode(options);
    await state.webR.evalRVoid(state.generatedCode);
    state.dataBound = true;

    const [terms, estimates, se, tStats, pValues, ciLow, ciHigh, fitted, residuals, vifNames, vifValues] = await Promise.all([
      getArray('names(estimates)'), getArray('as.numeric(estimates)'), getArray('as.numeric(standard_errors)'),
      getArray('as.numeric(t_statistics)'), getArray('as.numeric(p_values)'), getArray('as.numeric(confidence_low)'),
      getArray('as.numeric(confidence_high)'), getArray('as.numeric(model_fitted)'), getArray('as.numeric(model_residuals)'),
      getArray('names(vif_values)'), getArray('as.numeric(vif_values)'),
    ]);
    const metricExpressions = {
      observations: 'nobs(model)', r2: 'summary(model)$r.squared', adjR2: 'summary(model)$adj.r.squared',
      sigma: 'summary(model)$sigma', fStatistic: 'unname(summary(model)$fstatistic[1])',
      fP: 'pf(summary(model)$fstatistic[1], summary(model)$fstatistic[2], summary(model)$fstatistic[3], lower.tail = FALSE)',
      jb: 'jarque_bera', jbP: 'jarque_bera_p', bp: 'bp_statistic', bpP: 'bp_p', bg: 'bg_statistic', bgP: 'bg_p',
      omitted: 'nrow(data) - nobs(model)',
    };
    const metrics = {};
    for (const [key, expression] of Object.entries(metricExpressions)) {
      try { metrics[key] = await getNumber(expression); } catch { metrics[key] = NaN; }
    }

    state.latestResult = { terms, estimates, se, tStats, pValues, ciLow, ciHigh, fitted, residuals, vifNames, vifValues, metrics, options };
    renderResults();
    setEngineStatus('ready', 'R engine ready');
    toast('OLS estimation completed.');
  } catch (error) {
    console.error(error);
    setEngineStatus('error', 'Model failed');
    toast(error.message, 'error');
  } finally {
    $('runModelButton').disabled = false;
    $('runModelButton').textContent = 'Run OLS model';
    updateRunState();
  }
}

function formatNumber(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  const number = Number(value);
  if (number !== 0 && Math.abs(number) < 0.0001) return number.toExponential(2);
  return number.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function renderResults() {
  const result = state.latestResult;
  $('resultsEmpty').classList.add('hidden');
  $('resultsContent').classList.remove('hidden');
  $('resultActions').classList.remove('hidden');
  $('generatedCode').textContent = state.generatedCode;

  const m = result.metrics;
  const metricData = [
    ['Observations', formatNumber(m.observations, 0)], ['R²', formatNumber(m.r2)], ['Adjusted R²', formatNumber(m.adjR2)],
    ['Residual SE', formatNumber(m.sigma)], ['F-test p-value', formatNumber(m.fP)],
  ];
  $('modelMetrics').innerHTML = metricData.map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('coefficientTable').innerHTML = result.terms.map((term, i) => `<tr><td><code>${escapeHtml(term)}</code></td><td>${formatNumber(result.estimates[i])}</td><td>${formatNumber(result.se[i])}</td><td>${formatNumber(result.tStats[i])}</td><td class="${result.pValues[i] < .05 ? 'p-significant' : ''}">${formatNumber(result.pValues[i])}</td><td>[${formatNumber(result.ciLow[i])}, ${formatNumber(result.ciHigh[i])}]</td></tr>`).join('');

  const diagnostics = [
    { name: 'Jarque–Bera normality', stat: m.jb, p: m.jbP, null: 'Residuals are normally distributed.' },
    { name: 'Breusch–Pagan', stat: m.bp, p: m.bpP, null: 'Residual variance is constant.' },
    { name: 'Breusch–Godfrey (lag 1)', stat: m.bg, p: m.bgP, null: 'No first-order residual autocorrelation.' },
  ];
  $('diagnosticGrid').innerHTML = diagnostics.map((diag) => {
    const pass = Number.isFinite(diag.p) && diag.p >= .05;
    return `<article class="diagnostic-card"><div class="diag-top"><h3>${diag.name}</h3><span class="diag-value">p=${formatNumber(diag.p)}</span></div><p>${diag.null}</p><span class="diag-status ${pass ? 'pass' : 'warn'}">${!Number.isFinite(diag.p) ? 'Not available' : pass ? 'Do not reject at 5%' : 'Reject at 5%'}</span></article>`;
  }).join('');
  $('vifList').innerHTML = result.vifNames.length ? result.vifNames.map((name, i) => {
    const value = result.vifValues[i];
    const width = Math.min(100, Math.max(5, value / 10 * 100));
    return `<div class="vif-row"><code>${escapeHtml(name)}</code><div class="vif-track"><div class="vif-fill" style="width:${width}%"></div></div><strong>${formatNumber(value, 2)}</strong></div>`;
  }).join('') : '<p class="empty-field">VIF requires at least one numeric predictor.</p>';

  drawScatter($('residualPlot'), result.fitted, result.residuals);
  drawHistogram($('histogramPlot'), result.residuals);
  $('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function svgElement(name, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function drawAxes(svg, width, height, padding, xMin, xMax, yMin, yMax) {
  svg.innerHTML = '';
  const axisColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#334';
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#8fa7bd';
  svg.appendChild(svgElement('line', { x1: padding, y1: height-padding, x2: width-padding, y2: height-padding, stroke: axisColor }));
  svg.appendChild(svgElement('line', { x1: padding, y1: padding, x2: padding, y2: height-padding, stroke: axisColor }));
  const labels = [[padding, height-8, formatNumber(xMin,2)], [width-padding, height-8, formatNumber(xMax,2)], [5, height-padding+4, formatNumber(yMin,2)], [5, padding+4, formatNumber(yMax,2)]];
  labels.forEach(([x,y,text]) => { const t=svgElement('text',{x,y,fill:textColor,'font-size':10}); t.textContent=text; svg.appendChild(t); });
}

function drawScatter(svg, x, y) {
  const width=600, height=320, pad=42;
  const clean = x.map((value,i)=>[Number(value),Number(y[i])]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b));
  if (!clean.length) return;
  const xs=clean.map(d=>d[0]), ys=clean.map(d=>d[1]);
  let xmin=Math.min(...xs), xmax=Math.max(...xs), ymin=Math.min(...ys), ymax=Math.max(...ys);
  if (xmin===xmax) { xmin-=1; xmax+=1; } if (ymin===ymax) { ymin-=1; ymax+=1; }
  drawAxes(svg,width,height,pad,xmin,xmax,ymin,ymax);
  const mapX=v=>pad+(v-xmin)/(xmax-xmin)*(width-2*pad), mapY=v=>height-pad-(v-ymin)/(ymax-ymin)*(height-2*pad);
  svg.appendChild(svgElement('line',{x1:pad,y1:mapY(0),x2:width-pad,y2:mapY(0),stroke:'rgba(244,198,106,.55)','stroke-dasharray':'5 5'}));
  clean.forEach(([a,b])=>svg.appendChild(svgElement('circle',{cx:mapX(a),cy:mapY(b),r:3.5,fill:'rgba(86,185,255,.78)'})));
}

function drawHistogram(svg, values) {
  const clean=values.map(Number).filter(Number.isFinite); if (!clean.length) return;
  const width=600,height=320,pad=42,bins=Math.min(14,Math.max(6,Math.round(Math.sqrt(clean.length))));
  let min=Math.min(...clean),max=Math.max(...clean); if(min===max){min-=1;max+=1;}
  const counts=Array(bins).fill(0); clean.forEach(v=>counts[Math.min(bins-1,Math.floor((v-min)/(max-min)*bins))]++);
  const ymax=Math.max(...counts); drawAxes(svg,width,height,pad,min,max,0,ymax);
  const barW=(width-2*pad)/bins;
  counts.forEach((count,i)=>{const h=count/ymax*(height-2*pad); svg.appendChild(svgElement('rect',{x:pad+i*barW+1,y:height-pad-h,width:Math.max(1,barW-2),height:h,rx:2,fill:'rgba(110,231,195,.72)'}));});
}

async function runCustomCode() {
  try {
    $('runCodeButton').disabled = true;
    $('consoleOutput').textContent = 'Running…';
    await bindDatasetToR();
    const shelter = await new state.webR.Shelter();
    const capture = await shelter.captureR($('codeEditor').value);
    $('consoleOutput').textContent = capture.output.map((line) => line.data).join('\n') || '[No console output]';
    shelter.purge();
    setEngineStatus('ready', 'R engine ready');
  } catch (error) {
    $('consoleOutput').textContent = error.message;
    setEngineStatus('error', 'Code failed');
  } finally { $('runCodeButton').disabled = false; }
}

function renderMethodLibrary() {
  const term = $('methodSearch')?.value?.toLowerCase() || '';
  const filtered = methods.filter((method) => (state.selectedFamily === 'All' || method.family === state.selectedFamily) && `${method.name} ${method.pkg} ${method.fn}`.toLowerCase().includes(term));
  $('methodLibrary').innerHTML = filtered.map((method) => `<article class="method-card"><div class="method-card-top"><h3>${method.name}</h3><span class="status-label ${method.status}">${method.status === 'live' ? 'Executable' : 'Indexed'}</span></div><p>${method.description}</p><div class="method-meta"><span>${method.family}</span><code>${method.pkg}::${method.fn}</code></div></article>`).join('') || '<div class="empty-cell">No matching methods.</div>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}
