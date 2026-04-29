require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fs     = require('fs');
const path   = require('path');
const axios  = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const twilio = require('twilio');
let twilioClient = null;
try {
  if (process.env.TWILIO_SID?.startsWith('AC') && process.env.TWILIO_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    console.log('[alert] Twilio client initialized');
  } else {
    console.log('[alert] Twilio env vars missing or invalid — SMS disabled');
  }
} catch (e) {
  console.log('[alert] Twilio init failed, SMS disabled:', e.message);
}

async function sendEmergencyAlert(lead) {
  if (!twilioClient || !process.env.ALERT_PHONE || !process.env.TWILIO_FROM) {
    console.log('[alert] Twilio not configured — triggering Make.com fallback.');
    await fireEmergencyFallback(lead, 'Twilio not configured');
    return;
  }
  try {
    const body =
      `🚨 EMERGENCY LEAD — ${lead.customer_name}\n` +
      `Phone: ${lead.customer_phone}\n` +
      `Address: ${lead.property_address || 'not provided'}\n` +
      `Notes: ${lead.notes || 'none'}`;
    await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_FROM,
      to: process.env.ALERT_PHONE,
    });
    console.log('[alert] Emergency SMS dispatched to', process.env.ALERT_PHONE);
  } catch (e) {
    console.error('[alert] Twilio send failed:', e.message);
    console.warn('[alert] Twilio error — triggering Make.com fallback.');
    await fireEmergencyFallback(lead, e.message);
  }
}

app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

// ── Vapi webhook signature validation (L-3) ──────────────────────────────────
function validateVapiSignature(req) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return true; // no secret set — allow (configure in prod)
  const sig = req.headers['x-vapi-signature'];
  if (!sig) return false;
  const expected = crypto.createHmac('sha256', secret)
    .update(req.rawBody || '')
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig,      'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    return false; // length mismatch = tampered or wrong secret
  }
}

// ── Emergency SMS fallback → Make.com (S-2) ──────────────────────────────────
async function fireEmergencyFallback(lead, reason) {
  console.warn('[alert] SMS fallback triggered — reason:', reason, '| phone:', lead.customer_phone);
  const url = process.env.MAKE_EMERGENCY_WEBHOOK_URL || process.env.MAKE_WEBHOOK_URL;
  if (!url) {
    console.error('[alert] No fallback URL configured — emergency alert completely undelivered!');
    return;
  }
  try {
    await axios.post(url, {
      alert_type:     'emergency_sms_failed',
      failure_reason: reason,
      customer_name:  lead.customer_name,
      customer_phone: lead.customer_phone,
      notes:          lead.notes,
      priority_level: lead.priority_level,
    }, { timeout: 5000 });
    console.log('[alert] Emergency fallback webhook fired to Make.com.');
  } catch (e) {
    console.error('[alert] Emergency fallback webhook also failed:', e.message);
  }
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (process.env.DASHBOARD_API_KEY && key === process.env.DASHBOARD_API_KEY) {
    return next();
  }
  const isHtml = req.accepts('html') && !req.headers['x-api-key'];
  if (isHtml) return res.status(401).send('401 Unauthorized — provide a valid api_key query parameter.');
  return res.status(401).json({ error: 'Unauthorized' });
}

// ── Recovery log (last-resort local fallback) ──────────────────────────────────
async function writeRecoveryLog(leadData) {
  const dataDir = path.join(__dirname, 'data');
  const logPath = path.join(dataDir, 'recovery_log.json');
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch (_) {}
  fs.mkdirSync(dataDir, { recursive: true });
  existing.push({ ...leadData, recovery_at: new Date().toISOString() });
  fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
  console.error('[recovery] Lead written to data/recovery_log.json — all DB paths failed.');
}

// ── Supabase error_logs fallback ───────────────────────────────────────────────
async function logToSupabaseErrorTable(leadData, insertError) {
  try {
    const { error } = await supabase.from('error_logs').insert([{
      raw_lead:      JSON.stringify(leadData),
      error_message: insertError.message,
      logged_at:     new Date().toISOString(),
    }]);
    if (error) {
      console.error('[error_log] error_logs insert failed:', error.message);
      return false;
    }
    console.log('[error_log] Lead saved to error_logs table.');
    return true;
  } catch (e) {
    console.error('[error_log] Unexpected error:', e.message);
    return false;
  }
}

