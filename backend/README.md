# Backend for Virtual Debate Platform

This directory contains the Node.js/Express API server for the Virtual Debate Platform.

## Setup

1. `cd backend`
2. `npm install`
3. Set environment variables as needed (e.g. database credentials in `config/db.js`).

## Run

- Development: `npm run dev` or `node server.js`

## Project structure

- `server.js`: Express app entrypoint
- `config/`: DB connection and environment config
- `controllers/`: route handlers
- `models/`: Sequelize (or the DB library) models
- `routes/`: API route definitions
- `services/`: business logic and external integrations (e.g. Gemini AI service)
- `middlewares/`: auth and permission checks

## Notes

- Current commit author is set to `sowmya-r-acharya` for this workspace.
- Existing backend tests and endpoints can be expanded per feature requirements.
