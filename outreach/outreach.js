// ─────────────────────────────────────────────────────────────────────────────
// Automated Cold Outreach
// Google Places → email scraping → personalized email → Supabase tracking
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios     = require('axios');
const nodemailer = require('nodemailer');
const cheerio   = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const { getTemplate } = require('./templates');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG = {
  googleApiKey:       process.env.GOOGLE_API_KEY,
  gmailUser:          process.env.GMAIL_USER,
  gmailAppPass:       process.env.GMAIL_APP_PASS,
  demoUrl:            'https://mnp-lead-api.onrender.com',
  senderName:         'Will Egger',
  delayMs:            4000,   // delay between emails — keeps you out of spam
  maxPerRun:          20,     // emails per run (stay under Gmail 500/day limit)
  resultsPerSearch:   5,      // businesses pulled per Places search
};

// ── INDUSTRIES ────────────────────────────────────────────────────────────────
const CAMPAIGNS = [
  {
    industry:    'Property Management',
    demoSlug:    'property',
    queries:     ['property management company', 'property manager'],
    painPoint:   'missed after-hours rental inquiries',
    valueLine:   'One missed housing lead is a month of lost rent.',
  },
  {
    industry:    'HVAC',
    demoSlug:    'hvac',
    queries:     ['HVAC company', 'heating and cooling', 'air conditioning repair'],
    painPoint:   'emergency calls going to voicemail after hours',
    valueLine:   'One missed emergency call is a $500+ job going to your competitor.',
  },
  {
    industry:    'Dental',
    demoSlug:    'dental',
    queries:     ['dental office', 'dentist'],
    painPoint:   'new patient calls going unanswered',
    valueLine:   'A new patient is worth $1,500+ in lifetime revenue.',
  },
  {
    industry:    'Auto Repair',
    demoSlug:    'auto',
    queries:     ['auto repair shop', 'auto mechanic'],
    painPoint:   'appointment requests going to voicemail',
    valueLine:   'Every missed call is a job your competitor books instead.',
  },
  {
    industry:    'Plumbing',
    demoSlug:    'plumbing',
    queries:     ['plumber', 'plumbing company'],
    painPoint:   'emergency plumbing calls missed after hours',
    valueLine:   'Emergency plumbing jobs average $300–$600 a visit.',
  },
  {
    industry:    'Hair Salon',
    demoSlug:    'salon',
    queries:     ['hair salon', 'hair studio', 'beauty salon'],
    painPoint:   'appointment requests and new client calls going to voicemail',
    valueLine:   'A new client is worth $800–$1,200/year in repeat visits.',
  },
];

// ── LOCATIONS ─────────────────────────────────────────────────────────────────
const LOCATIONS = [
  'Fort Collins CO',
  'Loveland CO',
  'Greeley CO',
  'Windsor CO',
  // Add more cities as you scale:
  // 'Boulder CO', 'Denver CO', 'Colorado Springs CO',
];

// ── SUPABASE + GMAIL SETUP ────────────────────────────────────────────────────
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: CONFIG.gmailUser, pass: CONFIG.gmailAppPass },
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── STEP 1: Find businesses via Google Places ─────────────────────────────────
async function findBusinesses(query, location) {
  const res = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    params: { query: `${query} ${location}`, key: CONFIG.googleApiKey },
  });

  const places = (res.data.results || []).slice(0, CONFIG.resultsPerSearch);
  const businesses = [];

  for (const place of places) {
    try {
      const det = await getPlaceDetails(place.place_id);
      businesses.push({
        name:     place.name,
        address:  place.formatted_address,
        phone:    det.phone  || '',
        website:  det.website || '',
        rating:   place.rating || null,
      });
      await sleep(300); // avoid hitting Places rate limit
    } catch (e) {
      console.error(`  Details error for ${place.name}: ${e.message}`);
    }
  }

  return businesses;
}

