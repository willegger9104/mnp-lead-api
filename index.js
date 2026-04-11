const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Mountain-n-Plains Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #f0f4f8;
      color: #1a202c;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px;
    }
    .logo {
      font-size: 2rem;
      font-weight: 800;
      color: #2b6cb0;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .tagline {
      font-size: 0.9rem;
      color: #718096;
      margin-bottom: 48px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 32px 40px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      margin-bottom: 24px;
    }
    .card h2 {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #718096;
      margin-bottom: 12px;
    }
    .counter {
      font-size: 4rem;
      font-weight: 800;
      color: #2b6cb0;
      line-height: 1;
    }
    .counter-label {
      font-size: 1rem;
      color: #4a5568;
      margin-top: 8px;
    }
    .savings {
      font-size: 1.8rem;
      font-weight: 700;
      color: #276749;
    }
    .savings-label {
      font-size: 0.95rem;
      color: #4a5568;
      margin-top: 6px;
    }
    .status {
      font-size: 0.8rem;
      color: #48bb78;
      margin-top: 32px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="logo">Mountain-n-Plains</div>
  <div class="tagline">AI Pilot Dashboard</div>

  <div class="card">
    <h2>Leads Captured This Week</h2>
    <div class="counter">0</div>
    <div class="counter-label">leads received via voice AI</div>
  </div>

  <div class="card">
    <h2>Efficiency Report</h2>
    <div class="savings">$142.50<span style="font-size:1rem;font-weight:400">/weekend</span></div>
    <div class="savings-label">Estimated Payroll Savings</div>
  </div>

  <div class="status">&#9679; AI Pilot is Live</div>
</body>
</html>`);
});

// --- Dummy function for Cannon's Make.com webhook (URL to be added later) ---
function sendToMakeCom(data) {
  console.log("Data sent to Cannon's Webhook", data);
}

// --- Vapi Lead Intake Webhook ---
app.post('/vapi-webhook', (req, res) => {
  const { customer_name, customer_phone, interest_type } = req.body;

  if (!customer_name || !customer_phone || !interest_type) {
    return res.status(400).json({ error: 'Missing required fields: customer_name, customer_phone, interest_type' });
  }

  // Triage: Emergency check
  if (interest_type.toLowerCase().includes('emergency')) {
    return res.status(200).json({
      message: 'Directing to MnP Emergency Line: 970-221-2323'
    });
  }

  // Send lead data to Cannon's webhook
  sendToMakeCom({ customer_name, customer_phone, interest_type });

  return res.status(200).json({
    message: 'Lead received',
    lead: { customer_name, customer_phone, interest_type }
  });
});

app.listen(PORT, () => {
  console.log(`Mountain-n-Plains AI Pilot is Live on port ${PORT}`);
});