// ── Weighted lead scoring (Urgency 0.4 · Intent 0.4 · Geo 0.2) ───────────────
function scoreLeadByTranscript(leadData, transcript) {
  const text = ((transcript || '') + ' ' + (leadData.notes || '')).toLowerCase();

  const urgencyKeywords = [
    'emergency','urgent','asap','immediately','tonight','right now','flooding','flood',
    'fire','smoke','burst pipe','no heat','no water','no power','broken','leaking',
    'overflow','dangerous','critical','help',
  ];
  const intentKeywords = [
    'ready to move','want to apply','interested in renting','move in','income','deposit',
    'lease','sign','tour','showing','available unit','apply','prequalify','pre-qualify',
    'looking to rent','when can i',
  ];
  const geoKeywords = [
    'fort collins','loveland','greeley','windsor','timnath','wellington','bellvue',
    'laporte','northern colorado','noco','nearby','local',
  ];

  const urgencyScore = Math.min(urgencyKeywords.filter(k => text.includes(k)).length / 3, 1);
  const intentScore  = Math.min(intentKeywords.filter(k  => text.includes(k)).length / 3, 1);
  const geoScore     = Math.min(geoKeywords.filter(k     => text.includes(k)).length / 2, 1);

  const composite = (urgencyScore * 0.4) + (intentScore * 0.4) + (geoScore * 0.2);
  return {
    weighted_score: Math.round(composite * 10 * 10) / 10,
    urgency_score:  Math.round(urgencyScore * 10) / 10,
    intent_score:   Math.round(intentScore  * 10) / 10,
    geo_score:      Math.round(geoScore     * 10) / 10,
  };
}

// ── Repeat caller check (72-hour window) ─────────────────────────────────────
async function checkRepeatCaller(phone) {
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('leads')
    .select('created_at, interest_type')
    .eq('customer_phone', phone)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

// ── Dedup check (15-minute window, S-4) ──────────────────────────────────────
async function findRecentDuplicate(phone) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('leads')
    .select('id, notes, priority_level, is_prequalified, income_verified, move_in_date, property_address, interest_type')
    .eq('customer_phone', phone)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}

// ── LLM founder brief (Haiku · degrades gracefully if key absent) ─────────────
async function generateFounderBrief(leadData, transcript, repeatRecord, scoring) {
  const repeatNote = repeatRecord
    ? `Repeat caller — previous ${repeatRecord.interest_type} call on ${new Date(repeatRecord.created_at).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}.`
    : 'First contact.';

  if (!process.env.ANTHROPIC_API_KEY) {
    return `${leadData.interest_type} inquiry from ${leadData.customer_name || 'unknown caller'}. ` +
      `Priority ${leadData.priority_level}/10, weighted score ${scoring.weighted_score}/10. ${repeatNote}`;
  }

  try {
    const prompt = [
      'Write a 2-sentence founder brief for a property management lead. Be direct and highlight the single most actionable detail.',
      `Type: ${leadData.interest_type}`,
      `Priority: ${leadData.priority_level}/10 (weighted: ${scoring.weighted_score}/10)`,
      `Prequalified: ${leadData.is_prequalified}`,
      repeatNote,
      `Notes: ${leadData.notes || 'none'}`,
      transcript ? `Transcript excerpt: ${transcript.slice(0, 600)}` : '',
    ].filter(Boolean).join('\n');

    const { data } = await axios.post('https://api.anthropic.com/v1/messages', {
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages:   [{ role: 'user', content: prompt }],
    }, {
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      timeout: 8000,
    });
    return data.content[0].text.trim();
  } catch (e) {
    console.error('[brief] Generation failed:', e.message);
    return `${leadData.interest_type} lead, priority ${leadData.priority_level}/10. ${repeatNote}`;
  }
}

app.get('/api/leads', requireApiKey, async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total: data.length, leads: data });
});

