# Email Notification Backend Server

Express.js server for sending email notifications to caregivers.

## Environment Variables

Create a `.env` file in this directory:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
PORT=3001
FIREBASE_PROJECT_ID=pill-81bf4
FIREBASE_API_KEY=AIzaSyBwDWBlbqBi2rfrjOXhvab55u73dO0LVGI
```

## Local Development

```bash
npm install
npm start
# or
npm run dev  # with nodemon for auto-reload
```

Server runs on `http://localhost:3001`

## Deployment

See `../BACKEND_DEPLOYMENT.md` for deployment instructions to Railway, Render, or Heroku.

## API Endpoints

- `POST /api/email/reminder` - Send medication reminder
- `POST /api/email/dose-status` - Send dose taken/missed notification
- `POST /api/email/low-stock` - Send low stock alert
- `GET /api/health` - Health check
