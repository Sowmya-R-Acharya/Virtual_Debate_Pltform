# Debate Platform - Development Summary

This README documents the key features implemented and improvements made to the debate platform project, including SQL database setup, AI-powered demo debate generation, backend fixes and enhancements, and UI modifications.

## 1. SQL Database Setup
- **Database**: MariaDB/MySQL database named `debate_platform`.
- **Schema**: Complete schema defined in `debate_platform.sql` (phpMyAdmin dump).
  - **Tables**:
    | Table                  | Purpose |
    |------------------------|---------|
    | `users`               | Users with roles (ADMIN, DEBATER, AUDIENCE), email (scoped unique by team/slot), team_name, slot. |
    | `teams`               | Debate teams created by admins. |
    | `debates`             | Debate events with title, topic, team_pair, date, duration, status (CREATED/SUBMITTED/APPROVED/REJECTED). |
    | `submissions`         | Debater audio/video submissions with transcript, performed_minutes, status. |
    | `votes`               | Audience votes/ratings (1-5) with comments. |
    | `results`             | Final debate results with winning_team, average_rating. |
    | `live_debate_messages`| Real-time voice messages during live debates. |
  - **Sample Data**: Pre-populated debates (e.g., "Should AI be integrated into every classroom?").
  - **Constraints**: Foreign keys, indexes (e.g., unique_user_identity on email/role/unique_scope), AUTO_INCREMENT.
- **Setup Scripts**:
  - `backend/fix-email-unique-constraint.js`: Added `unique_scope` for multi-role same-email support.
  - `backend/insert-teams.js`: Seeds teams.
  - `backend/add-debates-performed-minutes.js`, `backend/fix-teams-id-auto-increment.js`, etc.: Schema updates and fixes.

**Import**: Run `debate_platform.sql` in phpMyAdmin or MySQL workbench.

## 2. AI Feature for Demo Debate
- **Purpose**: Generate demo debate scripts for testing/practice using Google Gemini AI.
- **Endpoints**: `/api/ai-debate/generate` (POST with topic, title, team_pair, duration).
- **Key Files**:
  - `backend/controllers/aiDebateController.js`: Handles request, validates topic.
  - `backend/services/geminiDebateService.js`: Calls Gemini API (`gemini-3-flash-preview`), enforces JSON schema for structured output.
- **Output Format**:
  ```json
  {
    "title": "string",
    "topic": "string",
    "turns": [
      { "side": "Proposition/Opposition", "speaker": "string", "text": "2-4 sentences" }
    ]
  }
  ```
- **Features**: Balanced 4 turns (Prop, Opp, Prop, Opp), concise for voice playback, configurable via `GEMINI_API_KEY`.

## 3. Backend Enhancements
- **Framework**: Node.js/Express with MySQL2.
- **Key Components**:
  | Module       | Files |
  |--------------|-------|
  | Auth/JWT    | `authController.js`, `authMiddleware.js` |
  | Submissions | `submissionController.js`, `submissionRoutes.js`, `submissionModel.js` |
  | Debates     | `debateController.js`, `debateModel.js` |
  | Votes       | `voteController.js`, `voteModel.js` |
  | Live        | `liveDebateMessageController.js`, `liveDebateMessageModel.js` |
  | Teams/Results | `teamController.js`, `resultController.js` |
- **Fixes**:
  - Resolved `submissionController.js` ReferenceError (TODO.md).
  | Fix Script | Description |
  |------------|-------------|
  | `fix-email-unique-constraint.js` | Scoped unique emails. |
  | `fix-votes-id-autoincrement.js` | ID fixes. |
  - Server: `server.js` with routes mounted.
- **Dependencies**: `dotenv`, `mysql2`, `jsonwebtoken`, etc. (backend/package.json).

## 4. UI Modifications (React Frontend)
- **Changes**: Custom pages, components, styles for debate workflow.
- **Key Pages**:
  | Role      | Pages |
  |-----------|-------|
  | Admin    | AdminDashboard.js, ReviewSubmissions.js, CreateDebate.js, FinalizeResult.js |
  | Debater  | DebaterDashboard.js, SubmitDebate.js, StartDebate.js |
  | Audience | AudienceDashboard.js, VoteDebate.js |
- **Components**: Header.js, Sidebar.js, Timer.js, ProtectedRoute.js.
- **Styles**: `dashboard.css`, `auth.css`, `theme.css` for responsive dashboards, forms.
- **API Integration**: `api.js` for backend calls.

## Running the Project
1. **Database**: Import `debate_platform.sql`.
2. **Backend**:
   ```
   cd backend
   npm install
   set GEMINI_API_KEY=your_key
   node server.js
   ```
3. **Frontend**:
   ```
   cd frontend
   npm install
   npm start
   ```
4. **Test AI Demo**: POST to `/api/ai-debate/generate` with topic.

## File Structure Overview
```
project/
├── debate_platform.sql
├── backend/ (server, controllers, models, routes, services)
├── frontend/ (React app, pages, components, styles)
├── TODO.md (progress tracking)
└── readme_1.md
```

Project now supports full debate lifecycle: create debates → submit → review → vote → results + AI demos and live voice.
