import Sidebar from "../../components/Sidebar";
import "../../styles/dashboard.css";

export default function AdminDashboard() {
  const links = [
    { label: "Create Team", path: "/admin/create-team" },
    { label: "Create Debate", path: "/admin/create" },
    { label: "Review Submissions", path: "/admin/submissions" },
    { label: "Review Votes", path: "/admin/votes" },
    { label: "Finalize Result", path: "/admin/result" }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-wrapper">
        <Sidebar links={links} />
        <div className="content">
          <h2>Admin Dashboard</h2>
          <p>Create debates and manage workflow.</p>
        </div>
      </div>
    </div>
  );
}
