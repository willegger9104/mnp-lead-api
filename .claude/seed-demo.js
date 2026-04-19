/* Wipes the leads table and seeds 15 realistic demo rows. */
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const HOUR = 3600 * 1000;
const now  = Date.now();
const ts   = h => new Date(now - h * HOUR).toISOString();

const leads = [
  // ─── Recent (last 24h) ───────────────────────────────────────
  { h: 2,   customer_name: 'Sarah Mitchell',   customer_phone: '970-481-7235', interest_type: 'Student Housing',
    property_address: '512 W Mountain Ave',
    notes: 'CSU senior, looking for 2BR near campus. Income verified at 3x rent. Non-smoking + no-pet confirmed. Move-in August 25.',
    priority_level: 8, is_prequalified: true,  income_verified: 'yes',      move_in_date: 'August 25' },

  { h: 5,   customer_name: 'Marcus Chen',      customer_phone: '970-553-8421', interest_type: 'Residential Rental',
    property_address: '1820 Springfield Dr',
    notes: 'Family of 4 relocating from Denver. 3BR with yard requested. Prequalified across all checks. Target June 1.',
    priority_level: 5, is_prequalified: true,  income_verified: 'yes',      move_in_date: 'June 1' },

  { h: 9,   customer_name: 'Emma Rodriguez',   customer_phone: '970-219-4536', interest_type: 'Student Housing',
    property_address: '417 Plum St',
    notes: 'Has small dog — flagged on no-pet policy. Could not confirm 3x rent income. Will follow up after policy review.',
    priority_level: 5, is_prequalified: false, income_verified: 'no',       move_in_date: 'August 1' },

  { h: 14,  customer_name: "James O'Connor",   customer_phone: '970-672-1854', interest_type: 'Maintenance Request',
    property_address: '729 Remington St',
    notes: 'Garbage disposal jammed in unit 4B. Tenant tried reset button — no luck. Needs technician visit.',
    priority_level: 3, is_prequalified: false, income_verified: '',         move_in_date: '' },

  { h: 22,  customer_name: 'Tyler Brennan',    customer_phone: '970-541-9032', interest_type: 'Emergency',
    property_address: '628 W Mulberry St',
    notes: 'EMERGENCY — pipe burst under kitchen sink, water spreading to living room. Routed to 970-221-2323.',
    priority_level: 10, is_prequalified: false, income_verified: '',        move_in_date: '' },

  // ─── Mid-week (1-3 days) ─────────────────────────────────────
  { h: 30,  customer_name: 'Aisha Williams',   customer_phone: '970-388-6147', interest_type: 'Student Housing',
    property_address: '305 Mathews St',
    notes: 'First-year CSU, parents co-signing lease. Income verified, no pets, non-smoker. Move-in August 18.',
    priority_level: 5, is_prequalified: true,  income_verified: 'yes',      move_in_date: 'August 18' },

  { h: 38,  customer_name: 'Nathan Park',      customer_phone: '970-714-2308', interest_type: 'Residential Rental',
    property_address: '942 Stover St',
    notes: 'Wants 1BR. Declined to share income details, no firm move-in date. Wants callback before committing.',
    priority_level: 5, is_prequalified: false, income_verified: 'declined', move_in_date: '' },

  { h: 47,  customer_name: 'Olivia Hartmann',  customer_phone: '970-263-4915', interest_type: 'Maintenance Request',
    property_address: '218 Laurel St',
    notes: 'HVAC blower making rattling noise. Cool air not flowing strongly. Schedule inspection within 48h.',
    priority_level: 3, is_prequalified: false, income_verified: '',         move_in_date: '' },

  { h: 56,  customer_name: 'Diego Vasquez',    customer_phone: '970-893-5274', interest_type: 'Student Housing',
    property_address: '1124 City Park Ave',
    notes: 'CSU graduate student, quiet area preferred. Income confirmed, no pet, non-smoker. August 1.',
    priority_level: 5, is_prequalified: true,  income_verified: 'yes',      move_in_date: 'August 1' },

  { h: 70,  customer_name: 'Hannah Kowalski',  customer_phone: '970-485-1762', interest_type: 'Residential Rental',
    property_address: '503 Stover St',
    notes: 'Couple relocating for new jobs at HP. 2BR. 3x income verified, no pets, non-smoking. July 15.',
    priority_level: 5, is_prequalified: true,  income_verified: 'yes',      move_in_date: 'July 15' },

  // ─── Last week (3-7 days) ────────────────────────────────────
  { h: 88,  customer_name: 'Brandon Lee',      customer_phone: '970-326-7184', interest_type: 'Student Housing',
    property_address: '417 Mathews St',
    notes: 'Looking for roommate match. Needs to confirm budget — will call back next week. Unscreened.',
    priority_level: 5, is_prequalified: false, income_verified: 'declined', move_in_date: '' },

  { h: 102, customer_name: 'Riley Thompson',   customer_phone: '970-754-3098', interest_type: 'Maintenance Request',
    property_address: '824 W Plum St',
    notes: 'Front door lock sticking. Difficult to engage deadbolt. Tenant locked out twice this week.',
    priority_level: 3, is_prequalified: false, income_verified: '',         move_in_date: '' },

  { h: 130, customer_name: 'Sophia Patel',     customer_phone: '970-518-2674', interest_type: 'Student Housing',
    property_address: '1342 W Stuart St',
    notes: 'Exchange student arriving September. Income verified through scholarship + co-signer. Aug 28.',
    priority_level: 8, is_prequalified: true,  income_verified: 'yes',      move_in_date: 'August 28' },

  { h: 168, customer_name: 'Caleb Foster',     customer_phone: '970-647-3829', interest_type: 'Residential Rental',
    property_address: '630 Remington St',
    notes: 'Has cat — cannot comply with no-pet policy. Income would have qualified. Will look elsewhere.',
    priority_level: 5, is_prequalified: false, income_verified: 'yes',      move_in_date: 'June 15' },

  { h: 196, customer_name: 'Madeline Cruz',    customer_phone: '970-271-5640', interest_type: 'Emergency',
    property_address: '417 W Lake St',
    notes: 'EMERGENCY — smoke smell + alarm activated in unit 7. Routed to 970-221-2323. Possible electrical.',
    priority_level: 10, is_prequalified: false, income_verified: '',        move_in_date: '' },
];

(async () => {
  console.log('[seed] wiping leads table…');
  const { error: delErr } = await sb.from('leads').delete().gte('id', 0);
  if (delErr) { console.error('  delete error:', delErr.message); process.exit(1); }
  console.log('[seed] wiped.');

  const rows = leads.map(({ h, ...rest }) => ({ ...rest, created_at: ts(h) }));
  const { data, error } = await sb.from('leads').insert(rows).select();
  if (error) { console.error('[seed] insert error:', error.message); process.exit(1); }
  console.log(`[seed] inserted ${data.length} leads.`);

  // Quick KPI summary
  const buckets = { 'Student Housing': 0, 'Residential Rental': 0, 'Maintenance Request': 0, 'Emergency': 0 };
  let prequal = 0, value = 0;
  const W = { 'Student Housing': 450, 'Residential Rental': 650, 'Maintenance Request': 50, 'Emergency': 1000 };
  for (const r of data) {
    buckets[r.interest_type]++;
    if (r.is_prequalified) prequal++;
    value += W[r.interest_type] || 0;
  }
  console.log('\n[seed] summary:');
  console.log('  by category:', buckets);
  console.log('  prequalified:', prequal, '/', data.length);
  console.log('  total weighted value: $' + value.toLocaleString('en-US'));
})();
