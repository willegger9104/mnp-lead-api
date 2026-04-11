const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Mountain-n-Plains AI Pilot is Live');
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
