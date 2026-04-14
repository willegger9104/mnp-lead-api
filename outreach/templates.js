// ─────────────────────────────────────────────────────────────────────────────
// Cold email templates — written to feel hand-typed, not mass-sent
//
// Rules:
//   • Lowercase subject lines (look like real emails, not campaigns)
//   • Under 100 words in the body
//   • No pricing in the email — let the demo and call do that
//   • No bullet points, no bold, no formatting
//   • Signed just "Will" — not "Will Egger, Fort Collins, CO"
//   • One soft ask, not a hard CTA
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECTS = {
  'Property Management': [
    `quick question — {name}`,
    `had a thought about {name}`,
    `{name} — after hours calls`,
  ],
  'HVAC': [
    `quick question — {name}`,
    `had a thought about {name}`,
    `{name} — after hours`,
  ],
  'Dental': [
    `quick question — {name}`,
    `had a thought about {name}`,
    `{name} — after hours calls`,
  ],
  'Auto Repair': [
    `quick question — {name}`,
    `had a thought about {name}`,
    `{name} — missed calls`,
  ],
  'Plumbing': [
    `quick question — {name}`,
    `had a thought about {name}`,
    `{name} — after hours`,
  ],
  'Hair Salon': [
    `quick question — {name}`,
    `had a thought about {name}`,
    `{name} — booking calls`,
  ],
};

const OPENERS = {
  'Property Management': [
    `Was looking at property managers in the area and came across {name}.

Quick question — what happens to rental inquiries that come in after 5pm? Most people don't leave voicemails. They just call the next property on the list.`,

    `Came across {name} online and had a quick thought.

Every after-hours call from a prospective tenant that goes unanswered is a vacancy that stays vacant a little longer. Most PM companies have no idea how many they're losing.`,

    `Was doing some research on property managers in the area and {name} came up.

Curious — when someone calls about a unit at 9pm and nobody picks up, what's the chance they call back the next morning?`,
  ],
  'HVAC': [
    `Was looking at HVAC companies in the area and came across {name}.

Quick question — when someone's heat goes out at 10pm and they call, what happens if nobody picks up? That job goes to whoever answers first.`,

    `Came across {name} and had a quick thought.

Most HVAC companies don't realize how many after-hours jobs they're losing — not because they can't do the work, but because nobody answered. The customer just calls the next company.`,

    `Was looking at HVAC companies in the area and {name} came up.

Curious — do you have anything handling calls when your team isn't available? Emergency jobs especially tend to go to whoever picks up first.`,
  ],
  'Dental': [
    `Was looking at dental offices in the area and came across {name}.

Quick question — when a new patient calls after hours and hits voicemail, what's the chance they actually call back? Most don't. They just call the next dentist on the list.`,

    `Came across {name} online and had a quick thought.

Most dental offices lose a handful of new patient calls every week simply because nobody answered. Those patients just move on to the next practice.`,

    `Was researching dental offices in the area and {name} came up.

Curious — what happens to calls that come in when your front desk is with a patient or closed for the day?`,
  ],
  'Auto Repair': [
    `Was looking at auto shops in the area and came across {name}.

Quick question — when someone calls about a repair and nobody picks up, do they wait for a callback or just call the next shop? Usually it's the second one.`,

    `Came across {name} and had a quick thought.

Most shops lose a few jobs a week to voicemail without realizing it. The customer needed an answer right then and just moved on.`,

    `Was looking at auto shops in the area and {name} came up.

Curious — what happens to calls that come in on evenings or weekends when your team isn't around?`,
  ],
  'Plumbing': [
    `Was looking at plumbing companies in the area and came across {name}.

Quick question — when someone has a burst pipe at 11pm and calls, what happens if nobody answers? They're already calling the next plumber before the voicemail finishes.`,

    `Came across {name} and had a quick thought.

Emergency plumbing jobs go to whoever picks up first. If your phone goes to voicemail after hours, that job is already gone before you even know someone called.`,

    `Was researching plumbing companies in the area and {name} came up.

Curious — do you have anything handling emergency calls after hours, or does that go to voicemail?`,
  ],
  'Hair Salon': [
    `Was looking at salons in the area and came across {name}.

Quick question — how many booking requests come in after you're closed? Most people call in the evening, and if it goes to voicemail they usually just move on.`,

    `Came across {name} online and had a quick thought.

Most salons lose new client bookings in the evenings without realizing it — not because the work isn't great, but just because nobody answered.`,

    `Was looking at salons in the area and {name} came up.

Curious — what happens when a new client calls to book and nobody's available to answer?`,
  ],
};

const PS_LINES = {
  'Property Management': `P.S. — one captured leasing lead that doesn't fall through voicemail pays for this for the month.`,
  'HVAC':                `P.S. — only setting this up for one HVAC company per city right now. Fort Collins is still open.`,
  'Dental':              `P.S. — at $1,500 per new patient, two missed calls a week is $12,000+ a year going to a competitor.`,
  'Auto Repair':         `P.S. — only setting this up for one shop per city right now. Fort Collins is still open.`,
  'Plumbing':            `P.S. — emergency plumbing jobs average $400+. one captured after-hours call a week more than covers the cost.`,
  'Hair Salon':          `P.S. — a regular client visiting 8x a year is worth close to $1,000. one new client a month makes this free.`,
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getOpener(campaign, businessName) {
  const options = OPENERS[campaign.industry] || [
    `Came across ${businessName} and wanted to reach out about something that might be useful.`,
  ];
  return pick(options).replace(/\{name\}/g, businessName);
}

function getSubject(campaign, businessName) {
  const options = SUBJECTS[campaign.industry] || [`quick question — ${businessName}`];
  return pick(options).replace(/\{name\}/g, businessName);
}

function getTemplate(business, campaign, config) {
  const opener  = getOpener(campaign, business.name);
  const subject = getSubject(campaign, business.name);
  const ps      = PS_LINES[campaign.industry] || '';

  const body =
`${opener}

I built something that handles this automatically for local businesses — already running live for a company in Northern Colorado. Put together a quick demo if you want to see how it works:

${config.demoUrl}/demo/${campaign.demoSlug}

Worth a quick call if it makes sense.

Will

${ps}

---
reply "unsubscribe" to opt out.`;

  return { subject, body };
}

module.exports = { getTemplate };
