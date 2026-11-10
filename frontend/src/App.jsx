import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Database,
  FileCheck2,
  FileSpreadsheet,
  FileUp,
  Filter,
  History,
  LayoutDashboard,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const API = 'http://localhost:5001/api';
const fmt = (date) =>
  new Date(date).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rules, setRules] = useState({});
  const [report, setReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [filter, setFilter] = useState('All issues');
  const [query, setQuery] = useState('');
  const [apiState, setApiState] = useState('checking');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const input = useRef(null);

  const loadReports = async () => {
    try {
      const response = await fetch(`${API}/reports`);
      if (!response.ok) throw new Error('Could not load reports.');
      setReports(await response.json());
      setApiState('online');
    } catch {
      setApiState('offline');
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const onFile = (selectedFile) => {
    if (!selectedFile) return;
    setError('');
    setReport(null);

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a CSV file.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File exceeds the 5 MB limit.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result)
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(0, 6);
      const split = (line) =>
        line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
      const headers = split(lines[0] || '');
      setColumns(headers);
      setPreview(lines.slice(1).map(split));
      setRules(
        Object.fromEntries(
          headers.map((column) => [column, { type: 'auto', min: '', max: '' }]),
        ),
      );
    };
    reader.readAsText(selectedFile);
  };

  const validate = async () => {
    if (!file) {
      setError('Upload a CSV file to begin.');
      return;
    }

    setLoading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    body.append('rules', JSON.stringify(rules));

    try {
      const response = await fetch(`${API}/validate`, {
        method: 'POST',
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Validation failed.');
      setReport(data.report);
      setTab('overview');
      setFilter('All issues');
      await loadReports();
    } catch (validationError) {
      setError(
        `${validationError.message} Make sure the backend and MongoDB are running.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const openReport = async (id) => {
    try {
      const response = await fetch(`${API}/reports/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not open report.');
      setReport(data);
      setTab('overview');
      setFile(null);
      setColumns(data.columns || []);
    } catch (openError) {
      setError(openError.message);
    }
  };

  const deleteReport = async (id) => {
    if (!window.confirm('Delete this saved report?')) return;
    try {
      const response = await fetch(`${API}/reports/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Could not delete report.');
      await loadReports();
      if (report?._id === id) setReport(null);
    } catch {
      setError('Could not delete report.');
    }
  };

  const filtered = useMemo(() => {
    if (!report) return [];
    return report.issues.filter(
      (issue) =>
        (filter === 'All issues' || issue.rule === filter) &&
        [issue.row, issue.column, issue.rule, issue.message, issue.value]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  }, [report, filter, query]);

  const download = () => {
    if (!report) return;
    const rows = [
      ['CSV row', 'Column', 'Value', 'Failed rule', 'Details'],
      ...report.issues.map((issue) => [
        issue.row,
        issue.column,
        issue.value,
        issue.rule,
        issue.message,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(report.fileName || 'report').replace(/\.csv$/i, '')}-errors.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const types = report ? [...new Set(report.issues.map((issue) => issue.rule))] : [];
  const counts = report
    ? types.map((type) => ({
        type,
        count: report.issues.filter((issue) => issue.rule === type).length,
      }))
    : [];

  return (
    <div className={`shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brandmark"><ShieldCheck size={22} /></div>
          <div>
            <b>DataTrust<span> Lite</span></b>
            <small>DATA QUALITY WORKSPACE</small>
          </div>
        </div>
        <div className="navlabel">WORKSPACE</div>
        <button
          className={`nav ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          <LayoutDashboard /> Overview
        </button>
        <button
          className={`nav ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          <History /> Report history <i>{reports.length}</i>
        </button>
        <div className="sidebottom">
          <div className="secure">
            <ShieldCheck />
            <b>Your data stays yours</b>
            <p>Files are processed by your local API. Only validation summaries are saved.</p>
          </div>
          <div className="apistatus">
            <i className={apiState === 'online' ? 'green' : ''} />
            {apiState === 'online'
              ? 'API connected'
              : apiState === 'checking'
                ? 'Connecting…'
                : 'API disconnected'}
          </div>
          <div className="profile">
            <div>DT</div>
            <span><b>Data workspace</b><small>Local environment</small></span>
            <ChevronDown />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </button>
            <div>Workspace <span>/</span> <b>{tab === 'history' ? 'Report history' : 'Data overview'}</b></div>
          </div>
          <label><i /> PRIVATE WORKSPACE <b>DT</b></label>
        </header>

        <div className="content">
          <section className="welcome">
            <div>
              <div className="eyebrow"><Sparkles /> DATA QUALITY INTELLIGENCE</div>
              <h1>{tab === 'history' ? 'Report history' : 'Make every row count.'}</h1>
              <p>
                {tab === 'history'
                  ? 'Review and revisit your previous data quality checks.'
                  : 'Find hidden data issues before they become bigger problems.'}
              </p>
            </div>
            <div className="welcome-art">
              <img
                src="/images/ai-hologram.png"
                alt="Abstract holographic artificial intelligence network"
              />
              <div>
                <b>INTELLIGENT DATA PROTECTION</b>
                <span>SECURE · VALIDATE · TRUST</span>
              </div>
            </div>
            {report && tab === 'overview' && (
              <button className="ghost" onClick={download}>
                <ArrowDownToLine /> Export error report
              </button>
            )}
          </section>

          {error && (
            <div className="alert">
              <AlertCircle /> {error}
              <button onClick={() => setError('')}><X /></button>
            </div>
          )}

          {tab === 'history' ? (
            <section className="panel history">
              <div className="panelhead">
                <div><h2>Saved reports</h2><p>Your recent CSV validation activity</p></div>
                <span className="pill">{reports.length} reports</span>
              </div>
              {!reports.length ? (
                <div className="empty">
                  <History /><b>No reports yet</b>
                  <p>Validate your first CSV to see it here.</p>
                  <button className="primary" onClick={() => setTab('overview')}>Upload a CSV</button>
                </div>
              ) : (
                reports.map((savedReport) => (
                  <div className="reportrow" key={savedReport._id}>
                    <div className="fileicon"><FileSpreadsheet /></div>
                    <div className="reportinfo">
                      <b>{savedReport.fileName}</b>
                      <small>{fmt(savedReport.createdAt)} · {savedReport.totalRows} rows · {savedReport.totalColumns} columns</small>
                    </div>
                    <div className="scoremini">
                      <b>{savedReport.qualityScore}%</b><small>quality score</small>
                    </div>
                    <span className={savedReport.invalidRows ? 'bad' : 'good'}>
                      {savedReport.invalidRows ? `${savedReport.invalidRows} invalid rows` : 'All clear'}
                    </span>
                    <button className="iconbtn" onClick={() => openReport(savedReport._id)}><ArrowRight /></button>
                    <button className="iconbtn danger" onClick={() => deleteReport(savedReport._id)}><Trash2 /></button>
                  </div>
                ))
              )}
            </section>
          ) : (
            <>
              {!report && (
                <>
                  <section className="uploadgrid">
                    <div className="panel pad">
                      <div className="panelhead">
                        <div>
                          <div className="kicker">01 / SOURCE FILE</div>
                          <h2>Upload your dataset</h2>
                          <p>Start with a CSV file. We'll take care of the checks.</p>
                        </div>
                        <div className="stepicon"><FileUp /></div>
                      </div>
                      <div
                        className={`dropzone ${file ? 'hasfile' : ''}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          onFile(event.dataTransfer.files[0]);
                        }}
                      >
                        {file ? (
                          <>
                            <div className="uploadsymbol success"><FileCheck2 /></div>
                            <b>{file.name}</b>
                            <small>{(file.size / 1024).toFixed(1)} KB · Ready to validate</small>
                            <button
                              className="textbtn"
                              onClick={() => {
                                setFile(null);
                                setPreview([]);
                                setColumns([]);
                              }}
                            >Choose another file</button>
                          </>
                        ) : (
                          <>
                            <div className="uploadsymbol"><UploadCloud /></div>
                            <b>Drop your CSV file here</b>
                            <small>or browse files from your computer</small>
                            <button className="primary" onClick={() => input.current?.click()}>
                              <FileUp /> Browse CSV
                            </button>
                            <input
                              ref={input}
                              type="file"
                              accept=".csv,text/csv"
                              hidden
                              onChange={(event) => onFile(event.target.files[0])}
                            />
                            <em>CSV format · Maximum file size 5 MB</em>
                          </>
                        )}
                      </div>
                      {file && (
                        <div className="preview">
                          <div className="previewtitle"><b>FILE PREVIEW</b><small>First 5 data rows</small></div>
                          <div className="scroll">
                            <table>
                              <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                              <tbody>
                                {preview.map((row, index) => (
                                  <tr key={index}>
                                    {columns.map((column, columnIndex) => (
                                      <td key={column}>{row[columnIndex] || <i className="missing">empty</i>}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="panel pad">
                      <div className="panelhead">
                        <div>
                          <div className="kicker">02 / VALIDATION</div>
                          <h2>Set your rules</h2>
                          <p>Choose how each column should be checked.</p>
                        </div>
                        <div className="stepicon purple"><Filter /></div>
                      </div>
                      {!file ? (
                        <div className="ruleempty">
                          <div><FileSpreadsheet /></div>
                          <b>Rules appear after upload</b>
                          <p>We'll detect your columns and suggest sensible checks automatically.</p>
                          <span>Missing values</span><span>Duplicates</span><span>Format checks</span>
                        </div>
                      ) : (
                        <div className="rules">
                          {columns.map((column) => (
                            <div className="rule" key={column}>
                              <div><b>{column}</b><small>Column validation</small></div>
                              <select
                                value={rules[column]?.type || 'auto'}
                                onChange={(event) =>
                                  setRules((current) => ({
                                    ...current,
                                    [column]: { ...current[column], type: event.target.value },
                                  }))
                                }
                              >
                                <option value="auto">Auto detect</option>
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="email">Email</option>
                                <option value="date">Date</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="rulesfoot">
                        <span><CheckCircle2 /> Missing values &amp; duplicates are always checked</span>
                        <button className="primary run" disabled={!file || loading} onClick={validate}>
                          {loading ? <><Loader2 className="spin" /> Checking…</> : <>Run validation <ArrowRight /></>}
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="infostrip">
                    <div><span className="ib blue"><AlertTriangle /></span><p><b>Catch missing data</b><small>Find empty cells across every column</small></p></div>
                    <div><span className="ib violet"><FileSpreadsheet /></span><p><b>Spot duplicates</b><small>Identify repeated records</small></p></div>
                    <div><span className="ib green"><ShieldCheck /></span><p><b>Validate formats</b><small>Check email, number, date &amp; more</small></p></div>
                  </section>
                </>
              )}

              {report && (
                <div className="results">
                  <div className="resultbanner">
                    <div className="resultfile">
                      <div className="fileicon"><FileSpreadsheet /></div>
                      <div><b>{report.fileName}</b><small>Validated {fmt(report.createdAt)}</small></div>
                    </div>
                    <div className="actions">
                      <button
                        className="ghost"
                        onClick={() => {
                          setReport(null);
                          setFile(null);
                          setPreview([]);
                          setColumns([]);
                        }}
                      >New analysis</button>
                      <button className="primary" onClick={download}><ArrowDownToLine /> Download errors</button>
                    </div>
                  </div>

                  <div className="metrics">
                    <div className="metric scorecard">
                      <label>DATA QUALITY SCORE <CircleHelp /></label>
                      <div className="scoreline">
                        <strong>{report.qualityScore}<small>%</small></strong>
                        <div className="ring" style={{ '--score': `${report.qualityScore * 3.6}deg` }}>
                          <span>{report.qualityScore >= 90 ? 'Great' : report.qualityScore >= 70 ? 'Fair' : 'Needs work'}</span>
                        </div>
                      </div>
                      <div className="progress"><i style={{ width: `${report.qualityScore}%` }} /></div>
                      <small>Based on detected validation issues</small>
                    </div>
                    <Metric icon={<Database />} label="TOTAL ROWS" value={report.totalRows} note={`${report.totalColumns} columns detected`} tone="blue" />
                    <Metric icon={<CheckCircle2 />} label="VALID ROWS" value={report.validRows} note="Passed all checks" tone="green" />
                    <Metric icon={<AlertTriangle />} label="INVALID ROWS" value={report.invalidRows} note={`${report.totalIssues} total issues`} tone="red" />
                  </div>

                  <div className="resultgrid">
                    <section className="panel issuepanel">
                      <div className="panelhead">
                        <div><h2>Validation issues</h2><p>Every failure, traced to its exact location.</p></div>
                        <span className="pill">{report.totalIssues} found</span>
                      </div>
                      {!report.totalIssues ? (
                        <div className="empty compact"><CheckCircle2 /><b>Beautifully clean data!</b><p>No validation issues were found in this file.</p></div>
                      ) : (
                        <>
                          <div className="toolbar">
                            <div className="search"><Search /><input placeholder="Search issues…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
                            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                              <option>All issues</option>
                              {types.map((type) => <option key={type}>{type}</option>)}
                            </select>
                          </div>
                          <div className="scroll">
                            <table>
                              <thead><tr><th>CSV ROW</th><th>COLUMN</th><th>VALUE</th><th>VALIDATION FAILURE</th></tr></thead>
                              <tbody>
                                {filtered.map((issue, index) => (
                                  <tr key={`${issue.row}-${issue.column}-${index}`}>
                                    <td><span className="rowtag">#{issue.row}</span></td>
                                    <td><b>{issue.column}</b></td>
                                    <td>{issue.value ? <code>{issue.value}</code> : <i className="missing">empty</i>}</td>
                                    <td><span className="issuetag">{issue.rule}</span><small className="message">{issue.message}</small></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {!filtered.length && <div className="nomatch">No matching issues.</div>}
                          </div>
                        </>
                      )}
                    </section>

                    <section className="panel breakdown">
                      <div className="panelhead"><div><h2>Issue breakdown</h2><p>What needs attention</p></div><Activity /></div>
                      {counts.length ? (
                        <div className="breaklist">
                          {counts.map((item) => (
                            <div className="breakitem" key={item.type}>
                              <div><span>{item.type}</span><b>{item.count}</b></div>
                              <div className="bar"><i style={{ width: `${Math.max(4, (item.count / report.totalIssues) * 100)}%` }} /></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty compact"><Check /><b>No issues to break down</b></div>
                      )}
                      <div className="note"><ShieldCheck /> Each issue includes a CSV row number and column name so your team can find and fix it quickly.</div>
                    </section>
                  </div>
                </div>
              )}
            </>
          )}

          <footer>
            <span>© 2026 DataTrust Lite</span>
            <span><i /> Built for cleaner, more reliable data</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, note, tone }) {
  return (
    <div className="metric">
      <label>{label}</label>
      <div className={`metricicon ${tone}`}>{icon}</div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
