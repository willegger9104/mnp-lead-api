# Automated Cold Outreach — Setup Guide

## What this does
1. Searches Google Places for businesses by industry + location
2. Scrapes each business website for a contact email
3. Sends a personalized cold email with your demo link
4. Logs every send to Supabase so you never email the same business twice

---

## Step 1 — Supabase table
Open your Supabase SQL editor and run the contents of `setup.sql`

---

## Step 2 — Google Places API key
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable "Places API"
4. Go to Credentials → Create API Key
5. Copy the key

---

## Step 3 — Gmail App Password
1. Go to myaccount.google.com → Security
2. Turn on 2-Step Verification (if not already on)
3. Search "App Passwords" → Create one named "Outreach"
4. Copy the 16-character password (no spaces)

---

## Step 4 — Add to your .env file
Open `.env` in your mnp-lead-api folder and add:

```
GOOGLE_API_KEY=your_google_places_key_here
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASS=your16charapppassword
```

---

## Step 5 — Run it
```bash
cd C:\Users\wille\mnp-lead-api
node outreach/outreach.js
```

---

## Customizing
- **Add cities:** Edit the `LOCATIONS` array in `outreach.js`
- **Add industries:** Add a new object to `CAMPAIGNS` in `outreach.js`
- **Change email limit:** Edit `maxPerRun` in CONFIG (default: 20/run)
- **Change demo URL:** Edit `demoUrl` in CONFIG

---

## Limits (free tier)
| Tool | Free Limit |
|---|---|
| Google Places API | ~$200 credit (~28,000 requests) |
| Gmail via App Password | ~500 emails/day |
| Supabase | Unlimited inserts on free tier |

---

## To automate daily runs (Windows Task Scheduler)
1. Open Task Scheduler
2. Create Basic Task → "Daily Outreach"
3. Trigger: Daily at 9am
4. Action: Start a program
   - Program: `node`
   - Arguments: `outreach/outreach.js`
   - Start in: `C:\Users\wille\mnp-lead-api`
