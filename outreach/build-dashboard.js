// ─────────────────────────────────────────────────────────────────────────────
// Builds an industry-specific demo dashboard HTML page
// ─────────────────────────────────────────────────────────────────────────────

function buildDashboard(cfg) {
  const leadsJson = JSON.stringify(cfg.leads);
  const ahStart   = cfg.afterHoursStart !== undefined ? cfg.afterHoursStart : 9;
  const ahEnd     = cfg.afterHoursEnd   !== undefined ? cfg.afterHoursEnd   : 17;
  const kpi2Icon  = cfg.kpi2Icon || '🔧';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${cfg.name} — AI Voice Agent Demo</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #060f0b; color: #e2e8e4; min-height: 100vh; }

    header {
      background: linear-gradient(135deg, #003d32 0%, #004d40 100%);
      border-bottom: 1px solid rgba(212,175,55,0.3);
      padding: 18px 48px;
      display: flex; align-items: center; justify-content: space-between;
      position: sticky; top: 0; z-index: 10;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-icon {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #d4af37, #f0d060);
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; font-weight: 900; color: #003d32; letter-spacing: -1px;
    }
    .brand-name { font-size: 1.1rem; font-weight: 800; color: #d4af37; }
    .brand-sub  { font-size: 0.65rem; color: #7ab89a; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 1px; }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .status-pill {
      background: rgba(27,94,32,0.6); border: 1px solid rgba(76,175,80,0.4); color: #81c784;
      padding: 6px 14px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
      display: flex; align-items: center; gap: 7px;
    }
    .dot { width: 6px; height: 6px; background: #4caf50; border-radius: 50%; box-shadow: 0 0 6px #4caf50; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
    .demo-badge {
      background: rgba(212,175,55,0.15); border: 1px solid rgba(212,175,55,0.4);
      color: #d4af37; padding: 4px 12px; border-radius: 999px; font-size: 0.65rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
    }

    .phone-banner {
      background: linear-gradient(90deg, rgba(212,175,55,0.08), rgba(212,175,55,0.04));
      border-bottom: 1px solid rgba(212,175,55,0.15);
      padding: 9px 48px; display: flex; align-items: center; justify-content: center; gap: 10px;
      font-size: 0.78rem; color: #7ab89a;
    }
    .phone-banner strong { color: #d4af37; font-weight: 700; }

    main { max-width: 1140px; margin: 0 auto; padding: 36px 48px 80px; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 32px; }
    .kpi {
      background: linear-gradient(145deg, #0d2b22, #0a2019);
      border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;
      padding: 28px 28px 24px; position: relative; overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }
    .kpi:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.2); }
    .kpi-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #d4af37, #f0d060); }
    .kpi-icon { font-size: 1.4rem; margin-bottom: 16px; display: inline-block; background: rgba(212,175,55,0.1); padding: 8px; border-radius: 10px; }
    .kpi-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 2px; color: #5a8a74; margin-bottom: 10px; font-weight: 600; }
    .kpi-value { font-size: 3rem; font-weight: 800; color: #d4af37; line-height: 1; letter-spacing: -1px; transition: color 0.3s, font-size 0.3s; }
    .kpi-sub { font-size: 0.75rem; color: #3d6050; margin-top: 8px; }

    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .section-title { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 2.5px; color: #5a8a74; font-weight: 700; }
    .section-count { background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.2); color: #d4af37; padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }

    .table-wrap { background: linear-gradient(145deg, #0d2b22, #0a2019); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    col.col-name  { width: 16%; } col.col-phone { width: 14%; } col.col-int { width: 18%; }
    col.col-notes { width: 34%; } col.col-time  { width: 18%; }
    thead tr { background: linear-gradient(90deg, #003d32, #004d40); border-bottom: 1px solid rgba(212,175,55,0.15); }
    th { padding: 14px 16px; text-align: left; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 2px; color: #d4af37; font-weight: 700; }
    td { padding: 14px 16px; font-size: 0.83rem; color: #b0c4bb; border-top: 1px solid rgba(255,255,255,0.04); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 0; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .name-cell  { font-weight: 600; color: #d4e8de; }
    .phone-cell { font-family: monospace; font-size: 0.8rem; color: #7ab89a; }
    .notes-cell { color: #607d6e; font-size: 0.78rem; }
    .ts { color: #3d6050; font-size: 0.75rem; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 500; white-space: nowrap; border-width: 1px; border-style: solid; }
    .badge-housing     { background: rgba(212,175,55,0.15); border-color: rgba(212,175,55,0.4);    color: #d4af37; }
    .badge-residential { background: rgba(100,181,246,0.15); border-color: rgba(100,181,246,0.4);  color: #90caf9; }
    .badge-maintenance { background: rgba(239,154,154,0.15); border-color: rgba(239,154,154,0.4);  color: #ef9a9a; }
    .badge-emergency   { background: rgba(183,28,28,0.3);    border-color: rgba(244,67,54,0.4);    color: #ef5350; }

    .analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 32px; }
    .chart-card {
      background: linear-gradient(145deg, #0d2b22, #0a2019);
      border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;
      padding: 24px; position: relative; overflow: hidden;
    }
    .chart-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #d4af37, #f0d060); }
    .chart-title { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 2px; color: #5a8a74; font-weight: 700; margin-bottom: 20px; }
    .chart-container { position: relative; height: 220px; }

    .demo-notice {
      background: rgba(212,175,55,0.06); border: 1px solid rgba(212,175,55,0.2);
      border-radius: 10px; padding: 12px 20px; margin-bottom: 24px;
      font-size: 0.75rem; color: #7ab89a; text-align: center;
    }
    .demo-notice strong { color: #d4af37; }

    /* ── CTA Section ─────────────────────────────────────────────────────────── */
    .cta-section {
      margin-top: 44px;
      background: linear-gradient(135deg, #003d32 0%, #004d40 100%);
      border: 1px solid rgba(212,175,55,0.35);
      border-radius: 16px;
      padding: 36px 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 32px;
    }
    .cta-left .cta-heading {
      font-size: 1.2rem; font-weight: 800; color: #e2e8e4; margin-bottom: 6px;
    }
    .cta-left .cta-sub {
      font-size: 0.82rem; color: #7ab89a; margin-bottom: 4px;
    }
    .cta-left .cta-fine {
      font-size: 0.68rem; color: #3d6050; letter-spacing: 0.5px;
    }
    .cta-btn {
      background: linear-gradient(135deg, #d4af37, #f0d060);
      color: #002a22;
      padding: 15px 36px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 0.92rem;
      text-decoration: none;
      white-space: nowrap;
      transition: opacity 0.2s, transform 0.15s;
      display: inline-block;
      box-shadow: 0 4px 20px rgba(212,175,55,0.25);
    }
    .cta-btn:hover { opacity: 0.92; transform: translateY(-2px); }

    footer {
      text-align: center; padding: 24px 48px 36px;
      font-size: 0.62rem; color: #2a3d35; letter-spacing: 1.5px;
      text-transform: uppercase; border-top: 1px solid rgba(255,255,255,0.04); margin-top: 20px;
    }
    footer a { color: #3d6050; text-decoration: none; }
    footer a:hover { color: #5a8a74; }

    @media (max-width: 768px) {
      header { padding: 14px 20px; } main { padding: 24px 20px 60px; }
      .kpi-grid, .analytics-grid { grid-template-columns: 1fr; }
      col.col-notes { width: 0; display: none; }
      .cta-section { flex-direction: column; align-items: flex-start; padding: 24px 20px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">${cfg.name.charAt(0)}</div>
      <div>
        <div class="brand-name">${cfg.name}</div>
        <div class="brand-sub">${cfg.subtitle}</div>
      </div>
    </div>
    <div class="header-right">
      <span class="demo-badge">Live Demo</span>
      <div class="status-pill"><span class="dot"></span>AI Active &nbsp;|&nbsp; 24/7 Coverage</div>
    </div>
  </header>

  <div class="phone-banner">
    <span>Callers reach ${cfg.agentName} 24/7 at</span>
    <strong>📞 ${cfg.phone}</strong>
    <span>— powered by Vapi Voice AI</span>
  </div>

  <main>
    <div class="demo-notice">
      <strong>This is a live demo dashboard.</strong> The leads below show how ${cfg.agentName} captures and logs every call automatically — 24 hours a day, 7 days a week.
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-accent"></div><div class="kpi-icon">📞</div>
        <div class="kpi-label">${cfg.kpi1.label}</div>
        <div class="kpi-value" id="kpi1">—</div>
        <div class="kpi-sub">${cfg.kpi1.sub}</div>
      </div>
      <div class="kpi"><div class="kpi-accent"></div><div class="kpi-icon">${kpi2Icon}</div>
        <div class="kpi-label">${cfg.kpi2.label}</div>
        <div class="kpi-value" id="kpi2">—</div>
        <div class="kpi-sub">${cfg.kpi2.sub}</div>
      </div>
      <div class="kpi"><div class="kpi-accent"></div><div class="kpi-icon">💰</div>
        <div class="kpi-label">${cfg.kpi3.label}</div>
        <div class="kpi-value" id="kpi3">—</div>
        <div class="kpi-sub">${cfg.kpi3.sub}</div>
      </div>
      <div class="kpi"><div class="kpi-accent"></div><div class="kpi-icon">🌙</div>
        <div class="kpi-label">${cfg.kpi4.label}</div>
        <div class="kpi-value" id="kpi4">—</div>
        <div class="kpi-sub">${cfg.kpi4.sub}</div>
      </div>
    </div>

    <div class="section-header">
      <div class="section-title">Recent Calls Captured</div>
      <div class="section-count" id="leadCount">0 total</div>
    </div>

    <div class="table-wrap">
      <table>
        <colgroup><col class="col-name"/><col class="col-phone"/><col class="col-int"/><col class="col-notes"/><col class="col-time"/></colgroup>
        <thead><tr><th>Name</th><th>Phone</th><th>Type</th><th>Notes</th><th>Time</th></tr></thead>
        <tbody id="leadsBody"></tbody>
      </table>
    </div>

    <div class="section-header" style="margin-top:32px">
      <div class="section-title">Analytics</div>
    </div>
    <div class="analytics-grid">
      <div class="chart-card"><div class="chart-title">Calls by Type</div><div class="chart-container"><canvas id="donutChart"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">Calls by Day</div><div class="chart-container"><canvas id="barChart"></canvas></div></div>
    </div>

    <div class="cta-section">
      <div class="cta-left">
        <div class="cta-heading">Want this running for your business?</div>
        <div class="cta-sub">Setup in about a week. Runs 24/7 from day one.</div>
        <div class="cta-fine">$250 / month &nbsp;·&nbsp; One-time setup fee &nbsp;·&nbsp; No contract</div>
      </div>
      <a class="cta-btn" href="mailto:outreachfrontrange@gmail.com?subject=AI Voice Agent Demo — Interested">Book a 15-Min Call →</a>
    </div>
  </main>

  <footer>
    Front Range AI &nbsp;·&nbsp; Built by Will Egger &nbsp;·&nbsp; Fort Collins, CO &nbsp;·&nbsp;
    <a href="mailto:outreachfrontrange@gmail.com">outreachfrontrange@gmail.com</a>
  </footer>

  <script>
    const LEADS            = ${leadsJson};
    const BADGES           = ${JSON.stringify(cfg.badges)};
    const KPI1_TYPES       = ${JSON.stringify(cfg.kpi1Types)};
    const KPI2_TYPES       = ${JSON.stringify(cfg.kpi2Types)};
    const VALUE_CATEGORIES = ${JSON.stringify(cfg.valueCategory)};
    const VALUE_PER_LEAD   = ${cfg.valuePerLead};
    const AFTER_HOURS_START = ${ahStart};
    const AFTER_HOURS_END   = ${ahEnd};

    let donutChart, barChart;

    const BADGE_COLORS = {
      'badge-housing':     '#d4af37',
      'badge-residential': '#90caf9',
      'badge-maintenance': '#ef9a9a',
      'badge-emergency':   '#ef5350',
    };

    function getBadgeClass(type) {
      return BADGES[type] || 'badge-residential';
    }

    function getCategoryColor(label) {
      return BADGE_COLORS[getBadgeClass(label)] || '#90caf9';
    }

    function setFitValue(id, text) {
      const el = document.getElementById(id);
      el.textContent = text;
      const len = text.length;
      if      (len >= 13) el.style.fontSize = '1.3rem';
      else if (len >= 11) el.style.fontSize = '1.6rem';
      else if (len >= 9)  el.style.fontSize = '2rem';
      else if (len >= 7)  el.style.fontSize = '2.5rem';
      else                el.style.fontSize = '';
    }

    function countUp(el, target, prefix, suffix, decimals) {
      const duration = 800, start = performance.now();
      function step(now) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const val = target * ease;
        el.textContent = (prefix||'') + val.toLocaleString('en-US', {minimumFractionDigits: decimals||0, maximumFractionDigits: decimals||0}) + (suffix||'');
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function buildDonut(labels, values) {
      if (donutChart) donutChart.destroy();
      donutChart = new Chart(document.getElementById('donutChart'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: labels.map(getCategoryColor), borderWidth: 0, hoverOffset: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { position: 'right', labels: { color: '#7ab89a', font: { size: 11 }, padding: 12, boxWidth: 10 } } } }
      });
    }

    function buildBar(labels, values) {
      if (barChart) barChart.destroy();
      barChart = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Calls', data: values, backgroundColor: 'rgba(212,175,55,0.5)', borderColor: '#d4af37', borderWidth: 1, borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#5a8a74', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
            y: { ticks: { color: '#5a8a74', font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
          }
        }
      });
    }

    function render() {
      const total = LEADS.length;

      const primary = LEADS.filter(l => {
        const t = (l.type||'').toLowerCase();
        return KPI1_TYPES.some(k => t.includes(k.toLowerCase()));
      }).length;

      const secondary = LEADS.filter(l => {
        const t = (l.type||'').toLowerCase();
        return KPI2_TYPES.some(k => t.includes(k.toLowerCase()));
      }).length;

      const valuableLeads = LEADS.filter(l => {
        const t = (l.type||'').toLowerCase();
        return VALUE_CATEGORIES.some(c => t.includes(c.toLowerCase()));
      }).length;
      const totalValue = valuableLeads * VALUE_PER_LEAD;

      const afterHours = LEADS.filter(l => {
        if (!l.date) return false;
        const hour = parseInt(new Date(l.date).toLocaleString('en-US', { timeZone: 'America/Denver', hour: 'numeric', hour12: false }));
        return hour < AFTER_HOURS_START || hour >= AFTER_HOURS_END;
      }).length;

      countUp(document.getElementById('kpi1'), primary, '', '', 0);
      countUp(document.getElementById('kpi2'), secondary, '', '', 0);
      setFitValue('kpi3', '$' + totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 }));
      countUp(document.getElementById('kpi4'), afterHours, '', '', 0);
      document.getElementById('leadCount').textContent = total + ' total';

      document.getElementById('leadsBody').innerHTML = LEADS.map(l => {
        const badgeClass = getBadgeClass(l.type);
        const ts = l.date ? new Date(l.date).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
        return '<tr>' +
          '<td class="name-cell" title="' + l.name + '">' + l.name + '</td>' +
          '<td class="phone-cell">' + l.phone + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + l.type + '</span></td>' +
          '<td class="notes-cell" title="' + (l.notes||'') + '">' + (l.notes||'—') + '</td>' +
          '<td class="ts">' + ts + '</td>' +
          '</tr>';
      }).join('');

      const typeCounts = {};
      LEADS.forEach(l => { typeCounts[l.type] = (typeCounts[l.type]||0) + 1; });
      buildDonut(Object.keys(typeCounts), Object.values(typeCounts));

      const today = new Date();
      const dayCounts = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        dayCounts[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
      }
      LEADS.forEach(l => {
        if (!l.date) return;
        const key = new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (key in dayCounts) dayCounts[key]++;
      });
      buildBar(Object.keys(dayCounts), Object.values(dayCounts));
    }

    render();
  <\/script>
</body>
</html>`;
}

module.exports = { buildDashboard };
