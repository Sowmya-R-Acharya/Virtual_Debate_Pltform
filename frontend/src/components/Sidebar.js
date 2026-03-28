import "../styles/dashboard.css";

export default function Sidebar({ links }) {
  return (
    <div className="sidebar">
      {links.map((l, i) => (
        <button
          key={i}
          onClick={() => window.location = l.path}
          className="sidebar-btn"
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