app.get('/', requireApiKey, (req, res) => {
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
    .info-icon {
      display: inline-block;
      cursor: help;
      color: #d4af37;
      margin-left: 4px;
      font-size: 0.78rem;
      opacity: 0.65;
      transition: opacity 0.15s;
    }
    .info-icon:hover { opacity: 1; }

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

    /* ── Row-level Priority Stripe (CRM-grade) ── */
    tbody tr td:first-child { border-left: 3px solid transparent; padding-left: 13px; }
    tbody tr.row-emergency td:first-child {
      border-left-color: #ef5350;
      box-shadow: inset 4px 0 14px -4px rgba(239,83,80,0.45);
    }
    tbody tr.row-urgent td:first-child {
      border-left-color: #d4af37;
      box-shadow: inset 4px 0 14px -4px rgba(212,175,55,0.30);
    }

    /* ── Status Badges (one per row, mutually exclusive) ── */
    .badge-prequal, .badge-pending, .badge-emergency-status, .badge-service {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      white-space: nowrap;
      border-width: 1px;
      border-style: solid;
    }
    .badge-prequal {
      background: rgba(76,175,80,0.18);
      border-color: rgba(76,175,80,0.45);
      color: #81c784;
    }
    .badge-pending {
      background: rgba(120,140,130,0.10);
      border-color: rgba(120,140,130,0.30);
      color: #5a8a74;
      font-weight: 700;
    }
    .badge-emergency-status {
      background: rgba(244,67,54,0.22);
      border-color: rgba(244,67,54,0.55);
      color: #ef5350;
      animation: pulseEmergency 2.5s ease-in-out infinite;
    }
    @keyframes pulseEmergency {
      0%, 100% { border-color: rgba(244,67,54,0.55); box-shadow: none; }
      50%      { border-color: rgba(244,67,54,0.9);  box-shadow: 0 0 10px rgba(244,67,54,0.35); }
    }
    .badge-service {
      background: rgba(122,184,154,0.10);
      border-color: rgba(122,184,154,0.30);
      color: #7ab89a;
      font-weight: 700;
    }

    /* ── Prequal Filter Toggle ── */
    .filter-row {
      display: flex; align-items: center; justify-content: flex-end;
      gap: 10px; margin-bottom: 10px;
    }
    .filter-toggle {
      background: linear-gradient(145deg, #0d2b22, #0a2019);
      border: 1px solid rgba(76,175,80,0.35);
      color: #81c784;
      padding: 7px 14px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
      transition: all 0.15s;
    }
    .filter-toggle:hover { border-color: #4caf50; color: #a5d6a7; }
    .filter-toggle.active {
      background: linear-gradient(135deg, #1b5e20, #2e7d32);
      border-color: #4caf50;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(76,175,80,0.25);
    }
    .filter-toggle .toggle-dot {
      width: 7px; height: 7px; background: currentColor; border-radius: 50%;
    }

    /* ── Section Header ── */
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .section-title { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 2.5px; color: #5a8a74; font-weight: 700; }
    .section-count { background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.2); color: #d4af37; padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }

    /* ── Table ── */
    .table-wrap { background: linear-gradient(145deg, #0d2b22, #0a2019); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    col.col-name   { width: 12%; }
    col.col-phone  { width: 11%; }
    col.col-int    { width: 13%; }
    col.col-status { width: 11%; }
    col.col-addr   { width: 13%; }
    col.col-notes  { width: 24%; }
    col.col-time   { width: 16%; }
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
      col.col-notes, col.col-addr, col.col-status { width: 0; display: none; }
      .filter-row { justify-content: flex-start; }
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
        <div class="kpi-sub">
          weighted across all leads
          <span class="info-icon" title="Residential Rental: $650  ·  Student Housing: $450  ·  Emergency (risk mitigation): $1,000  ·  Maintenance (OpEx savings): $50">ⓘ</span>
        </div>
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

    <div class="filter-row">
      <button id="prequalToggle" class="filter-toggle" type="button" aria-pressed="false">
        <span class="toggle-dot"></span>
        <span id="prequalToggleLabel">Show Prequalified Only</span>
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <colgroup>
          <col class="col-name"/><col class="col-phone"/><col class="col-int"/><col class="col-status"/><col class="col-addr"/><col class="col-notes"/><col class="col-time"/>
        </colgroup>
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Interest</th><th>Status</th><th>Address</th><th>Notes</th><th>Time</th></tr>
        </thead>
        <tbody id="leadsBody">
          <tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><p>Loading leads...</p></div></td></tr>
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
    const apiKey  = new URLSearchParams(window.location.search).get('api_key') || '';
    let prevCount = 0;
    let donutChart, barChart;
    let showPrequalOnly = false;
    let lastLeads = [];

    /* Weighted lead-value rubric (single source of truth) */
    const LEAD_VALUE = {
      student:     450,   // Student Housing — leasing pipeline
      residential: 650,   // Residential Rental — leasing pipeline
      emergency:  1000,   // Emergency — risk mitigation
      maintenance:  50,   // Maintenance — OpEx triage savings
    };
    function leadValue(l) {
      const t = (l.interest_type || '').toLowerCase();
      if (t.includes('emergency'))                              return LEAD_VALUE.emergency;
      if (t.includes('maintenance'))                            return LEAD_VALUE.maintenance;
      if (t.includes('residential') || t.includes('rental'))    return LEAD_VALUE.residential;
      if (t.includes('student')     || t.includes('housing'))   return LEAD_VALUE.student;
      return 0;
    }

    function setFitValue(id, text) {
      const el = document.getElementById(id);
      el.textContent = text;
      const len = text.length;
      if      (len >= 12) el.style.fontSize = '1.6rem';
      else if (len >= 10) el.style.fontSize = '2rem';
      else if (len >= 8)  el.style.fontSize = '2.4rem';
      else                el.style.fontSize = '';
    }

    // Compact currency: $7,450 stays as is; $125,000 → $125k; $1,250,000 → $1.25M
    function fmtCurrency(n) {
      if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
      if (n >= 100_000)   return '$' + Math.round(n / 1000) + 'k';
      return '$' + Math.round(n).toLocaleString('en-US');
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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

    function renderTable(leads, total) {
      const tbody = document.getElementById('leadsBody');
      const visible = showPrequalOnly ? leads.filter(l => l.is_prequalified === true) : leads;

      if (visible.length === 0) {
        const msg = showPrequalOnly
          ? 'No prequalified leads yet — toggle off to see all.'
          : 'No leads yet — waiting for Vapi...';
        const emptyRow  = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 7;
        const emptyDiv  = document.createElement('div');  emptyDiv.className  = 'empty-state';
        const emptyIcon = document.createElement('div');  emptyIcon.className = 'empty-icon';  emptyIcon.textContent = '📋';
        const emptyP    = document.createElement('p');    emptyP.textContent  = msg;
        emptyDiv.appendChild(emptyIcon);
        emptyDiv.appendChild(emptyP);
        emptyCell.appendChild(emptyDiv);
        emptyRow.appendChild(emptyCell);
        tbody.innerHTML = '';
        tbody.appendChild(emptyRow);
        return;
      }

      const isNew = total > prevCount;
      const frag  = document.createDocumentFragment();

      visible.forEach((l, i) => {
        const t        = (l.interest_type || '').toLowerCase();
        const priority = parseInt(l.priority_level) || 0;
        const ts       = l.created_at
          ? new Date(l.created_at).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';

        let badgeClass = 'badge-housing';
        if (t.includes('emergency'))                                 badgeClass = 'badge-emergency';
        else if (t.includes('maintenance'))                          badgeClass = 'badge-maintenance';
        else if (t.includes('residential') || t.includes('rental')) badgeClass = 'badge-residential';

        const rowClasses = [];
        if (isNew && i === 0 && !showPrequalOnly)      rowClasses.push('new-row');
        if (t.includes('emergency') || priority >= 10) rowClasses.push('row-emergency');
        else if (priority >= 8)                        rowClasses.push('row-urgent');

        const tr = document.createElement('tr');
        if (rowClasses.length) tr.className = rowClasses.join(' ');

        function cell(cls, value, titleVal) {
          const td = document.createElement('td');
          if (cls) td.className = cls;
          td.textContent = value || '—';
          if (titleVal !== undefined) td.title = escapeHtml(String(titleVal || value || ''));
          return td;
        }

        tr.appendChild(cell('name-cell',  l.customer_name,     l.customer_name));
        tr.appendChild(cell('phone-cell', l.customer_phone));

        const tdInt  = document.createElement('td');
        const badge  = document.createElement('span');
        badge.className   = 'badge ' + badgeClass;
        badge.textContent = l.interest_type || '';
        badge.title       = escapeHtml(l.interest_type || '');
        tdInt.appendChild(badge);
        tr.appendChild(tdInt);

        // Status badge — DOM construction only, no innerHTML
        let statusClass, statusTitle, statusText;
        if (t.includes('emergency')) {
          statusClass = 'badge-emergency-status'; statusTitle = 'Routed to emergency line — immediate dispatch required'; statusText = '🚨 Emergency';
        } else if (t.includes('manual triage') || t.includes('triage')) {
          statusClass = 'badge-pending'; statusTitle = 'AI extraction failed — manual review required'; statusText = '⚠ Triage';
        } else if (t.includes('maintenance')) {
          statusClass = 'badge-service'; statusTitle = 'Service ticket — schedule technician'; statusText = 'Service';
        } else if (l.is_prequalified === true) {
          statusClass = 'badge-prequal'; statusTitle = 'Income verified · move-in confirmed · pet/smoking compliant'; statusText = '✓ Prequalified';
        } else {
          statusClass = 'badge-pending'; statusTitle = ''; statusText = 'Unscreened';
        }
        const statusSpan = document.createElement('span');
        statusSpan.className = statusClass;
        if (statusTitle) statusSpan.title = statusTitle;
        statusSpan.textContent = statusText;
        const tdStatus = document.createElement('td');
        tdStatus.appendChild(statusSpan);
        tr.appendChild(tdStatus);

        const notesVal = l.notes || '—';
        const tdNotes  = cell('notes-cell', notesVal, notesVal);
        if (notesVal.startsWith('[REPEAT')) tdNotes.style.color = '#d4af37';
        tr.appendChild(cell('addr-cell', l.property_address, l.property_address));
        tr.appendChild(tdNotes);
        tr.appendChild(cell('ts', ts));

        frag.appendChild(tr);
      });

      tbody.innerHTML = '';
      tbody.appendChild(frag);
    }

    async function fetchLeads() {
      try {
        const res = await fetch('/api/leads?api_key=' + encodeURIComponent(apiKey));
        const data = await res.json();
        const { total, leads } = data;
        lastLeads = leads;

        const leasingLeads = leads.filter(l => {
          const t = (l.interest_type || '').toLowerCase();
          return (t.includes('housing') || t.includes('residential') || t.includes('rental'))
            && !t.includes('maintenance') && !t.includes('emergency');
        });
        const leasingCount     = leasingLeads.length;
        const maintenanceCount = leads.filter(l => (l.interest_type || '').toLowerCase().includes('maintenance')).length;
        const afterHoursCount  = leads.filter(l => {
          const ts = l.created_at || l.timestamp;
          if (!ts) return false;
          const hour = parseInt(new Date(ts).toLocaleString('en-US', { timeZone: 'America/Denver', hour: 'numeric', hour12: false }));
          return hour < 9 || hour >= 17;
        }).length;

        // Weighted lead-value: sum across all categories
        const totalValue = leads.reduce((sum, l) => sum + leadValue(l), 0);

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
        setFitValue('totalValue', fmtCurrency(totalValue));

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

        renderTable(leads, total);
        updateCharts([...leads].reverse());
        prevCount = total;
      } catch (e) {
        console.error('Failed to fetch leads:', e);
      }
    }

    // Prequal-only filter toggle
    document.getElementById('prequalToggle').addEventListener('click', () => {
      showPrequalOnly = !showPrequalOnly;
      const btn   = document.getElementById('prequalToggle');
      const label = document.getElementById('prequalToggleLabel');
      btn.classList.toggle('active', showPrequalOnly);
      btn.setAttribute('aria-pressed', String(showPrequalOnly));
      label.textContent = showPrequalOnly ? 'Showing Prequalified Only' : 'Show Prequalified Only';
      renderTable(lastLeads, lastLeads.length);
    });

    fetchLeads();
    setInterval(fetchLeads, 10000);
  </script>
</body>
</html>`);
});

// ── Make.com webhook (B-2) — fires on every confirmed lead insert or update ───
async function callMakeWebhook(leadData, extraFields = {}) {
  if (!process.env.MAKE_WEBHOOK_URL) {
    console.log('[make] MAKE_WEBHOOK_URL not configured — skipping.');
    return;
  }
  try {
    await axios.post(process.env.MAKE_WEBHOOK_URL, { ...leadData, ...extraFields }, { timeout: 5000 });
    console.log('[make] Webhook fired —', leadData.interest_type, '| priority:', leadData.priority_level, '| name:', leadData.customer_name);
  } catch (e) {
    console.error('[make] Webhook POST failed:', e.message);
  }
}

app.post('/vapi-webhook', async (req, res) => {
  if (!validateVapiSignature(req)) {
    console.warn('[security] Rejected unsigned/invalid POST to /vapi-webhook');
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  const msg     = req.body.message;
  const msgType = msg?.type;

  console.log('Vapi event received:', msgType || 'direct');

  let customer_name, customer_phone, interest_type, notes, priority_level, property_address,
      is_prequalified, income_verified, move_in_date;
  let transcript = ''; // populated from end-of-call-report for scoring + triage

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
      is_prequalified  = structured.is_prequalified;
      income_verified  = structured.income_verified  || '';
      move_in_date     = structured.move_in_date     || '';
      transcript       = msg?.transcript             || '';
      console.log('Lead from structuredData:', { interest_type, priority_level, is_prequalified });
    } else {
      // S-3 fix: save manual triage record instead of silently dropping the call
      const rawTranscript  = msg?.transcript             || '';
      const callerPhone    = msg?.call?.customer?.number || '';
      const callSummary    = msg?.analysis?.summary      || '';
      console.log('[triage] end-of-call-report missing structuredData — saving manual_triage record.');
      if (rawTranscript || callerPhone) {
        const triageNote = callSummary || (rawTranscript ? rawTranscript.slice(0, 600) : 'No transcript available.');
        try {
          const { error: triageErr } = await supabase.from('leads').insert([{
            customer_name:    'Manual Triage Required',
            customer_phone:   callerPhone,
            interest_type:    'Manual Triage',
            notes:            triageNote,
            priority_level:   7,
            property_address: '',
            is_prequalified:  false,
            income_verified:  '',
            move_in_date:     '',
          }]);
          if (triageErr) {
            console.error('[triage] Supabase insert failed:', triageErr.message);
          } else {
            callMakeWebhook({ customer_phone: callerPhone, interest_type: 'Manual Triage', notes: triageNote, priority_level: 7 });
          }
        } catch (e) {
          console.error('[triage] Supabase insert error:', e.message);
        }
      }
      return res.status(200).json({ received: true, status: 'manual_triage_saved' });
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
    is_prequalified  = params?.is_prequalified;
    income_verified  = params?.income_verified  || '';
    move_in_date     = params?.move_in_date     || '';
    console.log('Lead from tool-calls:', { interest_type, priority_level, is_prequalified });

  } else if (msgType === 'function-call' && msg.functionCall) {
    const params     = msg.functionCall.parameters;
    customer_name    = params?.customer_name;
    customer_phone   = params?.customer_phone;
    interest_type    = params?.interest_type;
    notes            = params?.notes            || '';
    priority_level   = params?.priority_level;
    property_address = params?.property_address || '';
    is_prequalified  = params?.is_prequalified;
    income_verified  = params?.income_verified  || '';
    move_in_date     = params?.move_in_date     || '';

  // ── Manual / direct POST ──
  } else if (!msgType) {
    customer_name    = req.body.customer_name;
    customer_phone   = req.body.customer_phone;
    interest_type    = req.body.interest_type;
    notes            = req.body.notes            || '';
    priority_level   = req.body.priority_level;
    property_address = req.body.property_address || '';
    is_prequalified  = req.body.is_prequalified;
    income_verified  = req.body.income_verified  || '';
    move_in_date     = req.body.move_in_date     || '';

  } else {
    return res.status(200).json({ received: true });
  }

  if (!customer_name || !customer_phone || !interest_type) {
    return res.status(400).json({ error: 'Missing required fields: customer_name, customer_phone, interest_type' });
  }

  // Normalize + strictly validate phone → XXX-XXX-XXXX (S-5)
  const digits = customer_phone.replace(/\D/g, '').replace(/^1(\d{10})$/, '$1');
  if (digits.length !== 10) {
    return res.status(400).json({
      error: `Invalid phone number — must normalize to 10 digits.`,
      received: customer_phone,
    });
  }
  customer_phone = digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);

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
    is_prequalified:  is_prequalified === true || is_prequalified === 'true',
    income_verified:  income_verified || '',
    move_in_date:     move_in_date    || '',
  };

  // ── Enrichment pipeline ───────────────────────────────────────────────────────
  const repeatRecord = await checkRepeatCaller(leadData.customer_phone);
  if (repeatRecord) {
    const prevDate = new Date(repeatRecord.created_at)
      .toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'numeric', day: 'numeric' });
    leadData.notes = `[REPEAT — prev ${repeatRecord.interest_type} on ${prevDate}] ${leadData.notes}`;
  }

  const scoring = scoreLeadByTranscript(leadData, transcript);
  if (!isEmergency) {
    leadData.priority_level = Math.max(leadData.priority_level, Math.round(scoring.weighted_score));
  }

  const founderBrief = await generateFounderBrief(leadData, transcript, repeatRecord, scoring);

  // ── S-4: Dedup — merge into existing row if same phone within 15 min ─────────
  const duplicate = await findRecentDuplicate(leadData.customer_phone);
  if (duplicate) {
    const mergedNotes = (duplicate.notes && leadData.notes && duplicate.notes !== leadData.notes)
      ? `${duplicate.notes} | ${leadData.notes}`
      : (leadData.notes || duplicate.notes || '');
    const merged = {
      notes:            mergedNotes,
      priority_level:   Math.max(duplicate.priority_level || 0, leadData.priority_level),
      is_prequalified:  duplicate.is_prequalified || leadData.is_prequalified,
      income_verified:  leadData.income_verified  || duplicate.income_verified  || '',
      move_in_date:     leadData.move_in_date     || duplicate.move_in_date     || '',
      property_address: leadData.property_address || duplicate.property_address || '',
      interest_type:    leadData.interest_type    || duplicate.interest_type,
    };
    const { error: updateError } = await supabase.from('leads').update(merged).eq('id', duplicate.id);
    if (!updateError) {
      console.log('[dedup] Merged into existing lead id', duplicate.id, '— phone:', leadData.customer_phone);
      const finalLead = { ...leadData, ...merged };
      if (merged.priority_level === 10) sendEmergencyAlert(finalLead);
      callMakeWebhook(finalLead, { founder_brief: founderBrief, scoring });
      if (isEmergency) return res.status(200).json({ message: 'Directing to Emergency Line: 970-221-2323' });
      return res.status(200).json({ message: 'Lead updated (duplicate merged)', lead: finalLead });
    }
    console.error('[dedup] Update failed — falling through to insert:', updateError.message);
  }

  const { error } = await supabase.from('leads').insert([leadData]);
  if (error) {
    console.error('Supabase insert error:', error.message);
    const savedToErrorLog = await logToSupabaseErrorTable(leadData, error);
    if (savedToErrorLog) {
      callMakeWebhook(leadData, { founder_brief: founderBrief, scoring }); // persisted in error_logs
    } else {
      await writeRecoveryLog(leadData); // last resort: local file
    }
    return res.status(200).json({ received: true, warning: 'Primary DB unavailable — lead queued in fallback.' });
  }

  // 🚨 Fire SMS alert on true emergencies (priority 10) — only after confirmed DB write
  if (leadData.priority_level === 10) {
    sendEmergencyAlert(leadData); // fire-and-forget, don't block the response
  }

  callMakeWebhook(leadData, { founder_brief: founderBrief, scoring }); // confirmed in primary DB

  if (isEmergency) {
    return res.status(200).json({ message: 'Directing to Emergency Line: 970-221-2323' });
  }

  return res.status(200).json({ message: 'Lead received', lead: leadData });
});

app.listen(PORT, () => {
  console.log(`Front Range AI is Live on port ${PORT}`);
});
