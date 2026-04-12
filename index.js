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

app.get('/', (req, res) => {
  const leads = loadLeads();
  const total = leads.length;
  const savings = (total * 45).toLocaleString('en-US', { minimumFractionDigits: 2 });

  const rows = leads.slice().reverse().map(l => `
    <tr>
      <td>${l.customer_name}</td>
      <td>${l.customer_phone}</td>
      <td><span class="badge">${l.interest_type}</span></td>
      <td class="ts">${l.timestamp}</td>
    </tr>`).join('') ||
    `<tr><td colspan="4" class="empty">No leads yet — waiting for Vapi...</td></tr>`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MnP AI Pilot Dashboard</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0a1a14;
      color: #e8e8e8;
      min-height: 100vh;
      padding: 0 0 60px;
    }
    /* Header */
    header {
      background: #004d40;
      border-bottom: 2px solid #d4af37;
      padding: 20px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand { display: flex; flex-direction: column; }
    .brand-name {
      font-size: 1.5rem;
      font-weight: 800;
      color: #d4af37;
      letter-spacing: 0.5px;
    }
    .brand-sub {
      font-size: 0.75rem;
      color: #a5d6a7;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .status-pill {
      background: #1b5e20;
      border: 1px solid #4caf50;
      color: #a5d6a7;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dot { width: 7px; height: 7px; background: #4caf50; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      padding: 36px 40px 0;
      max-width: 1100px;
      margin: 0 auto;
    }
    .kpi {
      background: #0d2b22;
      border: 1px solid #1a4a38;
      border-radius: 12px;
      padding: 28px 28px 24px;
      position: relative;
      overflow: hidden;
    }
    .kpi::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: #d4af37;
    }
    .kpi-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #80cbc4;
      margin-bottom: 14px;
    }
    .kpi-value {
      font-size: 2.8rem;
      font-weight: 800;
      color: #d4af37;
      line-height: 1;
    }
    .kpi-sub {
      font-size: 0.8rem;
      color: #607d6e;
      margin-top: 8px;
    }
    .kpi-status-value {
      font-size: 1rem;
      font-weight: 700;
      color: #a5d6a7;
      line-height: 1.5;
    }

    /* Lead Table */
    .table-section {
      max-width: 1100px;
      margin: 32px auto 0;
      padding: 0 40px;
    }
    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .table-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #80cbc4;
      font-weight: 600;
    }
    .table-count {
      font-size: 0.75rem;
      color: #607d6e;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #0d2b22;
      border: 1px solid #1a4a38;
      border-radius: 12px;
      overflow: hidden;
    }
    thead tr { background: #004d40; }
    th {
      padding: 14px 20px;
      text-align: left;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #d4af37;
      font-weight: 600;
    }
    td {
      padding: 14px 20px;
      font-size: 0.875rem;
      color: #cfd8dc;
      border-top: 1px solid #1a4a38;
    }
    tr:hover td { background: #112d22; }
    .badge {
      background: #1a4a38;
      border: 1px solid #2e7d52;
      color: #a5d6a7;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .ts { color: #607d6e; font-size: 0.8rem; }
    .empty { text-align: center; color: #607d6e; padding: 40px; font-size: 0.875rem; }

    @media (max-width: 700px) {
      .kpi-grid { grid-template-columns: 1fr; padding: 24px 20px 0; }
      header { padding: 16px 20px; }
      .table-section { padding: 0 20px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-name">Mountain-n-Plains</div>
      <div class="brand-sub">AI Pilot Command Center</div>
    </div>
    <div class="status-pill">
      <span class="dot"></span>
      System Online &nbsp;|&nbsp; 24/7 Weekend Coverage Active
    </div>
  </header>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Total Leads Captured</div>
      <div class="kpi-value">${total}</div>
      <div class="kpi-sub">via Vapi voice AI</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Current Status</div>
      <div class="kpi-status-value">System Online<br/>24/7 Weekend Coverage Active</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Estimated Lead Value</div>
      <div class="kpi-value">$${savings}</div>
      <div class="kpi-sub">@ $45 per qualified lead</div>
    </div>
  </div>

  <div class="table-section">
    <div class="table-header">
      <div class="table-title">Recent Leads</div>
      <div class="table-count">${total} total</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Interest</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
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

  console.log('Vapi event received:', msgType || 'direct', JSON.stringify(req.body, null, 2));

  // Ignore Vapi system events — just acknowledge them
  if (msgType && !['tool-calls', 'function-call'].includes(msgType)) {
    return res.status(200).json({ received: true });
  }

  let customer_name, customer_phone, interest_type;

  // Handle Vapi's tool-call format
  if (msgType === 'tool-calls' && msg.toolCallList) {
    const args = msg.toolCallList[0]?.function?.arguments;
    const params = typeof args === 'string' ? JSON.parse(args) : args;
    customer_name = params?.customer_name;
    customer_phone = params?.customer_phone;
    interest_type  = params?.interest_type;
  } else if (msgType === 'function-call' && msg.functionCall) {
    const params = msg.functionCall.parameters;
    customer_name = params?.customer_name;
    customer_phone = params?.customer_phone;
    interest_type  = params?.interest_type;
  } else {
    // Direct format (manual tests)
    customer_name = req.body.customer_name;
    customer_phone = req.body.customer_phone;
    interest_type  = req.body.interest_type;
  }

  if (!customer_name || !customer_phone || !interest_type) {
    return res.status(400).json({ error: 'Missing required fields: customer_name, customer_phone, interest_type' });
  }

  if (interest_type.toLowerCase().includes('emergency')) {
    return res.status(200).json({
      message: 'Directing to MnP Emergency Line: 970-221-2323'
    });
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

  return res.status(200).json({
    message: 'Lead received',
    lead: { customer_name, customer_phone, interest_type }
  });
});

app.listen(PORT, () => {
  console.log(`Mountain-n-Plains AI Pilot is Live on port ${PORT}`);
});
