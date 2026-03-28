import React, { useEffect, useMemo, useState } from "react";
import "../../styles/auth.css";
import api from "../../services/api";

export default function DashboardSelect() {
  const [debates, setDebates] = useState([]);
  const [fixturesOpen, setFixturesOpen] = useState(false);
  const [fixtureError, setFixtureError] = useState("");

  useEffect(() => {
    api.get("/debates")
      .then((res) => {
        setDebates(Array.isArray(res.data) ? res.data : []);
      })
      .catch((error) => {
        console.error("Failed to load fixtures:", error);
        setFixtureError("Unable to load fixtures right now.");
      });
  }, []);

  const { upcomingFixtures, pastFixtures } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizedDebates = debates.map((debate) => {
      const matchup = getMatchup(debate.team_pair);
      const debateDate = parseDebateDate(debate.debate_date);

      return {
        ...debate,
        matchup,
        debateDate
      };
    });

    const upcoming = normalizedDebates
      .filter((debate) => debate.debateDate && debate.debateDate >= today)
      .sort((a, b) => a.debateDate - b.debateDate);

    const past = normalizedDebates
      .filter((debate) => debate.debateDate && debate.debateDate < today)
      .sort((a, b) => b.debateDate - a.debateDate);

    return {
      upcomingFixtures: upcoming,
      pastFixtures: past
    };
  }, [debates]);

  return (
    <div className="auth-container">
      <div className="auth-box dashboard-select dashboard-select-wide">
        <h2>Select Dashboard</h2>

        <div className="dashboard-select-buttons">
          <button onClick={() => window.location = "/admin/register"}>
            Admin Dashboard
          </button>

          <button onClick={() => window.location = "/debater/register"}>
            Debater Dashboard
          </button>

          <button onClick={() => window.location = "/audience/register"}>
            Audience Dashboard
          </button>

          <button onClick={() => window.location = "/result"}>
            Result Dashboard
          </button>
        </div>

        <div className="fixture-panel">
          <div className="fixture-panel-header">
            <div>
              <h3>Team Fixtures</h3>
              <p>See upcoming and past team assignments, including which team is matched against which opponent.</p>
            </div>
            <button type="button" onClick={() => setFixturesOpen((prev) => !prev)}>
              {fixturesOpen ? "Hide Fixtures" : "Show Fixtures"}
            </button>
          </div>

          {fixtureError && <p className="fixture-error">{fixtureError}</p>}

          {fixturesOpen && (
            <div className="fixture-sections">
              <FixtureSection
                title="Upcoming Fixtures"
                emptyText="No upcoming fixtures available."
                fixtures={upcomingFixtures}
              />
              <FixtureSection
                title="Past Fixtures"
                emptyText="No past fixtures available."
                fixtures={pastFixtures}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FixtureSection({ title, fixtures, emptyText }) {
  return (
    <section className="fixture-section">
      <h4>{title}</h4>
      {fixtures.length === 0 ? (
        <p className="fixture-empty">{emptyText}</p>
      ) : (
        <div className="fixture-grid">
          {fixtures.map((fixture) => (
            <article key={fixture.id} className="fixture-card">
              <div className="fixture-card-matchup">
                <span className="fixture-team">{fixture.matchup.teamA}</span>
                <span className="fixture-vs">vs</span>
                <span className="fixture-team">{fixture.matchup.teamB}</span>
              </div>
              <p className="fixture-line">
                <b>Assigned:</b> {fixture.matchup.teamA} vs {fixture.matchup.teamB}
              </p>
              <p className="fixture-line">
                <b>Debate:</b> {fixture.title}
              </p>
              <p className="fixture-line">
                <b>Date:</b> {fixture.debate_date}
              </p>
              <p className="fixture-line">
                <b>Duration:</b> {fixture.duration} minutes
              </p>
              <p className="fixture-line">
                <b>Status:</b> {fixture.status}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function getMatchup(teamPair) {
  const teams = String(teamPair || "")
    .split(/\s+vs\s+/i)
    .map((team) => team.trim())
    .filter(Boolean);

  return {
    teamA: teams[0] || "Team A",
    teamB: teams[1] || "Team B"
  };
}

function parseDebateDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const parsed = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
