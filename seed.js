require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Spread a timestamp across the last N days, preserving the time-of-day
// so after-hours detection on the dashboard works correctly.
function daysAgo(d, timeUTC) {
  const base = new Date();
  base.setDate(base.getDate() - d);
  const [h, m] = timeUTC.split(':').map(Number);
  base.setUTCHours(h, m, 0, 0);
  return base.toISOString();
}

const LEADS = [
  // ── Emergencies ──────────────────────────────────────────────────────────────
  {
    customer_name:    'Ryan Holloway',
    customer_phone:   '970-555-9201',
    interest_type:    'Emergency',
    notes:            'Pipe burst in unit 4A — water flooding hallway. Directed to emergency line.',
    priority_level:   10,
    property_address: '820 W Plum St, Fort Collins CO',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '',
    created_at:       daysAgo(1, '02:18'),
  },
  {
    customer_name:    'Dana Ruiz',
    customer_phone:   '970-555-3374',
    interest_type:    'Emergency',
    notes:            'No heat in unit 12, temperature below 50°F — tenant with infant.',
    priority_level:   10,
    property_address: '1140 Stover St, Fort Collins CO',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '',
    created_at:       daysAgo(4, '23:52'),
  },

  // ── Residential Rental ───────────────────────────────────────────────────────
  {
    customer_name:    'David Kim',
    customer_phone:   '970-555-8163',
    interest_type:    'Residential Rental',
    notes:            'Relocating from Denver, needs 2BR by June 1st. Income verified, ready to apply.',
    priority_level:   8,
    property_address: '',
    is_prequalified:  true,
    income_verified:  'yes',
    move_in_date:     '2026-06-01',
    created_at:       daysAgo(2, '17:45'),
  },
  {
    customer_name:    'Laura Simmons',
    customer_phone:   '970-555-3491',
    interest_type:    'Residential Rental',
    notes:            'Young professional, wants 1BR with in-unit laundry near Old Town.',
    priority_level:   6,
    property_address: '',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '2026-05-15',
    created_at:       daysAgo(3, '00:10'),
  },
  {
    customer_name:    'Marcus Rivera',
    customer_phone:   '970-555-4492',
    interest_type:    'Residential Rental',
    notes:            'Family of three, 3BR with yard preferred. Moving from out of state.',
    priority_level:   7,
    property_address: '',
    is_prequalified:  true,
    income_verified:  'yes',
    move_in_date:     '2026-06-15',
    created_at:       daysAgo(5, '20:00'),
  },
  {
    customer_name:    'Priya Nair',
    customer_phone:   '970-555-6612',
    interest_type:    'Residential Rental',
    notes:            'Remote worker, wants home office space. Flexible on move-in.',
    priority_level:   5,
    property_address: '',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '',
    created_at:       daysAgo(8, '11:30'),
  },

  // ── Student Housing ──────────────────────────────────────────────────────────
  {
    customer_name:    'Ashley Bennett',
    customer_phone:   '970-555-9036',
    interest_type:    'Student Housing',
    notes:            'Pet-friendly unit near CSU, move-in August. Has a small dog.',
    priority_level:   6,
    property_address: '',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '2026-08-15',
    created_at:       daysAgo(0, '00:50'),
  },
  {
    customer_name:    'Jake Morales',
    customer_phone:   '970-555-7291',
    interest_type:    'Student Housing',
    notes:            'Furnished studio for fall semester. Prefers close to campus, under $900/mo.',
    priority_level:   5,
    property_address: '',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '2026-08-20',
    created_at:       daysAgo(6, '02:45'),
  },
  {
    customer_name:    'Sarah Allenberger',
    customer_phone:   '970-555-3847',
    interest_type:    'Student Housing',
    notes:            'Inquiring about 2BR availability for fall. Wants to room with a friend.',
    priority_level:   5,
    property_address: '',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '2026-08-15',
    created_at:       daysAgo(9, '20:15'),
  },
  {
    customer_name:    'Tyler Okonkwo',
    customer_phone:   '970-555-2284',
    interest_type:    'Student Housing',
    notes:            'Grad student, needs quiet 1BR for research year. Budget $850/mo.',
    priority_level:   5,
    property_address: '',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '2026-08-01',
    created_at:       daysAgo(12, '19:05'),
  },

  // ── Maintenance ───────────────────────────────────────────────────────────────
  {
    customer_name:    'Jessica Park',
    customer_phone:   '970-555-7634',
    interest_type:    'Maintenance Request',
    notes:            'HVAC making loud rattling noise. Has been ongoing 3 days.',
    priority_level:   6,
    property_address: '340 E Stuart St Apt 7, Fort Collins CO',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '',
    created_at:       daysAgo(1, '23:45'),
  },
  {
    customer_name:    'Tom Bradley',
    customer_phone:   '970-555-1847',
    interest_type:    'Maintenance Request',
    notes:            'Garbage disposal not working in unit 14B. Stopped mid-week.',
    priority_level:   4,
    property_address: '502 Remington St Unit 14B, Fort Collins CO',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '',
    created_at:       daysAgo(7, '14:30'),
  },
  {
    customer_name:    'Connie Bass',
    customer_phone:   '970-555-6628',
    interest_type:    'Maintenance Request',
    notes:            'Slow drain in master bath, clog will not clear with plunger.',
    priority_level:   4,
    property_address: '1010 Mathews St, Fort Collins CO',
    is_prequalified:  false,
    income_verified:  '',
    move_in_date:     '',
    created_at:       daysAgo(10, '10:15'),
  },
];

async function seed() {
  console.log(`Seeding ${LEADS.length} demo leads into Supabase...\n`);
  let passed = 0;
  let failed = 0;

  for (const lead of LEADS) {
    const { error } = await supabase.from('leads').insert([lead]);
    if (error) {
      console.error(`  ✗ ${lead.customer_name} — ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${lead.customer_name.padEnd(22)} ${lead.interest_type}`);
      passed++;
    }
  }

  console.log(`\nDone: ${passed} inserted, ${failed} failed.`);
  if (failed > 0) console.log('Check Supabase column names match the schema above.');
}

seed().catch(console.error);
