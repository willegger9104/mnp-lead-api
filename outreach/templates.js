// ─────────────────────────────────────────────────────────────────────────────
// Email templates by industry
// ─────────────────────────────────────────────────────────────────────────────

const OPENERS = {
  'Property Management': [
    `Managing properties means your phone never really stops — but your team can't answer it at midnight.`,
    `Every missed after-hours call from a prospective tenant is a vacancy that stays vacant a little longer.`,
    `I noticed {name} manages properties in the area and wanted to reach out about something that's been working well for another Fort Collins PM company.`,
  ],
  'HVAC': [
    `When someone's heat goes out at 10pm, they call the first HVAC company that answers.`,
    `Most HVAC companies lose emergency jobs not because they can't do the work — but because nobody answered the phone.`,
    `I came across {name} and wanted to share something that's been helping local service companies capture more after-hours calls.`,
  ],
  'Dental': [
    `New patients almost never call twice. If they hit your voicemail, they call the next dentist on the list.`,
    `Most dental offices lose 2–3 new patient calls a week simply because nobody answered — those are $1,500+ patients walking to a competitor.`,
    `I came across {name} and wanted to reach out about a way to capture new patient calls even when your front desk is with someone else.`,
  ],
  'Auto Repair': [
    `When someone's car breaks down, they call whoever answers first.`,
    `Most auto shops lose a handful of jobs every week to voicemail — the customer just calls the next shop.`,
    `I came across {name} and had a quick idea that's been helping local shops capture more appointment requests automatically.`,
  ],
  'Plumbing': [
    `A burst pipe at 11pm doesn't wait for business hours — and neither does the homeowner calling for help.`,
    `The plumber who answers first gets the job. Most after-hours calls go to whoever picks up, not whoever is best.`,
    `I came across {name} and wanted to share something that's been helping plumbing companies capture emergency calls around the clock.`,
  ],
};

function getOpener(campaign, businessName) {
  const options = OPENERS[campaign.industry] || [
    `I came across ${businessName} and wanted to reach out about something that might be useful.`,
  ];
  const line = options[Math.floor(Math.random() * options.length)];
  return line.replace('{name}', businessName);
}

function getTemplate(business, campaign, config) {
  const opener = getOpener(campaign, business.name);

  const subject = `Quick question about ${business.name}`;

  const body = `Hi there,

${opener}

I build AI voice agents for local businesses — an AI that answers calls 24/7, captures leads or service requests, and routes emergencies to the right person. It works even when your team isn't available.

The issue I keep hearing from ${campaign.industry.toLowerCase()} companies is ${campaign.painPoint}. ${campaign.valueLine}

I built this for a property management company in Northern Colorado and it's been running live. You can see the live dashboard here:

👉 ${config.demoUrl}

Setup takes about a week. It runs for $250/month after a one-time setup fee. No long-term contract.

Would a 15-minute call be worth it to see if it makes sense for ${business.name}?

Best,
${config.senderName}
Fort Collins, CO

---
Reply "unsubscribe" to be removed from future emails.`;

  return { subject, body };
}

module.exports = { getTemplate };
