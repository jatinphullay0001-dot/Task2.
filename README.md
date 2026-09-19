# Lead Desk — Client Lead Management System (Mini CRM)

Future Interns · Full Stack Web Development · Task 2

A small CRM for the leads that arrive through a website contact form: list them,
move them through the pipeline, and log every follow-up against the lead.

**Live demo:** _(paste your deployed link here)_

## Features

- **Lead listing** — name, email, phone, company, source and status in one table, with search and filters
- **Status updates** — New → Contacted → Converted, plus Lost as a fourth outcome
- **Notes and follow-ups** — an append-only note timeline per lead, and a next-follow-up date that flags when it goes overdue
- **Secure admin access** — JWT auth, bcrypt-hashed passwords, every `/api/leads` route behind auth middleware
- **Contact-form intake** — `POST /api/leads/public` lets your website form drop leads straight in, no token needed
- **Dashboard stats** — counts per stage and a total of overdue follow-ups

## Stack

React 18 + Vite · Node.js + Express · MongoDB + Mongoose · JWT + bcryptjs

## Running it

Node 18+ and a MongoDB connection string (a free MongoDB Atlas cluster works).

```bash
# 1. Backend
cd server
npm install
npm run seed      # creates the admin user + sample leads
npm run dev       # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev       # http://localhost:5173
```

Seeded login: `admin@leaddesk.dev` / `admin123` — change it before deploying.

### Environment variables

Create `server/.env`:

```
PORT=5000
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/leaddesk
JWT_SECRET=replace-this-with-a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

For production, also set `VITE_API_URL` on the frontend host to your deployed backend URL.
In development you can skip it — Vite proxies `/api` to port 5000.

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create an admin account |
| POST | `/api/auth/login` | — | Exchange credentials for a JWT |
| GET | `/api/auth/me` | ✅ | Current user |
| GET | `/api/leads` | ✅ | List leads (`?status=`, `?source=`, `?search=`) |
| GET | `/api/leads/stats` | ✅ | Counts per stage + overdue total |
| POST | `/api/leads` | ✅ | Create a lead |
| GET | `/api/leads/:id` | ✅ | One lead with its notes |
| PUT | `/api/leads/:id` | ✅ | Update fields or status |
| DELETE | `/api/leads/:id` | ✅ | Delete a lead |
| POST | `/api/leads/:id/notes` | ✅ | Append a note |
| POST | `/api/leads/public` | — | Contact-form intake |

Send the token as `Authorization: Bearer <token>`.

## Project layout

```
server/
  models.js       User and Lead schemas (notes are a subdocument array)
  server.js       Express app, auth middleware, all routes and handlers
  seed.js         Admin user + sample leads
client/
  index.html      Page shell and all styles
  src/api.js      Fetch wrapper that attaches the JWT
  src/main.jsx    App, auth state, and every screen
```

## Deploying

- **Backend** — Render or Railway. Same env vars in the dashboard; build `npm install`, start `npm start`.
- **Frontend** — Vercel or Netlify. Build `npm run build`, output `dist`, set `VITE_API_URL`.
- Add the deployed frontend origin to `CLIENT_URL` so CORS lets it through.

## What I'd add next

Role-based access so reps only see their own leads, email alerts when a follow-up falls due, and a drag-and-drop Kanban view of the pipeline.
