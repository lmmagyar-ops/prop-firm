# Funded Prediction — Waitlist / Landing Page

Standalone Next.js application serving the public-facing landing page and waitlist signup at `predictionsfirm.com`. Deployed independently to Vercel.

## Overview

This app is co-located with the main platform in this repository for shared context, but deployed as a separate Vercel project. It does not share code or infrastructure with the main app (`src/`).

**Production URL:** `predictionsfirm.com`

## Features

- Public landing page
- Waitlist email capture via [Resend](https://resend.com)
- Welcome email on signup

## Development

```bash
cd propshot-waitlist
npm install
npm run dev   # runs on :3002 to avoid conflict with main app (:3000)
```

## Environment Variables

```env
RESEND_API_KEY=re_...          # Resend API key
RESEND_AUDIENCE_ID=...         # Resend audience UUID for waitlist contacts
```

## Deployment

Deployed to its own Vercel project. DNS, SPF, DKIM, and MX records are configured on `predictionsfirm.com` separately from the main app domain.

See [`ARCHITECTURE.md`](../ARCHITECTURE.md#7-waitlist-system) at the root for full system context.