async function getPlaceDetails(placeId) {
  const res = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
    params: { place_id: placeId, fields: 'website,formatted_phone_number', key: CONFIG.googleApiKey },
  });
  const r = res.data.result || {};
  return { website: r.website || '', phone: r.formatted_phone_number || '' };
}

// ── STEP 2: Scrape email from website ────────────────────────────────────────
async function findEmail(websiteUrl) {
  if (!websiteUrl) return null;

  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const pagesToTry = ['', '/contact', '/contact-us', '/about', '/about-us'];
  const base = websiteUrl.replace(/\/$/, '');

  for (const path of pagesToTry) {
    try {
      const res = await axios.get(base + path, {
        timeout: 6000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; business-research-bot)' },
      });

      const $ = cheerio.load(res.data);

      // 1. Check mailto: links first (most reliable)
      const mailtoEmails = [];
      $('a[href^="mailto:"]').each((_, el) => {
        const raw = $(el).attr('href').replace('mailto:', '').split('?')[0].trim();
        if (raw) mailtoEmails.push(raw);
      });
      if (mailtoEmails.length) return mailtoEmails[0];

      // 2. Regex scan on page text
      const found = (res.data.match(emailRegex) || []).filter(e =>
        !e.includes('example') && !e.includes('sentry') &&
        !e.includes('wix')    && !e.includes('.png') && !e.includes('.jpg')
      );
      if (found.length) return found[0];

    } catch (_) { /* page not found or timeout — try next */ }
  }

  return null;
}

// ── STEP 3: Check if already emailed ─────────────────────────────────────────
async function alreadyContacted(email) {
  const { data } = await supabase
    .from('outreach')
    .select('id')
    .eq('email_address', email.toLowerCase())
    .limit(1);
  return data && data.length > 0;
}

// ── STEP 4: Send email + log to Supabase ──────────────────────────────────────
async function sendAndLog(business, email, campaign) {
  const { subject, body } = getTemplate(business, campaign, CONFIG);

  await transporter.sendMail({
    from: `${CONFIG.senderName} <${CONFIG.gmailUser}>`,
    to:   email,
    subject,
    text: body,
  });

  await supabase.from('outreach').insert([{
    business_name:    business.name,
    business_phone:   business.phone,
    business_website: business.website,
    email_address:    email.toLowerCase(),
    industry:         campaign.industry,
    status:           'sent',
  }]);

  console.log(`  ✓ Sent → ${business.name} <${email}>`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n=== Cold Outreach Run Started ===\n');
  let sent = 0;

  for (const campaign of CAMPAIGNS) {
    if (sent >= CONFIG.maxPerRun) break;
    console.log(`\n[${campaign.industry}]`);

    for (const location of LOCATIONS) {
      if (sent >= CONFIG.maxPerRun) break;

      for (const query of campaign.queries) {
        if (sent >= CONFIG.maxPerRun) break;
        console.log(`\n  Searching: "${query}" in ${location}`);

        let businesses = [];
        try {
          businesses = await findBusinesses(query, location);
        } catch (e) {
          console.error(`  Places API error: ${e.message}`);
          continue;
        }

        for (const biz of businesses) {
          if (sent >= CONFIG.maxPerRun) break;

          if (!biz.website) {
            console.log(`  ✗ ${biz.name} — no website`);
            continue;
          }

          const email = await findEmail(biz.website);
          if (!email) {
            console.log(`  ✗ ${biz.name} — no email found`);
            continue;
          }

          if (await alreadyContacted(email)) {
            console.log(`  ✗ ${biz.name} — already contacted`);
            continue;
          }

          try {
            await sendAndLog(biz, email, campaign);
            sent++;
            await sleep(CONFIG.delayMs);
          } catch (e) {
            console.error(`  ✗ Failed to send to ${biz.name}: ${e.message}`);
          }
        }
      }
    }
  }

  console.log(`\n=== Done: ${sent} email${sent !== 1 ? 's' : ''} sent this run ===\n`);
}

run().catch(console.error);
