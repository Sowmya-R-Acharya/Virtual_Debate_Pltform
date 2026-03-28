## Implementation Plan for Fully Functional Debate Platform

### Database Updates
- [ ] Update debate_platform.sql: add user_id to votes table to prevent multiple votes per user.

### Backend Implementation
- [ ] Update voteModel.js: modify submitVote to include rating, comment, and use user_id.
- [ ] Update voteController.js: update vote function to handle rating, comment.
- [ ] Implement resultModel.js: add publishResult and getLatest functions.
- [ ] Update resultController.js: implement publishResult and getLatestResult.
- [ ] Update submissionController.js if needed (seems implemented).
- [ ] Create .env file with JWT_SECRET and DB credentials.

### Frontend Implementation
- [ ] Update VoteDebate.js: fetch approved debates from API, submit vote to API instead of localStorage.
- [ ] Update ReviewVotes.js: fetch votes from API instead of localStorage.
- [ ] Implement submission in DebaterDashboard.js: track start/end times, submit with performed minutes.
- [ ] Implement FinalizeResult.js: fetch votes, calculate winner based on votes, publish result.
- [ ] Update any other frontend files if needed.

### Testing and Validation
- [ ] Test server startup.
- [ ] Test user flows: admin create team/debate, debater register/login/submit, audience register/login/vote.
- [ ] Add validation and error handling.
- [ ] Ensure only admin-created teams for registration.
