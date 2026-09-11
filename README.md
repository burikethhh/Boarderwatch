# BoardersWatch

Web-based boarding house management system with integrated CCTV monitoring for Day N Earth Lucero Boarding House.

## Tech Stack

- **Frontend**: React.js 18, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js 5, SQLite (better-sqlite3)
- **Auth**: JWT + bcrypt
- **CCTV**: RTSP -> HLS via FFmpeg, ONVIF (pan/tilt/presets), server-side motion tracking
- **Notifications**: In-App Alerts + free Email (Brevo / Resend / Web3Forms / Gmail SMTP / FormSubmit)
- **Cron**: node-cron for lease expiry + camera health checks

## Features

- Dashboard with real-time metrics and live polling
- Tenant management (CRUD with search/filter)
- Room management (grid view, occupancy tracking)
- Lease management (create, renew, expiry alerts)
- Payment tracking (receipts, collection analytics)
- Live CCTV 1080p streaming (RTSP -> HLS in the browser)
- ONVIF pan / tilt control, camera presets, and auto-follow motion
- Server-side motion detection with live tracking overlay + evidence clips
- Motion alerts (in-app + email) with per-camera sensitivity
- Notifications (system alerts, email)
- Reports (PDF/Excel export)
- Settings (boarding house config, camera setup, email/notification config)

## Portable Demo Run (Windows, no install required)

Everything needed to run is committed, including a bundled Node runtime and the
server dependencies.

1. Clone this repository on the demo laptop.
2. Double-click **`BoardersWatch.exe`** (in the repo root).
   - It starts the server in production mode and opens `http://localhost:3000`.
3. Log in with **`admin` / `admin123`**.
4. Go to **CCTV Surveillance -> Add Camera** and enter your camera IP + camera
   account (e.g. `192.168.254.129` / `admin123` / `admin1234`), then **Save Camera**
   and **Start Stream**.

Keep the console window open while using the system; press ENTER to stop.

> **Using a phone hotspot:** connect both the laptop and the camera to a 2.4 GHz
> hotspot (client isolation OFF). Re-add the camera on the new Wi-Fi, then use
> **Auto-Fix IP** or edit the camera's IP in the UI. Streaming, motion, clips and
> PTZ work offline; email alerts require the phone to have mobile data.

If you prefer to run from source instead of the exe:

```bash
cd server && npm install
cd ../client && npm install && npm run build
cd ../server && set NODE_ENV=production && node src/index.js
```

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
| SENDGRID_API_KEY | SendGrid API key | (optional) |
