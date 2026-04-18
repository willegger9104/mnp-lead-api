require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const { getTemplate } = require('./templates');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS },
});

const CONFIG = {
  demoUrl:    'https://mnp-lead-api.onrender.com',
  senderName: 'Will Egger',
  gmailUser:  process.env.GMAIL_USER,
};

const TEST_SENDS = [
  {
    to: 'outreachfrontrange@gmail.com',
    label: 'Property Management',
    business: { name: 'Evergreen Property Management', phone: '(970) 226-5600', website: 'ftcrent.com' },
    campaign: { industry: 'Property Management', demoSlug: 'property', painPoint: 'missed after-hours rental inquiries', valueLine: 'One missed housing lead is a month of lost rent.' },
  },
  {
    to: 'outreachfrontrange@gmail.com',
    label: 'HVAC',
    business: { name: 'Peak HVAC Solutions', phone: '(970) 555-4193', website: 'peakhvac.com' },
    campaign: { industry: 'HVAC', demoSlug: 'hvac', painPoint: 'emergency calls going to voicemail after hours', valueLine: 'One missed emergency call is a $500+ job going to your competitor.' },
  },
  {
    to: 'outreachfrontrange@gmail.com',
    label: 'Dental',
    business: { name: 'Frontier Dental Care', phone: '(970) 555-7731', website: 'frontierdentalcare.com' },
    campaign: { industry: 'Dental', demoSlug: 'dental', painPoint: 'new patient calls going unanswered', valueLine: 'A new patient is worth $1,500+ in lifetime revenue.' },
  },
  {
    to: 'outreachfrontrange@gmail.com',
    label: 'Hair Salon',
    business: { name: 'Luxe Hair Studio', phone: '(970) 555-2847', website: 'luxehairstudio.com' },
    campaign: { industry: 'Hair Salon', demoSlug: 'salon', painPoint: 'appointment requests and new client calls going to voicemail', valueLine: 'A new client is worth $800–$1,200/year in repeat visits.' },
  },
  {
    to: 'outreachfrontrange@gmail.com',
    label: 'Auto Repair',
    business: { name: 'Summit Auto Repair', phone: '(970) 555-6612', website: 'summitautorepair.com' },
    campaign: { industry: 'Auto Repair', demoSlug: 'auto', painPoint: 'appointment requests going to voicemail', valueLine: 'Every missed call is a job your competitor books instead.' },
  },
  {
    to: 'outreachfrontrange@gmail.com',
    label: 'Plumbing',
    business: { name: 'RapidFlow Plumbing', phone: '(970) 555-3390', website: 'rapidflowplumbing.com' },
    campaign: { industry: 'Plumbing', demoSlug: 'plumbing', painPoint: 'emergency plumbing calls missed after hours', valueLine: 'Emergency plumbing jobs average $300–$600 a visit.' },
  },
];

async function run() {
  for (const send of TEST_SENDS) {
    const { subject, body } = getTemplate(send.business, send.campaign, CONFIG);
    await transporter.sendMail({
      from:    `${CONFIG.senderName} <${CONFIG.gmailUser}>`,
      to:      send.to,
      subject: `[${send.label} Demo] ${subject}`,
      text:    body,
    });
    console.log(`✓ Sent ${send.label} demo → ${send.to}`);
  }
  console.log('\nAll 6 demo emails sent.');
}

run().catch(console.error);
