function loadSample() {
  const sample = [
    { GDP_Growth: 3.1, FDI: 1.2, Inflation: 8.0, Trade: 32.5 }, { GDP_Growth: 4.0, FDI: 1.5, Inflation: 7.2, Trade: 35.1 },
    { GDP_Growth: 2.8, FDI: 1.1, Inflation: 9.4, Trade: 31.0 }, { GDP_Growth: 5.2, FDI: 2.2, Inflation: 6.7, Trade: 39.4 },
    { GDP_Growth: 4.7, FDI: 2.0, Inflation: 7.1, Trade: 38.2 }, { GDP_Growth: 1.9, FDI: 0.8, Inflation: 11.0, Trade: 28.8 },
    { GDP_Growth: 3.6, FDI: 1.6, Inflation: 8.6, Trade: 34.6 }, { GDP_Growth: 5.5, FDI: 2.5, Inflation: 6.1, Trade: 41.3 },
    { GDP_Growth: 2.3, FDI: 0.9, Inflation: 10.2, Trade: 30.4 }, { GDP_Growth: 4.3, FDI: 1.9, Inflation: 7.5, Trade: 37.0 },
    { GDP_Growth: 3.8, FDI: 1.7, Inflation: 8.1, Trade: 36.2 }, { GDP_Growth: 5.0, FDI: 2.3, Inflation: 6.5, Trade: 40.1 },
    { GDP_Growth: 2.6, FDI: 1.0, Inflation: 9.8, Trade: 30.9 }, { GDP_Growth: 4.6, FDI: 2.1, Inflation: 7.0, Trade: 38.7 },
    { GDP_Growth: 3.3, FDI: 1.4, Inflation: 8.8, Trade: 33.7 }, { GDP_Growth: 5.7, FDI: 2.7, Inflation: 5.9, Trade: 42.0 },
    { GDP_Growth: 2.1, FDI: 0.7, Inflation: 11.3, Trade: 27.9 }, { GDP_Growth: 4.1, FDI: 1.8, Inflation: 7.8, Trade: 36.8 },
    { GDP_Growth: 3.5, FDI: 1.5, Inflation: 8.4, Trade: 34.2 }, { GDP_Growth: 5.3, FDI: 2.4, Inflation: 6.3, Trade: 40.7 },
  ];
  setDataset(sample, 'sample_macroeconomy.csv');
}

function saveProject() {
  if (!state.dataset) return toast('Load a dataset before saving.', 'error');
  const project = { version: '0.1', name: $('projectName').textContent, datasetName: state.datasetName, dataset: state.dataset, savedAt: new Date().toISOString() };
  try { localStorage.setItem('econometrics-lab-project', JSON.stringify(project)); toast('Project saved in this browser.'); }
  catch { toast('The project is too large for browser storage. Export it instead.', 'error'); }
}

function download(name, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function exportProject() {
  if (!state.dataset) return toast('Load a dataset before exporting.', 'error');
  download(`${$('projectName').textContent.replace(/\s+/g,'_')}.econolab.json`, JSON.stringify({ version:'0.1', name:$('projectName').textContent, datasetName:state.datasetName, dataset:state.dataset, generatedCode:state.generatedCode, latestResult:state.latestResult }, null, 2), 'application/json');
}


async function importProjectFile(file) {
  try {
    const project = JSON.parse(await file.text());
    if (!Array.isArray(project.dataset) || !project.dataset.length) throw new Error('This file does not contain an Econometrics Lab dataset.');
    setDataset(project.dataset, project.datasetName || 'imported_project.csv');
    if (project.name) $('projectName').textContent = project.name;
    if (project.generatedCode) { state.generatedCode = project.generatedCode; $('codeEditor').value = project.generatedCode; }
    toast('Project imported successfully.');
  } catch (error) {
    toast(`Could not import project: ${error.message}`, 'error');
  }
}

function exportResultsCSV() {
  if (!state.latestResult) return;
  const r = state.latestResult;
  const lines = ['term,estimate,std_error,t_statistic,p_value,ci_low,ci_high'];
  r.terms.forEach((term,i)=>lines.push([term,r.estimates[i],r.se[i],r.tStats[i],r.pValues[i],r.ciLow[i],r.ciHigh[i]].map((v)=>`"${String(v).replace(/"/g,'""')}"`).join(',')));
  download('ols_results.csv', lines.join('\n'), 'text/csv');
}

async function handleFile(file) {
  try { setDataset(await readDataset(file), file.name); }
  catch (error) { toast(error.message, 'error'); }
}

function initialiseEvents() {
  qsa('.nav-item').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
  qsa('[data-jump]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.jump)));
  $('menuButton').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  $('themeButton').addEventListener('click', () => { document.documentElement.classList.toggle('light'); localStorage.setItem('theme', document.documentElement.classList.contains('light') ? 'light' : 'dark'); });
  $('fileInput').addEventListener('change', (event) => event.target.files[0] && handleFile(event.target.files[0]));
  $('loadSampleButton').addEventListener('click', loadSample);
  $('runModelButton').addEventListener('click', runOLS);
  $('runCodeButton').addEventListener('click', runCustomCode);
  $('clearConsoleButton').addEventListener('click', () => $('consoleOutput').textContent = '');
  $('openProjectButton')?.addEventListener('click', () => $('projectImportInput').click());
  $('projectImportInput').addEventListener('change', (event) => event.target.files[0] && importProjectFile(event.target.files[0]));
  $('saveProjectButton').addEventListener('click', saveProject);
  $('exportProjectButton').addEventListener('click', exportProject);
  $('downloadResultsButton').addEventListener('click', exportResultsCSV);
  $('copyCodeButton').addEventListener('click', async () => { await navigator.clipboard.writeText(state.generatedCode); toast('R code copied.'); });
  $('methodSearch').addEventListener('input', renderMethodLibrary);
  qsa('.family-item').forEach((button) => button.addEventListener('click', () => { qsa('.family-item').forEach((b)=>b.classList.remove('active')); button.classList.add('active'); state.selectedFamily=button.dataset.family; renderMethodLibrary(); switchView('methods'); }));
  qsa('.result-tab').forEach((button) => button.addEventListener('click', () => { qsa('.result-tab').forEach((b)=>b.classList.remove('active')); qsa('.result-tab-panel').forEach((p)=>p.classList.remove('active')); button.classList.add('active'); $(`${button.dataset.resultTab}Tab`).classList.add('active'); }));

  const dz=$('dropzone');
  ['dragenter','dragover'].forEach((event)=>dz.addEventListener(event,(e)=>{e.preventDefault();dz.classList.add('drag');}));
  ['dragleave','drop'].forEach((event)=>dz.addEventListener(event,(e)=>{e.preventDefault();dz.classList.remove('drag');}));
  dz.addEventListener('drop',(e)=>e.dataTransfer.files[0]&&handleFile(e.dataTransfer.files[0]));
  dz.addEventListener('click',()=>$('fileInput').click());
  dz.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' ') $('fileInput').click();});
}

function restoreLocalProject() {
  try {
    const saved = JSON.parse(localStorage.getItem('econometrics-lab-project'));
    if (saved?.dataset) setDataset(saved.dataset, saved.datasetName || 'saved_project.csv');
  } catch { /* ignore invalid storage */ }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(console.warn);
}

function boot() {
  if (localStorage.getItem('theme') === 'light') document.documentElement.classList.add('light');
  initialiseEvents();
  renderMethodLibrary();
  restoreLocalProject();
  registerServiceWorker();
}

boot();
