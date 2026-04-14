// ─────────────────────────────────────────────────────────────────────────────
// Cold email templates — social psychology principles applied:
//   • Pattern interrupt opener  (doesn't read like a sales email)
//   • Loss aversion             (specific cost of the problem)
//   • Social proof              (another local business already running it)
//   • Curiosity gap             (demo does the selling, not the email)
//   • Assumptive close          (reply to get times, not "are you interested?")
//   • P.S. line                 (most-read part — used for scarcity/loss aversion)
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECTS = {
  'Property Management': [
    `{name} — question about your after-hours calls`,
    `Your rental leads after 5pm`,
    `Saw {name} online — quick thought`,
  ],
  'HVAC': [
    `Who answers your phones at 10pm?`,
    `{name} — question about emergency calls`,
    `Saw {name} — quick idea for after-hours`,
  ],
  'Dental': [
    `New patients who call after hours`,
    `{name} — are you capturing these calls?`,
    `Quick thought for {name}`,
  ],
  'Auto Repair': [
    `{name} — who handles calls when you're under a hood?`,
    `Missed appointments at {name}`,
    `Quick thought about your phones`,
  ],
  'Plumbing': [
    `The call at 11pm that goes to voicemail`,
    `{name} — emergency calls after hours`,
    `Quick question about {name}`,
  ],
  'Hair Salon': [
    `Booking requests {name} might be missing`,
    `{name} — new client calls after hours`,
    `Quick thought about your bookings`,
  ],
};

const OPENERS = {
  'Property Management': [
    `I was looking at property managers in the area and noticed {name} — had a quick thought.

Most PM companies lose 2–4 qualified rental inquiries every week to voicemail — people who called after 5pm, didn't leave a message, and moved on to the next property. At even $200/month per unit, that's vacancy time that didn't need to happen.`,

    `Quick question — what happens when a prospective tenant calls {name} at 9pm?

If it goes to voicemail, there's a good chance they're already calling someone else. Most people shopping for housing don't leave messages. They just move on.`,

    `I noticed {name} manages properties in the Front Range and wanted to share something that's been working for a local PM company here.

They were losing after-hours rental inquiries to voicemail — students, young professionals, families calling in the evening when the office was closed. They had no idea how many until they started logging it.`,
  ],
  'HVAC': [
    `Quick question — when someone's heat goes out at 10pm tonight and they Google "HVAC emergency Fort Collins," what happens when they call {name}?

If it goes to voicemail, they hang up and call whoever picks up next. Emergency HVAC jobs go to whoever answers first, not whoever is best.`,

    `I was looking at HVAC companies in the area and had a quick thought about {name}.

Most service companies lose 3–5 jobs a week not because they can't do the work — but because nobody answered the phone after hours. One missed emergency call is $400–$800 walking to a competitor.`,

    `I came across {name} online and wanted to share something I built that's running live for a local service company.

It handles after-hours calls 24/7 — captures the job details, routes emergencies to whoever is on call, and logs everything automatically. No voicemail. No missed jobs.`,
  ],
  'Dental': [
    `Quick thought about {name} — new patients almost never call twice.

If someone calls after hours looking for a new dentist and gets your voicemail, they call the next practice on the list. That's a $1,500+ patient gone in about 30 seconds.`,

    `I noticed {name} online and wanted to share something a local dental office is already running.

They were losing new patient calls in the evening and on weekends — people calling when the front desk was with someone else. They had no idea until they set up a proper call log.`,

    `When a new patient calls {name} and gets voicemail, what's the chance they actually call back?

Research consistently shows it's under 30%. Most just call the next dentist on the list. At $1,500+ per new patient, even one missed call per week adds up fast.`,
  ],
  'Auto Repair': [
    `Quick question — when someone calls {name} while your team is under a hood, what happens?

If it rings out or goes to voicemail, there's a real chance they call the next shop. People with car problems want answers immediately. They don't wait around for a callback.`,

    `I came across {name} and had a quick thought.

Most auto shops don't realize how many jobs they're losing to voicemail — especially in the evenings and on weekends. The customer just calls whoever answers. It's not about loyalty. It's about who picks up.`,

    `I was looking at auto shops in the area and wanted to share something that's been working for a local service company.

It answers every call automatically — captures the job details, books the appointment, and sends you the info. No voicemail, no missed work.`,
  ],
  'Plumbing': [
    `At 11pm when someone has a burst pipe and calls {name} — what happens if nobody answers?

They hang up and call whoever picks up next. Emergency plumbing jobs don't wait. The homeowner is panicking and they need someone on the phone right now.`,

    `Quick thought about {name} — the plumber who answers first gets the job.

Most after-hours plumbing calls go to whoever picks up, not whoever is best. If your phone goes to voicemail at midnight, that $400+ emergency job is already gone.`,

    `I came across {name} and wanted to share something a local plumbing company is already running live.

It handles every call 24/7 — captures job details, routes emergencies immediately, and logs everything automatically. The homeowner gets a response in under 2 seconds. No voicemail.`,
  ],
  'Hair Salon': [
    `Quick thought about {name} — how many booking requests come in after you're closed?

People browse Instagram, see a style they love, and call the salon at 9pm. If it goes to voicemail, most don't call back. They find someone who makes it easy to book.`,

    `I came across {name} and had an idea.

Most salons lose new client bookings in the evenings and on weekends — not because the work isn't great, but because nobody answered. A regular new client is worth $800–$1,200 a year in repeat visits.`,

    `When a new client calls {name} and gets voicemail, what's the chance they actually leave a message?

It's low. Most just move on. One missed new client every week is significant revenue over a year — and it's completely avoidable.`,
  ],
};

