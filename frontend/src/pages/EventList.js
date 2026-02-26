// src/pages/EventList.js
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:3001";

export default function EventList() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    axios.get(`${API}/api/events`)
      .then(r => setEvents(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.venue?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.title}>Upcoming Events</h1>
          <p style={s.subtitle}>Discover and mint NFT tickets on the blockchain</p>
        </div>
        <div style={s.searchWrap}>
          <span className="material-symbols-outlined" style={s.searchIcon}>search</span>
          <input
            style={s.searchInput}
            placeholder="Search events or venues..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Stats Row */}
      <div style={s.statsRow}>
        <StatCard icon="event" label="Total Events"  value={events.length} />
        <StatCard icon="sell"  label="Active Events" value={events.filter(e => e.isActive).length} color />
        <StatCard icon="group" label="Tickets Sold"  value={events.reduce((a, e) => a + (e.ticketsMinted || 0), 0)} />
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={s.center}><div style={s.spinner} /></div>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#6b6455" }}>event_busy</span>
          <p style={{ color: "#6b6455", marginTop: "1rem" }}>
            {search ? "No events match your search" : "No events yet. Check back soon!"}
          </p>
        </div>
      ) : (
        <div style={s.grid} className="animate-in">
          {filtered.map(ev => <EventCard key={ev.eventId} ev={ev} />)}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={s.statCard} className="glass">
      <div style={{ ...s.statIcon, background: color ? "rgba(226,201,126,0.15)" : "rgba(226,201,126,0.06)" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", color: "#e2c97e" }}>{icon}</span>
      </div>
      <div>
        <div style={s.statValue}>{value}</div>
        <div style={s.statLabel}>{label}</div>
      </div>
    </div>
  );
}

function EventCard({ ev }) {
  const sold   = ev.ticketsMinted || 0;
  const total  = ev.totalSupply   || 0;
  const pct    = total > 0 ? Math.round((sold / total) * 100) : 0;
  const soldOut = sold >= total && total > 0;

  return (
    <div style={s.card}>
      {/* Card top band */}
      <div style={s.cardBand}>
        <span style={{ ...s.statusPill, background: ev.isActive ? "rgba(34,197,94,0.15)"
      : "rgba(239,68,68,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
          {ev.isActive ? "● On Sale" : "● Inactive"}
        </span>
        <span style={s.eventId}>#{ev.eventId}</span>
      </div>

      <h3 style={s.cardTitle}>{ev.name}</h3>

      <div style={s.cardMeta}>
        <div style={s.metaRow}>
          <span className="material-symbols-outlined" style={s.metaIcon}>calendar_month</span>
          {ev.date}
        </div>
        <div style={s.metaRow}>
          <span className="material-symbols-outlined" style={s.metaIcon}>location_on</span>
          {ev.venue}
        </div>
      </div>

      {/* Progress */}
      <div style={s.progressWrap}>
        <div style={s.progressTrack}>
          <div style={{
            ...s.progressFill,
            width: `${pct}%`,
            background: pct > 80 ? "#ef4444" : "#e2c97e",
            boxShadow: pct > 80 ? "0 0 8px rgba(239,68,68,0.4)" : "0 0 8px rgba(226,201,126,0.4)",
          }} />
        </div>
        <span style={s.progressLabel}>{sold}/{total} sold · {pct}%</span>
      </div>

      <div style={s.cardFooter}>
        <div>
          <div style={s.priceLabel}>Price</div>
          <div style={s.price}>{ev.ticketPrice} ETH</div>
        </div>
        <Link
          to={`/events/${ev.eventId}`}
          style={{
            ...s.buyBtn,
            ...(soldOut || !ev.isActive ? s.buyBtnDisabled : {}),
          }}
          onClick={e => (soldOut || !ev.isActive) && e.preventDefault()}
        >
          {soldOut ? "Sold Out" : "Buy Ticket"}
          {!soldOut && ev.isActive && (
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_forward</span>
          )}
        </Link>
      </div>
    </div>
  );
}

const s = {
  page:     { flex: 1, padding: "2.5rem 3rem", overflowY: "auto" },
  header:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  title:    { fontSize: "2rem", fontWeight: 700, color: "#f1ead6", letterSpacing: "-0.5px" },
  subtitle: { color: "#6b6455", marginTop: "0.25rem", fontSize: "0.9rem" },
  searchWrap: { position: "relative", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: "12px", color: "#6b6455", fontSize: "1.1rem" },
  searchInput: { paddingLeft: "2.5rem", width: "260px", background: "rgba(226,201,126,0.05)", border: "1px solid rgba(226,201,126,0.1)", borderRadius: "10px", color: "#f1ead6", padding: "10px 12px 10px 2.5rem" },

  statsRow:  { display: "flex", gap: "1rem", marginBottom: "2rem" },
  statCard:  { flex: 1, display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem 1.5rem", borderRadius: "14px" },
  statIcon:  { width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: "1.5rem", fontWeight: 700, color: "#f1ead6" },
  statLabel: { fontSize: "0.75rem", color: "#6b6455", marginTop: "2px" },

  grid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" },
  card:   { background: "#252118", border: "1px solid rgba(226,201,126,0.08)", borderRadius: "16px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", transition: "border-color 0.2s, transform 0.2s" },

  cardBand:   { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statusPill: { fontSize: "0.72rem", padding: "3px 10px", borderRadius: "20px", fontWeight: 600 },
  eventId:    { fontSize: "0.72rem", color: "#6b6455", fontFamily: "monospace" },
  cardTitle:  { fontSize: "1.2rem", fontWeight: 700, color: "#f1ead6", lineHeight: 1.3 },

  cardMeta: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  metaRow:  { display: "flex", alignItems: "center", gap: "0.4rem", color: "#9b8f7a", fontSize: "0.83rem" },
  metaIcon: { fontSize: "0.95rem", color: "#6b6455" },

  progressWrap:  { display: "flex", flexDirection: "column", gap: "0.35rem" },
  progressTrack: { background: "rgba(226,201,126,0.08)", borderRadius: "4px", height: "5px", overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: "4px", transition: "width 0.5s ease" },
  progressLabel: { fontSize: "0.72rem", color: "#6b6455" },

  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" },
  priceLabel: { fontSize: "0.72rem", color: "#6b6455" },
  price:      { fontSize: "1.25rem", fontWeight: 700, color: "#e2c97e" },
  buyBtn:     { display: "flex", alignItems: "center", gap: "0.35rem", background: "#e2c97e", color: "#1f1c13", padding: "9px 18px", borderRadius: "10px", fontWeight: 700, textDecoration: "none", fontSize: "0.88rem", transition: "box-shadow 0.2s" },
  buyBtnDisabled: { background: "rgba(226,201,126,0.15)", color: "#6b6455", cursor: "not-allowed" },

  center:  { display: "flex", justifyContent: "center", alignItems: "center", height: "40vh" },
  spinner: { width: "36px", height: "36px", border: "3px solid rgba(226,201,126,0.1)", borderTop: "3px solid #e2c97e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  empty:   { textAlign: "center", padding: "5rem 0", display: "flex", flexDirection: "column", alignItems: "center" },
};
