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
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #060f0b;
      color: #e2e8e4;
      min-height: 100vh;
    }

    /* ── Header ── */
    header {
      background: linear-gradient(135deg, #003d32 0%, #004d40 100%);
      border-bottom: 1px solid rgba(212,175,55,0.3);
      padding: 18px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(10px);
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-icon {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #d4af37, #f0d060);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem;
    }
    .brand-text { display: flex; flex-direction: column; }
    .brand-name { font-size: 1.1rem; font-weight: 800; color: #d4af37; letter-spacing: 0.3px; }
    .brand-sub { font-size: 0.65rem; color: #7ab89a; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 1px; }

    .header-right { display: flex; align-items: center; gap: 16px; }
    .status-pill {
      background: rgba(27,94,32,0.6);
      border: 1px solid rgba(76,175,80,0.4);
      color: #81c784;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      display: flex; align-items: center; gap: 7px;
      letter-spacing: 0.3px;
    }
    .dot {
      width: 6px; height: 6px;
      background: #4caf50;
      border-radius: 50%;
      box-shadow: 0 0 6px #4caf50;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }

    .last-updated { font-size: 0.68rem; color: #4a7060; }

    /* ── Main ── */
    main { max-width: 1140px; margin: 0 auto; padding: 36px 48px 80px; }

    /* ── KPI Grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      margin-bottom: 32px;
    }
    .kpi {
      background: linear-gradient(145deg, #0d2b22, #0a2019);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 28px 28px 24px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }
    .kpi:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.2); }
    .kpi-accent {
      position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, #d4af37, #f0d060);
      border-radius: 16px 16px 0 0;
    }
    .kpi-icon {
      font-size: 1.4rem; margin-bottom: 16px;
      display: inline-block;
      background: rgba(212,175,55,0.1);
      padding: 8px; border-radius: 10px;
    }
    .kpi-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #5a8a74;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .kpi-value {
      font-size: 3rem;
      font-weight: 800;
      color: #d4af37;
      line-height: 1;
      letter-spacing: -1px;
    }
    .kpi-sub { font-size: 0.75rem; color: #3d6050; margin-top: 8px; }
    .kpi-status-value {
      font-size: 0.95rem;
      font-weight: 600;
      color: #81c784;
      line-height: 1.6;
    }

    /* ── Section Header ── */
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      color: #5a8a74;
      font-weight: 700;
    }
    .section-count {
      background: rgba(212,175,55,0.1);
      border: 1px solid rgba(212,175,55,0.2);
      color: #d4af37;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    /* ── Table ── */
    .table-wrap {
      background: linear-gradient(145deg, #0d2b22, #0a2019);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead tr {
      background: linear-gradient(90deg, #003d32, #004d40);
      border-bottom: 1px solid rgba(212,175,55,0.15);
    }
    th {
      padding: 14px 22px;
      text-align: left;
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #d4af37;
      font-weight: 700;
    }
    td {
      padding: 15px 22px;
      font-size: 0.85rem;
      color: #b0c4bb;
      border-top: 1px solid rgba(255,255,255,0.04);
    }
    tr:hover td { background: rgba(255,255,255,0.02); }

    .badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(0,77,64,0.5);
      border: 1px solid rgba(0,150,136,0.3);
      color: #80cbc4;
      padding: 3px 11px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 500;
    }
    .badge.emergency {
      background: rgba(183,28,28,0.3);
      border-color: rgba(244,67,54,0.4);
      color: #ef9a9a;
    }
    .name-cell { font-weight: 600; color: #d4e8de; }
    .phone-cell { font-family: monospace; font-size: 0.82rem; color: #7ab89a; }
    .ts { color: #3d6050; font-size: 0.75rem; }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #3d6050;
    }
    .empty-state .empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.4; }
    .empty-state p { font-size: 0.85rem; }

    /* ── New lead flash animation ── */
    @keyframes newRow { from { background: rgba(212,175,55,0.08); } to { background: transparent; } }
    .new-row td { animation: newRow 2s ease-out; }

    @media (max-width: 768px) {
      header { padding: 14px 20px; }
      main { padding: 24px 20px 60px; }
      .kpi-grid { grid-template-columns: 1fr; gap: 12px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">🏔</div>
      <div class="brand-text">
        <div class="brand-name">Mountain-n-Plains</div>
        <div class="brand-sub">AI Pilot Command Center</div>
      </div>
    </div>
    <div class="header-right">
      <span class="last-updated" id="lastUpdated">Updating...</span>
      <div class="status-pill">
        <span class="dot"></span>
        System Online &nbsp;|&nbsp; 24/7 Coverage Active
      </div>
    </div>
  </header>

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
        <div class="kpi-icon">🟢</div>
        <div class="kpi-label">Current Status</div>
        <div class="kpi-status-value">System Online<br/>24/7 Weekend Coverage Active</div>
      </div>
      <div class="kpi">
        <div class="kpi-accent"></div>
        <div class="kpi-icon">💰</div>
        <div class="kpi-label">Estimated Lead Value</div>
        <div class="kpi-value" id="totalValue">—</div>
        <div class="kpi-sub">@ $45 per qualified lead</div>
      </div>
    </div>

    <div class="section-header">
      <div class="section-title">Recent Leads</div>
      <div class="section-count" id="leadCount">0 total</div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Interest</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody id="leadsBody">
          <tr><td colspan="4">
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <p>Loading leads...</p>
            </div>
          </td></tr>
        </tbody>
      </table>
    </div>
  </main>

  <script>
    let prevCount = 0;

    async function fetchLeads() {
      try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        const { total, leads } = data;

        document.getElementById('totalLeads').textContent = total;
        document.getElementById('totalValue').textContent = '$' + (total * 45).toLocaleString('en-US', { minimumFractionDigits: 2 });
        document.getElementById('leadCount').textContent = total + ' total';

        const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        document.getElementById('lastUpdated').textContent = 'Updated ' + now;

        const tbody = document.getElementById('leadsBody');
        if (leads.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">📋</div><p>No leads yet — waiting for Vapi...</p></div></td></tr>';
        } else {
          const isNew = total > prevCount;
          tbody.innerHTML = leads.map((l, i) => {
            const isEmergency = l.interest_type?.toLowerCase().includes('emergency');
            const rowClass = (isNew && i === 0) ? 'new-row' : '';
            return '<tr class="' + rowClass + '">' +
              '<td class="name-cell">' + l.customer_name + '</td>' +
              '<td class="phone-cell">' + l.customer_phone + '</td>' +
              '<td><span class="badge' + (isEmergency ? ' emergency' : '') + '">' + l.interest_type + '</span></td>' +
              '<td class="ts">' + (l.timestamp || l.created_at || '—') + '</td>' +
            '</tr>';
          }).join('');
        }
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

  let customer_name, customer_phone, interest_type;

  // ── Method 1: End-of-call-report with structured data (most reliable) ──
  if (msgType === 'end-of-call-report') {
    const structured = msg?.analysis?.structuredData;
    if (structured?.customer_name && structured?.customer_phone && structured?.interest_type) {
      customer_name = structured.customer_name;
      customer_phone = structured.customer_phone;
      interest_type  = structured.interest_type;
      console.log('Lead from structured data:', { customer_name, customer_phone, interest_type });
    } else {
      console.log('End-of-call-report received but no structured data yet.');
      return res.status(200).json({ received: true });
    }

  // ── Method 2: Tool call (backup) ──
  } else if (msgType === 'tool-calls' && msg.toolCallList) {
    console.log('FULL TOOL CALL BODY:', JSON.stringify(req.body, null, 2));
    const args = msg.toolCallList[0]?.function?.arguments;
    const params = typeof args === 'string' ? JSON.parse(args) : args;
    customer_name = params?.customer_name;
    customer_phone = params?.customer_phone;
    interest_type  = params?.interest_type;
    console.log('Lead from tool-call:', { customer_name, customer_phone, interest_type });

  } else if (msgType === 'function-call' && msg.functionCall) {
    const params = msg.functionCall.parameters;
    customer_name = params?.customer_name;
    customer_phone = params?.customer_phone;
    interest_type  = params?.interest_type;

  // ── Method 3: Direct POST (manual tests) ──
  } else if (!msgType) {
    customer_name = req.body.customer_name;
    customer_phone = req.body.customer_phone;
    interest_type  = req.body.interest_type;

  } else {
    // All other Vapi events — just acknowledge
    return res.status(200).json({ received: true });
  }

  if (!customer_name || !customer_phone || !interest_type) {
    return res.status(400).json({ error: 'Missing required fields: customer_name, customer_phone, interest_type' });
  }

  if (interest_type.toLowerCase().includes('emergency')) {
    return res.status(200).json({ message: 'Directing to MnP Emergency Line: 970-221-2323' });
  }

  const leads = loadLeads();
  leads.push({
    customer_name,
    customer_phone,
    interest_type,
    timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })
  });
  saveLeads(leads);
  sendToMakeCom({ customer_name, customer_phone, interest_type });

  return res.status(200).json({ message: 'Lead received', lead: { customer_name, customer_phone, interest_type } });
});

app.listen(PORT, () => {
  console.log(`Mountain-n-Plains AI Pilot is Live on port ${PORT}`);
});
