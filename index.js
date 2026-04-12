const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const LEADS_FILE = path.join(__dirname, 'leads.json');

app.use(express.json());

function loadLeads() {
  if (!fs.existsSync(LEADS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); }
  catch { return []; }
}

function saveLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

// --- API endpoint for dashboard to fetch leads as JSON ---
app.get('/api/leads', (req, res) => {
  const leads = loadLeads();
  res.json({ total: leads.length, leads: leads.slice().reverse() });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MnP AI Pilot Dashboard</title>
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
      border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
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
    main { max-width: 1140px; margin: 0 auto; padding: 36px 48px 80px; }

    /* ── KPI Grid ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 32px; }
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
    .kpi-status-value { font-size: 0.95rem; font-weight: 600; color: #81c784; line-height: 1.6; }

    /* ── Section Header ── */
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .section-title { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 2.5px; color: #5a8a74; font-weight: 700; }
    .section-count { background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.2); color: #d4af37; padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }

    /* ── Table ── */
    .table-wrap { background: linear-gradient(145deg, #0d2b22, #0a2019); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    col.col-name   { width: 16%; }
    col.col-phone  { width: 14%; }
    col.col-int    { width: 18%; }
    col.col-notes  { width: 34%; }
    col.col-time   { width: 18%; }
    thead tr { background: linear-gradient(90deg, #003d32, #004d40); border-bottom: 1px solid rgba(212,175,55,0.15); }
    th { padding: 14px 16px; text-align: left; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 2px; color: #d4af37; font-weight: 700; }
    td { padding: 14px 16px; font-size: 0.83rem; color: #b0c4bb; border-top: 1px solid rgba(255,255,255,0.04); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 0; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .name-cell { font-weight: 600; color: #d4e8de; }
    .phone-cell { font-family: monospace; font-size: 0.8rem; color: #7ab89a; }
    .notes-cell { color: #607d6e; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: default; }
    .ts { color: #3d6050; font-size: 0.75rem; }
    .badge {
      display: inline-block; background: rgba(0,77,64,0.5); border: 1px solid rgba(0,150,136,0.3);
      color: #80cbc4; padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
    }
    .badge.emergency { background: rgba(183,28,28,0.3); border-color: rgba(244,67,54,0.4); color: #ef9a9a; }
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

    /* ── Count-up animation ── */
    .kpi-value { transition: color 0.3s; }

    @media (max-width: 768px) {
      header { padding: 14px 20px; }
      .phone-banner { padding: 8px 20px; font-size: 0.7rem; }
      main { padding: 24px 20px 60px; }
      .kpi-grid, .analytics-grid { grid-template-columns: 1fr; gap: 12px; }
      col.col-notes { width: 0; display: none; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon" style="font-size:1.3rem;font-weight:900;color:#003d32;letter-spacing:-1px">M</div>
      <div style="display:flex;flex-direction:column">
        <div class="brand-name">Mountain-n-Plains</div>
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
        <div class="kpi-icon">📞</div>
        <div class="kpi-label">Total Leads Captured</div>
        <div class="kpi-value" id="totalLeads">—</div>
        <div class="kpi-sub">via Sarah voice AI</div>
      </div>
      <div class="kpi">
        <div class="kpi-accent"></div>
        <div class="kpi-icon">⏱</div>
        <div class="kpi-label">Est. Staff Hours Saved</div>
        <div class="kpi-value" id="hoursSaved">—</div>
        <div class="kpi-sub">@ 15 min per lead handled</div>
      </div>
      <div class="kpi">
        <div class="kpi-accent"></div>
        <div class="kpi-icon">💰</div>
        <div class="kpi-label">Estimated Lead Value</div>
        <div class="kpi-value" id="totalValue">—</div>
        <div class="kpi-sub">@ $250 per housing lead</div>
      </div>
    </div>

    <div class="section-header">
      <div class="section-title">Recent Leads</div>
      <div class="section-count" id="leadCount">0 total</div>
    </div>

    <div class="table-wrap">
      <table>
        <colgroup>
          <col class="col-name"/><col class="col-phone"/><col class="col-int"/><col class="col-notes"/><col class="col-time"/>
        </colgroup>
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Interest</th><th>Notes</th><th>Time</th></tr>
        </thead>
        <tbody id="leadsBody">
          <tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📋</div><p>Loading leads...</p></div></td></tr>
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

  <script>
    let prevCount = 0;
    let donutChart, barChart;

    function countUp(el, target, prefix, suffix, decimals) {
      const duration = 800;
      const start = performance.now();
      const from = 0;
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const value = from + (target - from) * ease;
        el.textContent = (prefix || '') + value.toLocaleString('en-US', { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 }) + (suffix || '');
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function buildDonut(labels, values) {
      const colors = ['#d4af37','#80cbc4','#ef9a9a','#a5d6a7','#7986cb','#ffb74d'];
      if (donutChart) donutChart.destroy();
      donutChart = new Chart(document.getElementById('donutChart'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'right', labels: { color: '#7ab89a', font: { size: 11 }, padding: 12, boxWidth: 10 } }
          }
        }
      });
    }

    function buildBar(labels, values) {
      if (barChart) barChart.destroy();
      barChart = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Leads',
            data: values,
            backgroundColor: 'rgba(212,175,55,0.5)',
            borderColor: '#d4af37',
            borderWidth: 1,
            borderRadius: 4,
          }]
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

    function updateCharts(leads) {
      // Donut — interest type breakdown
      const typeCounts = {};
      leads.forEach(l => {
        const t = l.interest_type || 'Unknown';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      buildDonut(Object.keys(typeCounts), Object.values(typeCounts));

      // Bar — leads by day (last 7 days)
      const dayCounts = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayCounts[key] = 0;
      }
      leads.forEach(l => {
        const ts = l.timestamp || l.created_at;
        if (!ts) return;
        const d = new Date(ts);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (key in dayCounts) dayCounts[key]++;
      });
      buildBar(Object.keys(dayCounts), Object.values(dayCounts));
    }

    async function fetchLeads() {
      try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        const { total, leads } = data;

        // Only count housing leads for value (exclude maintenance & emergency)
        const housingLeads = leads.filter(l => {
          const t = (l.interest_type || '').toLowerCase();
          return (t.includes('housing') || t.includes('residential') || t.includes('rental'))
            && !t.includes('maintenance') && !t.includes('emergency');
        });
        const housingValue = housingLeads.length * 250;

        const hoursSaved = (total * 15) / 60;
        const isFirstLoad = prevCount === 0;

        if (isFirstLoad) {
          countUp(document.getElementById('totalLeads'), total, '', '', 0);
          countUp(document.getElementById('totalValue'), housingValue, '$', '', 2);
          countUp(document.getElementById('hoursSaved'), hoursSaved, '', ' hrs', 1);
        } else {
          document.getElementById('totalLeads').textContent = total;
          document.getElementById('totalValue').textContent = '$' + housingValue.toLocaleString('en-US', { minimumFractionDigits: 2 });
          document.getElementById('hoursSaved').textContent = hoursSaved.toFixed(1) + ' hrs';
        }

        document.getElementById('leadCount').textContent = total + ' total';
        const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        document.getElementById('lastUpdated').textContent = 'Updated ' + now;

        const tbody = document.getElementById('leadsBody');
        if (leads.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📋</div><p>No leads yet — waiting for Vapi...</p></div></td></tr>';
        } else {
          const isNew = total > prevCount;
          tbody.innerHTML = leads.map((l, i) => {
            const isEmergency = l.interest_type?.toLowerCase().includes('emergency');
            const rowClass = (isNew && i === 0) ? 'new-row' : '';
            const notes = l.notes || '—';
            return '<tr class="' + rowClass + '">' +
              '<td class="name-cell" title="' + l.customer_name + '">' + l.customer_name + '</td>' +
              '<td class="phone-cell">' + l.customer_phone + '</td>' +
              '<td><span class="badge' + (isEmergency ? ' emergency' : '') + '" title="' + l.interest_type + '">' + l.interest_type + '</span></td>' +
              '<td class="notes-cell" title="' + notes + '">' + notes + '</td>' +
              '<td class="ts">' + (l.timestamp || l.created_at || '—') + '</td>' +
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

// --- Dummy function for Cannon's Make.com webhook (URL to be added later) ---
function sendToMakeCom(data) {
  console.log("Data sent to Cannon's Webhook", data);
}

// --- Vapi Lead Intake Webhook ---
app.post('/vapi-webhook', (req, res) => {
  const msg = req.body.message;
  const msgType = msg?.type;

  console.log('Vapi event received:', msgType || 'direct');

  let customer_name, customer_phone, interest_type, notes;

  // ── Method 1: End-of-call-report with structured data (most reliable) ──
  if (msgType === 'end-of-call-report') {
    const structured = msg?.analysis?.structuredData;
    if (structured?.customer_name && structured?.customer_phone && structured?.interest_type) {
      customer_name = structured.customer_name;
      customer_phone = structured.customer_phone;
      interest_type  = structured.interest_type;
      notes          = structured.notes || '';
      console.log('Lead from structured data:', { customer_name, customer_phone, interest_type, notes });
    } else {
      console.log('End-of-call-report received but no structured data yet.');
      return res.status(200).json({ received: true });
    }

  // ── Method 2: Tool call ──
  } else if (msgType === 'tool-calls' && msg.toolCallList) {
    const toolCall = msg.toolCallList[0];
    const args = toolCall?.function?.arguments;
    const params = typeof args === 'string' ? JSON.parse(args) : args;
    customer_name = params?.customer_name;
    customer_phone = params?.customer_phone;
    interest_type  = params?.interest_type;
    notes          = params?.notes || '';
    console.log('Lead from tool-call:', { customer_name, customer_phone, interest_type, notes });

  } else if (msgType === 'function-call' && msg.functionCall) {
    const params = msg.functionCall.parameters;
    customer_name = params?.customer_name;
    customer_phone = params?.customer_phone;
    interest_type  = params?.interest_type;
    notes          = params?.notes || '';

  // ── Method 3: Direct POST (manual tests) ──
  } else if (!msgType) {
    customer_name = req.body.customer_name;
    customer_phone = req.body.customer_phone;
    interest_type  = req.body.interest_type;
    notes          = req.body.notes || '';

  } else {
    return res.status(200).json({ received: true });
  }

  if (!customer_name || !customer_phone || !interest_type) {
    return res.status(400).json({ error: 'Missing required fields: customer_name, customer_phone, interest_type' });
  }

  // Emergency check — save the lead AND return emergency number
  if (interest_type.toLowerCase().includes('emergency')) {
    const leads = loadLeads();
    leads.push({
      customer_name,
      customer_phone,
      interest_type,
      notes: notes || 'EMERGENCY — directed to 970-221-2323',
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })
    });
    saveLeads(leads);
    return res.status(200).json({ message: 'Directing to MnP Emergency Line: 970-221-2323' });
  }

  const leads = loadLeads();
  leads.push({
    customer_name,
    customer_phone,
    interest_type,
    notes,
    timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })
  });
  saveLeads(leads);
  sendToMakeCom({ customer_name, customer_phone, interest_type });

  return res.status(200).json({ message: 'Lead received', lead: { customer_name, customer_phone, interest_type } });
});

app.listen(PORT, () => {
  console.log(`Mountain-n-Plains AI Pilot is Live on port ${PORT}`);
});
