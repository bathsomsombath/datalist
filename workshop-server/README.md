# 🔧 Workshop Controller

A small web app for running an **auto-repair garage** — track customers, vehicles,
and job cards through their lifecycle, with parts/labour line items and live totals.

Built as a conventional multi-file web app:

- **Backend:** Node.js + [Express](https://expressjs.com/) REST API
- **Database:** SQLite via Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) (no native build step)
- **Frontend:** static HTML/CSS/vanilla-JS single-page app served from `public/`

## Requirements

- Node.js **≥ 22.5** (for the built-in `node:sqlite` module)

## Getting started

```bash
cd workshop-server
npm install          # installs express
npm run seed         # optional: load sample customers / vehicles / jobs
npm start            # serves http://localhost:3000
```

Then open <http://localhost:3000>.

The database lives at `data/workshop.db` (created automatically, git-ignored).
Delete that file to start from an empty shop.

## Features

- **Dashboard** — open-job counts, overdue alerts, value of open vs. invoiced work, and a jobs-by-status breakdown.
- **Job cards** — status workflow **Booked → In Progress → Awaiting Parts → Ready → Completed → Invoiced**, priority, technician, odometer, dates, parts & labour line items, configurable tax, live totals, and a printable job card / invoice.
- **Customers & Vehicles** — linked records with cascade handling on delete.
- **Settings** — default labour rate, currency, tax rate, and technician roster.

## Project layout

```
workshop-server/
├── server.js          Express app + REST routes
├── db.js              SQLite schema + repository functions
├── seed.js            Sample data loader (npm run seed)
├── package.json
└── public/            Frontend SPA
    ├── index.html
    ├── styles.css
    └── app.js
```

## API

| Method | Path                       | Description                         |
|--------|----------------------------|-------------------------------------|
| GET    | `/api/state`               | Everything (bootstrap payload)      |
| GET/POST/PUT/DELETE | `/api/customers[/:id]` | CRUD customers           |
| GET/POST/PUT/DELETE | `/api/vehicles[/:id]`  | CRUD vehicles            |
| GET/POST/PUT/DELETE | `/api/jobs[/:id]`      | CRUD jobs (nested line items) |
| PATCH  | `/api/jobs/:id/status`     | Update only a job's status          |
| GET/POST | `/api/techs`             | List / add technicians              |
| DELETE | `/api/techs/:name`         | Remove a technician                 |
| GET/PUT | `/api/settings`           | Read / update shop settings         |

## Environment variables

- `PORT` — HTTP port (default `3000`)
- `WORKSHOP_DB` — path to the SQLite file (default `data/workshop.db`)
