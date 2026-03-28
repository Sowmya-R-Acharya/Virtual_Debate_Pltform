import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

/* Auth */
import ProjectLogin from "./pages/auth/ProjectLogin";
import DashboardSelect from "./pages/auth/DashboardSelect";

/* Admin */
import AdminRegister from "./pages/admin/AdminRegister";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateTeam from "./pages/admin/CreateTeam";
import CreateDebate from "./pages/admin/CreateDebate";
import ReviewSubmissions from "./pages/admin/ReviewSubmissions";
import ReviewVotes from "./pages/admin/ReviewVotes";
import FinalizeResult from "./pages/admin/FinalizeResult";

/* Debater */
import DebaterRegister from "./pages/debater/DebaterRegister";
import DebaterLogin from "./pages/debater/DebaterLogin";
import DebaterDashboard from "./pages/debater/DebaterDashboard";
import StartDebate from "./pages/debater/StartDebate";
import SubmitDebate from "./pages/debater/SubmitDebate";

/* Audience */
import AudienceRegister from "./pages/audience/AudienceRegister";
import AudienceLogin from "./pages/audience/AudienceLogin";
import AudienceDashboard from "./pages/audience/AudienceDashboard";
import VoteDebate from "./pages/audience/VoteDebate";

/* Result */
import ResultDashboard from "./pages/result/ResultDashboard";

export default function App() {
  return (
    <Router>
      <Routes>

        {/* Project Login */}
        <Route path="/" element={<ProjectLogin />} />
        <Route path="/dashboard-select" element={<DashboardSelect />} />

        {/* Admin */}
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/create-team" element={<CreateTeam />} />
        <Route path="/admin/create" element={<CreateDebate />} />
        <Route path="/admin/submissions" element={<ReviewSubmissions />} />
        <Route path="/admin/votes" element={<ReviewVotes />} />
        <Route path="/admin/result" element={<FinalizeResult />} />

        {/* Debater */}
        <Route path="/debater/register" element={<DebaterRegister />} />
        <Route path="/debater/login" element={<DebaterLogin />} />
        <Route path="/debater/dashboard" element={<DebaterDashboard />} />
        <Route path="/debater/start" element={<StartDebate />} />
        <Route path="/debater/submit" element={<SubmitDebate />} />

        {/* Audience */}
        <Route path="/audience/register" element={<AudienceRegister />} />
        <Route path="/audience/login" element={<AudienceLogin />} />
        <Route path="/audience/dashboard" element={<AudienceDashboard />} />
        <Route path="/audience/vote" element={<VoteDebate />} />

        {/* Result */}
        <Route path="/result" element={<ResultDashboard />} />

      </Routes>
    </Router>
  );
}