// ── P.S. lines — scarcity or loss aversion, no repeated demo link ─────────────
const PS_LINES = {
  'Property Management': `P.S. — One captured leasing lead that doesn't fall through voicemail pays for this service for the entire month.`,
  'HVAC':                `P.S. — I'm setting this up for one HVAC company per city in the Front Range. Fort Collins is still available.`,
  'Dental':              `P.S. — At $1,500 per new patient, two missed calls a week is over $12,000 a year walking to a competitor.`,
  'Auto Repair':         `P.S. — I'm only setting this up for one auto shop per city in the Front Range. Fort Collins is still open.`,
  'Plumbing':            `P.S. — Emergency plumbing jobs average $400+. One captured after-hours call per week more than covers the cost.`,
  'Hair Salon':          `P.S. — A new client visiting 8 times a year at $120/visit is worth nearly $1,000. One captured call a month makes this free.`,
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getOpener(campaign, businessName) {
  const options = OPENERS[campaign.industry] || [
    `I came across ${businessName} and wanted to reach out about something that might be useful.`,
  ];
  return pick(options).replace(/\{name\}/g, businessName);
}

function getSubject(campaign, businessName) {
  const options = SUBJECTS[campaign.industry] || [`Quick thought about ${businessName}`];
  return pick(options).replace(/\{name\}/g, businessName);
}

function getTemplate(business, campaign, config) {
  const opener  = getOpener(campaign, business.name);
  const subject = getSubject(campaign, business.name);
  const ps      = PS_LINES[campaign.industry] || '';

  const body =
`Hi there,

${opener}

I built an AI voice agent that answers calls 24/7 for local businesses — captures the job or lead details, routes emergencies to the right person, and logs everything automatically. It's already running live for a company in Northern Colorado.

Here's the live dashboard so you can see exactly what it looks like in practice:

👉 ${config.demoUrl}/demo/${campaign.demoSlug}

Setup takes about a week. Runs for $250/month after a one-time setup fee. No contract.

If it looks like something worth a 15-minute call, just reply and I'll send over a few times that work.

— ${config.senderName}
Fort Collins, CO

${ps}

---
Reply "unsubscribe" to opt out.`;

  return { subject, body };
}

module.exports = { getTemplate };
