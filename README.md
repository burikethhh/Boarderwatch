# BoardersWatch

Web-based boarding house management system with integrated CCTV monitoring for Day N Earth Lucero Boarding House.

## Tech Stack

- **Frontend**: React.js 18, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js 5, SQLite (better-sqlite3)
- **Auth**: JWT + bcrypt
- **CCTV**: RTSP via FFmpeg, WebRTC relay
- **Notifications**: Twilio (SMS), SendGrid (Email)
- **Cron**: node-cron for lease expiry + camera health checks

## Features

- Dashboard with real-time metrics and live polling
- Tenant management (CRUD with search/filter)
- Room management (grid view, occupancy tracking)
- Lease management (create, renew, expiry alerts)
- Payment tracking (receipts, collection analytics)
- CCTV monitoring (plug-and-play camera setup, motion detection alerts)
- Notifications (system, SMS, email)
- Reports (PDF/Excel export)
- Settings (boarding house config, camera setup, notification config)

## Quick Start

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install

# Seed database
cd server && npm run seed

# Start development
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

Login: `admin` / `admin123`

## Deployment

### Render
1. Push to GitHub
2. Create new Web Service on render.com
3. Build: `cd server && npm install`
4. Start: `cd server && node src/index.js`
5. Set env: `NODE_ENV=production`, `JWT_SECRET=<random>`

### Docker
```bash
docker build -t boarderswatch .
docker run -p 3000:3000 -e JWT_SECRET=your-secret boarderswatch
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| JWT_SECRET | JWT signing secret | (required) |
| DB_PATH | SQLite database path | ./data/boarderswatch.db |
| CLIENT_URL | Frontend URL for CORS | http://localhost:5173 |
| TWILIO_ACCOUNT_SID | Twilio Account SID | (optional) |
| TWILIO_AUTH_TOKEN | Twilio Auth Token | (optional) |
| TWILIO_PHONE_NUMBER | Twilio phone number | (optional) |
| SENDGRID_API_KEY | SendGrid API key | (optional) |
