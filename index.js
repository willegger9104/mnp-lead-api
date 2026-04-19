require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.json());

app.get('/api/leads', async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, leads: data });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Front Range AI — Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #060f0b; color: #e2e8e4; min-height: 100vh; }

    /* ── Header ── */
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
    .brand-sub { font-size: 0.65rem; color: #7ab89a; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 1px; }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .status-pill {
      background: rgba(27,94,32,0.6); border: 1px solid rgba(76,175,80,0.4); color: #81c784;
      padding: 6px 14px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
      display: flex; align-items: center; gap: 7px;
    }
    .dot { width: 6px; height: 6px; background: #4caf50; border-radius: 50%; box-shadow: 0 0 6px #4caf50; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
    .last-updated { font-size: 0.68rem; color: #4a7060; }

    /* ── Main ── */
    main { max-width: 1180px; margin: 0 auto; padding: 36px 48px 80px; }

    /* ── KPI Grid ── */
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
    .kpi-value { font-size: 3rem; font-weight: 800; color: #d4af37; line-height: 1; letter-spacing: -1px; }
    .kpi-sub { font-size: 0.75rem; color: #3d6050; margin-top: 8px; }

    /* ── High Priority Banner ── */
    .hp-banner {
      display: none;
      background: rgba(183,28,28,0.22);
      border: 1px solid rgba(244,67,54,0.4);
      border-radius: 12px;
      color: #ef9a9a;
      padding: 11px 18px;
      margin-bottom: 16px;
      align-items: center;
      gap: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      animation: hpPulse 3s ease-in-out infinite;
    }
    .hp-banner.visible { display: flex; }
    .hp-banner-dot { width: 8px; height: 8px; background: #ef5350; border-radius: 50%; box-shadow: 0 0 8px #ef5350; flex-shrink: 0; }
    .hp-banner strong { color: #ef5350; }
    @keyframes hpPulse { 0%,100%{border-color:rgba(244,67,54,0.4)} 50%{border-color:rgba(244,67,54,0.7)} }

    /* ── Priority Badge (per-row) ── */
    .priority-badge {
      display: inline-block;
      background: rgba(183,28,28,0.3);
      border: 1px solid rgba(244,67,54,0.45);
      color: #ef5350;
      border-radius: 999px;
      font-size: 0.6rem;
      font-weight: 800;
      padding: 1px 6px;
      margin-left: 6px;
      vertical-align: middle;
      letter-spacing: 0.3px;
    }

    /* ── Section Header ── */
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .section-title { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 2.5px; color: #5a8a74; font-weight: 700; }
    .section-count { background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.2); color: #d4af37; padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }

    /* ── Table ── */
    .table-wrap { background: linear-gradient(145deg, #0d2b22, #0a2019); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    col.col-name   { width: 14%; }
    col.col-phone  { width: 12%; }
    col.col-int    { width: 15%; }
    col.col-addr   { width: 14%; }
    col.col-notes  { width: 27%; }
    col.col-time   { width: 18%; }
    thead tr { background: linear-gradient(90deg, #003d32, #004d40); border-bottom: 1px solid rgba(212,175,55,0.15); }
    th { padding: 14px 16px; text-align: left; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 2px; color: #d4af37; font-weight: 700; }
    td { padding: 14px 16px; font-size: 0.83rem; color: #b0c4bb; border-top: 1px solid rgba(255,255,255,0.04); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 0; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .name-cell { font-weight: 600; color: #d4e8de; }
    .phone-cell { font-family: monospace; font-size: 0.8rem; color: #7ab89a; }
    .addr-cell { color: #7ab89a; font-size: 0.78rem; }
    .notes-cell { color: #607d6e; font-size: 0.78rem; }
    .ts { color: #3d6050; font-size: 0.75rem; }
    .badge {
      display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; border-width: 1px; border-style: solid;
    }
    .badge-housing    { background: rgba(212,175,55,0.15); border-color: rgba(212,175,55,0.4); color: #d4af37; }
    .badge-residential{ background: rgba(100,181,246,0.15); border-color: rgba(100,181,246,0.4); color: #90caf9; }
    .badge-maintenance{ background: rgba(239,154,154,0.15); border-color: rgba(239,154,154,0.4); color: #ef9a9a; }
    .badge-emergency  { background: rgba(183,28,28,0.3); border-color: rgba(244,67,54,0.4); color: #ef9a9a; }
    .empty-state { text-align: center; padding: 60px 20px; color: #3d6050; }
    .empty-state .empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.4; }
    @keyframes newRow { from { background: rgba(212,175,55,0.08); } to { background: transparent; } }
    .new-row td { animation: newRow 2s ease-out; }

    /* ── Phone Banner ── */
    .phone-banner {
      background: linear-gradient(90deg, rgba(212,175,55,0.08), rgba(212,175,55,0.04));
      border-bottom: 1px solid rgba(212,175,55,0.15);
      padding: 9px 48px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-size: 0.78rem; color: #7ab89a; letter-spacing: 0.3px;
    }
    .phone-banner strong { color: #d4af37; font-weight: 700; letter-spacing: 0.5px; }

    /* ── Analytics ── */
    .analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 32px; }
    .chart-card {
      background: linear-gradient(145deg, #0d2b22, #0a2019);
      border: 1px solid rgba(255,255,255,0.06); border-radius: 16px;
      padding: 24px; position: relative; overflow: hidden;
    }
    .chart-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #d4af37, #f0d060); }
    .chart-title { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 2px; color: #5a8a74; font-weight: 700; margin-bottom: 20px; }
    .chart-container { position: relative; height: 220px; }

    @media (max-width: 768px) {
      header { padding: 14px 20px; }
      .phone-banner { padding: 8px 20px; font-size: 0.7rem; }
      main { padding: 24px 20px 60px; }
      .kpi-grid, .analytics-grid { grid-template-columns: 1fr; gap: 12px; }
      col.col-notes, col.col-addr { width: 0; display: none; }
    }
    footer {
      text-align: center; padding: 24px 48px 40px; font-size: 0.62rem;
      color: #2a3d35; letter-spacing: 1.5px; text-transform: uppercase;
      border-top: 1px solid rgba(255,255,255,0.04); margin-top: 20px;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">M</div>
      <div style="display:flex;flex-direction:column">
        <div class="brand-name">Front Range AI</div>
        <div class="brand-sub">Intelligent Leasing · Zero Missed Calls</div>
      </div>
    </div>
    <div class="header-right">
      <span class="last-updated" id="lastUpdated">Updating...</span>
      <div class="status-pill"><span class="dot"></span>System Online &nbsp;|&nbsp; 24/7 Coverage Active</div>
    </div>
  </header>
  <div class="phone-banner">
    <span>Callers reach Sarah 24/7 at</span>
    <strong>📞 (970) 221-2323</strong>
    <span>— powered by Vapi Voice AI</span>
  </div>

  <main>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-accent"></div>
        <div class="kpi-icon">🏠</div>
        <div class="kpi-label">Leasing Leads</div>
        <div class="kpi-value" id="leasingLeads">—</div>
        <div class="kpi-sub">housing &amp; residential inquiries</div>
      </div>
      <div class="kpi">
        <div class="kpi-accent"></div>
        <div class="kpi-icon">🔧</div>
        <div class="kpi-label">Maintenance Calls Handled</div>
        <div class="kpi-value" id="maintenanceCalls">—</div>
        <div class="kpi-sub">routed without staff involvement</div>
      </div>
      <div class="kpi">
        <div class="kpi-accent"></div>
        <div class="kpi-icon">💰</div>
        <div class="kpi-label">Estimated Lead Value</div>
        <div class="kpi-value" id="totalValue">—</div>
        <div class="kpi-sub">@ $250 per housing lead</div>
      </div>
      <div class="kpi">
        <div class="kpi-accent"></div>
        <div class="kpi-icon">🌙</div>
        <div class="kpi-label">After-Hours Handled</div>
        <div class="kpi-value" id="afterHours">—</div>
        <div class="kpi-sub">captured outside 9am–5pm</div>
      </div>
    </div>

    <div class="section-header">
      <div class="section-title">Recent Leads</div>
      <div class="section-count" id="leadCount">0 total</div>
    </div>

    <div id="highPriorityBanner" class="hp-banner">
      <span class="hp-banner-dot"></span>
      <span>⚠ <strong id="hpCount">0</strong> High Priority lead(s) require immediate follow-up</span>
    </div>

    <div class="table-wrap">
      <table>
        <colgroup>
          <col class="col-name"/><col class="col-phone"/><col class="col-int"/><col class="col-addr"/><col class="col-notes"/><col class="col-time"/>
        </colgroup>
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Interest</th><th>Address</th><th>Notes</th><th>Time</th></tr>
        </thead>
        <tbody id="leadsBody">
          <tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📋</div><p>Loading leads...</p></div></td></tr>
        </tbody>
      </table>
    </div>

    <div class="section-header" style="margin-top:32px">
      <div class="section-title">Analytics</div>
    </div>

    <div class="analytics-grid">
      <div class="chart-card">
        <div class="chart-title">Lead Breakdown by Type</div>
        <div class="chart-container"><canvas id="donutChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Leads by Day</div>
        <div class="chart-container"><canvas id="barChart"></canvas></div>
      </div>
    </div>
  </main>
  <footer>
    Front Range AI &nbsp;·&nbsp; Fort Collins, CO &nbsp;·&nbsp; outreachfrontrange@gmail.com
  </footer>

  <script>
    let prevCount = 0;
    let donutChart, barChart;

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
      const duration = 800;
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const value = (target * ease);
        el.textContent = (prefix || '') + value.toLocaleString('en-US', { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 }) + (suffix || '');
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function getCategoryColor(label) {
      const t = (label || '').toLowerCase();
      if (t.includes('emergency'))                            return '#ef5350';
      if (t.includes('maintenance'))                          return '#ef9a9a';
      if (t.includes('student') || t.includes('housing'))    return '#d4af37';
      if (t.includes('residential') || t.includes('rental')) return '#90caf9';
      return '#7ab89a';
    }

    function buildDonut(labels, values) {
      const colors = labels.map(getCategoryColor);
      if (donutChart) donutChart.destroy();
      donutChart = new Chart(document.getElementById('donutChart'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { position: 'right', labels: { color: '#7ab89a', font: { size: 11 }, padding: 12, boxWidth: 10 } } }
        }
      });
    }

    function buildBar(labels, values) {
      if (barChart) barChart.destroy();
      barChart = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'Leads', data: values, backgroundColor: 'rgba(212,175,55,0.5)', borderColor: '#d4af37', borderWidth: 1, borderRadius: 4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#5a8a74', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
            y: { ticks: { color: '#5a8a74', font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
          }
        }
      });
    }

    function normalizeType(raw) {
      const t = (raw || '').toLowerCase();
      if (t.includes('emergency'))                            return 'Emergency';
      if (t.includes('maintenance'))                          return 'Maintenance Request';
      if (t.includes('student') || t.includes('housing'))    return 'Student Housing';
      if (t.includes('residential') || t.includes('rental')) return 'Residential Rental';
      return raw;
    }

    function updateCharts(leads) {
      const typeCounts = {};
      leads.forEach(l => {
        const t = normalizeType(l.interest_type);
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      buildDonut(Object.keys(typeCounts), Object.values(typeCounts));

      const today = new Date();
      let daysToShow = 7;
      if (leads.length > 0) {
        const earliest = leads.reduce((min, l) => {
          const d = new Date(l.created_at || l.timestamp);
          return d < min ? d : min;
        }, new Date());
        const daysSince = Math.floor((today - earliest) / 86400000);
        daysToShow = Math.min(14, Math.max(7, daysSince + 2));
      }
      const dayCounts = {};
      for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        dayCounts[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
      }
      leads.forEach(l => {
        const ts = l.timestamp || l.created_at;
        if (!ts) return;
        const key = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (key in dayCounts) dayCounts[key]++;
      });
      buildBar(Object.keys(dayCounts), Object.values(dayCounts));
    }

    async function fetchLeads() {
      try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        const { total, leads } = data;

        const housingLeads = leads.filter(l => {
          const t = (l.interest_type || '').toLowerCase();
          return (t.includes('housing') || t.includes('residential') || t.includes('rental'))
            && !t.includes('maintenance') && !t.includes('emergency');
        });
        const housingValue    = housingLeads.length * 250;
        const leasingCount    = housingLeads.length;
        const maintenanceCount = leads.filter(l => (l.interest_type || '').toLowerCase().includes('maintenance')).length;
        const afterHoursCount = leads.filter(l => {
          const ts = l.created_at || l.timestamp;
          if (!ts) return false;
          const hour = parseInt(new Date(ts).toLocaleString('en-US', { timeZone: 'America/Denver', hour: 'numeric', hour12: false }));
          return hour < 9 || hour >= 17;
        }).length;

        const highPriorityLeads = leads.filter(l => (parseInt(l.priority_level) || 0) > 7);
        const hpBanner = document.getElementById('highPriorityBanner');
        const hpCount  = document.getElementById('hpCount');
        if (highPriorityLeads.length > 0) {
          hpBanner.classList.add('visible');
          hpCount.textContent = highPriorityLeads.length;
        } else {
          hpBanner.classList.remove('visible');
        }

        const isFirstLoad = prevCount === 0;
        setFitValue('totalValue', '$' + housingValue.toLocaleString('en-US', { minimumFractionDigits: 2 }));

        if (isFirstLoad) {
          countUp(document.getElementById('leasingLeads'),     leasingCount,     '', '', 0);
          countUp(document.getElementById('maintenanceCalls'), maintenanceCount, '', '', 0);
          countUp(document.getElementById('afterHours'),       afterHoursCount,  '', '', 0);
        } else {
          document.getElementById('leasingLeads').textContent     = leasingCount;
          document.getElementById('maintenanceCalls').textContent = maintenanceCount;
          document.getElementById('afterHours').textContent       = afterHoursCount;
        }

        document.getElementById('leadCount').textContent   = total + ' total';
        document.getElementById('lastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const tbody  = document.getElementById('leadsBody');
        if (leads.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📋</div><p>No leads yet — waiting for Vapi...</p></div></td></tr>';
        } else {
          const isNew = total > prevCount;
          tbody.innerHTML = leads.map((l, i) => {
            const t = (l.interest_type || '').toLowerCase();
            let badgeClass = 'badge-housing';
            if (t.includes('emergency'))                         badgeClass = 'badge-emergency';
            else if (t.includes('maintenance'))                  badgeClass = 'badge-maintenance';
            else if (t.includes('residential') || t.includes('rental')) badgeClass = 'badge-residential';

            const priority     = parseInt(l.priority_level) || 0;
            const hpBadge      = priority > 7 ? '<span class="priority-badge">P' + priority + '</span>' : '';
            const rowClass     = (isNew && i === 0) ? 'new-row' : '';
            const notes        = l.notes || '—';
            const address      = l.property_address || '—';
            const ts           = l.created_at
              ? new Date(l.created_at).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '—';

            return '<tr class="' + rowClass + '">' +
              '<td class="name-cell" title="' + (l.customer_name || '') + '">' + (l.customer_name || '') + hpBadge + '</td>' +
              '<td class="phone-cell">' + (l.customer_phone || '') + '</td>' +
              '<td><span class="badge ' + badgeClass + '" title="' + (l.interest_type || '') + '">' + (l.interest_type || '') + '</span></td>' +
              '<td class="addr-cell" title="' + address + '">' + address + '</td>' +
              '<td class="notes-cell" title="' + notes + '">' + notes + '</td>' +
              '<td class="ts">' + ts + '</td>' +
            '</tr>';
          }).join('');
        }

        updateCharts([...leads].reverse());
        prevCount = total;
      } catch (e) {
        console.error('Failed to fetch leads:', e);
      }
    }

    fetchLeads();
    setInterval(fetchLeads, 10000);
  </script>
</body>
</html>`);
});

function sendToMakeCom(data) {
  console.log("Data sent to Cannon's Webhook", data);
}

app.post('/vapi-webhook', async (req, res) => {
  const msg     = req.body.message;
  const msgType = msg?.type;

  console.log('Vapi event received:', msgType || 'direct');

  let customer_name, customer_phone, interest_type, notes, priority_level, property_address;

  // ── Primary: end-of-call-report → structuredData ──
  if (msgType === 'end-of-call-report') {
    const structured = msg?.analysis?.structuredData;
    if (structured?.customer_name && structured?.customer_phone && structured?.interest_type) {
      customer_name    = structured.customer_name;
      customer_phone   = structured.customer_phone;
      interest_type    = structured.interest_type;
      notes            = structured.notes            || '';
      priority_level   = structured.priority_level;
      property_address = structured.property_address || '';
      console.log('Lead from structuredData:', { customer_name, customer_phone, interest_type, priority_level, property_address });
    } else {
      console.log('end-of-call-report: no structuredData present.');
      return res.status(200).json({ received: true });
    }

  // ── Fallback: tool-calls ──
  } else if (msgType === 'tool-calls' && msg.toolCallList) {
    const args   = msg.toolCallList[0]?.function?.arguments;
    const params = typeof args === 'string' ? JSON.parse(args) : args;
    customer_name    = params?.customer_name;
    customer_phone   = params?.customer_phone;
    interest_type    = params?.interest_type;
    notes            = params?.notes            || '';
    priority_level   = params?.priority_level;
    property_address = params?.property_address || '';
    console.log('Lead from tool-calls:', { customer_name, customer_phone, interest_type, priority_level, property_address });

  } else if (msgType === 'function-call' && msg.functionCall) {
    const params     = msg.functionCall.parameters;
    customer_name    = params?.customer_name;
    customer_phone   = params?.customer_phone;
    interest_type    = params?.interest_type;
    notes            = params?.notes            || '';
    priority_level   = params?.priority_level;
    property_address = params?.property_address || '';

  // ── Manual / direct POST ──
  } else if (!msgType) {
    customer_name    = req.body.customer_name;
    customer_phone   = req.body.customer_phone;
    interest_type    = req.body.interest_type;
    notes            = req.body.notes            || '';
    priority_level   = req.body.priority_level;
    property_address = req.body.property_address || '';

  } else {
    return res.status(200).json({ received: true });
  }

  if (!customer_name || !customer_phone || !interest_type) {
    return res.status(400).json({ error: 'Missing required fields: customer_name, customer_phone, interest_type' });
  }

  // Normalize phone → XXX-XXX-XXXX
  const digits = customer_phone.replace(/\D/g, '').replace(/^1(\d{10})$/, '$1');
  if (digits.length === 10) {
    customer_phone = digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
  }

  const isEmergency = interest_type.toLowerCase().includes('emergency');

  // Normalize interest_type
  const t = interest_type.toLowerCase();
  let normalizedType = interest_type;
  if (isEmergency)                                              normalizedType = 'Emergency';
  else if (t.includes('maintenance'))                           normalizedType = 'Maintenance Request';
  else if (t.includes('student') || t.includes('housing'))     normalizedType = 'Student Housing';
  else if (t.includes('residential') || t.includes('rental'))  normalizedType = 'Residential Rental';

  const normalizedPriority = isEmergency ? 10 : (parseInt(priority_level) || 5);

  const leadData = {
    customer_name,
    customer_phone,
    interest_type:    normalizedType,
    notes:            isEmergency ? (notes || 'EMERGENCY — directed to 970-221-2323') : notes,
    priority_level:   normalizedPriority,
    property_address: property_address || '',
  };

  const { error } = await supabase.from('leads').insert([leadData]);
  if (error) console.error('Supabase insert error:', error.message);

  sendToMakeCom(leadData);

  if (isEmergency) {
    return res.status(200).json({ message: 'Directing to Emergency Line: 970-221-2323' });
  }

  return res.status(200).json({ message: 'Lead received', lead: leadData });
});

app.listen(PORT, () => {
  console.log(`Front Range AI is Live on port ${PORT}`);
});
