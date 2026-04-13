require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const { getTemplate } = require('./templates');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS },
});

const CONFIG = {
  demoUrl:     'https://mnp-lead-api.onrender.com',
  senderName:  'Will Egger',
  gmailUser:   process.env.GMAIL_USER,
};

const TEST_SENDS = [
  {
    to: 'cannonbonifay@gmail.com',
    business: { name: 'Luxe Hair Studio', phone: '(970) 555-2847', website: 'luxehairstudio.com' },
    campaign: {
      industry:   'Hair Salon',
      queries:    [],
      painPoint:  'appointment requests and new client calls going to voicemail',
      valueLine:  'A new client is worth $800–$1,200/year in repeat visits — one missed call is real money.',
    },
  },
  {
    to: 'will.egger2004@gmail.com',
    business: { name: 'Peak HVAC Solutions', phone: '(970) 555-4193', website: 'peakhvac.com' },
    campaign: {
      industry:   'HVAC',
      queries:    [],
      painPoint:  'emergency calls going to voicemail after hours',
      valueLine:  'One missed emergency call is a $500+ job going to your competitor.',
    },
  },
  {
    to: 'will.brahmas@gmail.com',
    business: { name: 'Frontier Dental Care', phone: '(970) 555-7731', website: 'frontierdentalcare.com' },
    campaign: {
      industry:   'Dental',
      queries:    [],
      painPoint:  'new patient calls going unanswered',
      valueLine:  'A new patient is worth $1,500+ in lifetime revenue.',
    },
  },
];

async function run() {
  for (const send of TEST_SENDS) {
    const { subject, body } = getTemplate(send.business, send.campaign, CONFIG);
    await transporter.sendMail({
      from:    `${CONFIG.senderName} <${CONFIG.gmailUser}>`,
      to:      send.to,
      subject,
      text:    body,
    });
    console.log(`✓ Sent to ${send.to} — ${send.campaign.industry} (${send.business.name})`);
  }
  console.log('\nAll test emails sent.');
}

run().catch(console.error);
