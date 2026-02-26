// src/pages/AdminPanel.js
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import toast from "react-hot-toast";
import { useWallet } from "../context/WalletContext";

const API = "http://localhost:3001";

export default function AdminPanel() {
  const { account, contract, isOwner, connect } = useWallet();
  const [events,      setEvents]      = useState([]);
  const [stats,       setStats]       = useState({ total: 0, active: 0, revenue: "0", ticketsSold: 0 });
  const [form,        setForm]        = useState({ name: "", date: "", venue: "", ticketPrice: "", totalSupply: "", maxResalePct: "120" });
  const [creating,    setCreating]    = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [balance,     setBalance]     = useState("0");

  useEffect(() => {
    if (!account) return;
    axios.get(`${API}/api/events`).then(r => {
      const evs = r.data;
      setEvents(evs);
      setStats({
        total:      evs.length,
        active:     evs.filter(e => e.isActive).length,
        ticketsSold: evs.reduce((a, e) => a + (e.ticketsMinted || 0), 0),
      });
    });
    if (contract) {
      contract.accumulatedFees().then(f => setBalance(parseFloat(ethers.formatEther(f)).toFixed(4)));
    }
  }, [account, contract]);

  if (!account) return (
    <div style={s.page}>
      <div style={s.gated}>
        <div style={s.gatedIcon}><span className="material-symbols-outlined" style={{ fontSize: "2rem", color: "#e2c97e" }}>lock</span></div>
        <h2 style={s.gatedTitle}>Admin Access Required</h2>
        <p style={s.gatedSub}>Connect the owner wallet to access the dashboard</p>
        <button onClick={connect} style={s.btnPrimary}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>account_balance_wallet</span>
          Connect Wallet
        </button>
      </div>
    </div>
  );

  if (!isOwner) return (
    <div style={s.page}>
      <div style={s.gated}>
        <div style={s.gatedIcon}><span className="material-symbols-outlined" style={{ fontSize: "2rem", color: "#ef4444" }}>block</span></div>
        <h2 style={s.gatedTitle}>Access Denied</h2>
        <p style={s.gatedSub}>Only the contract owner can access this panel</p>
        <p style={{ fontFamily: "monospace", color: "#6b6455", fontSize: "0.8rem" }}>{account}</p>
      </div>
    </div>
  );

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name || !form.date || !form.venue || !form.ticketPrice || !form.totalSupply) {
      toast.error("All fields are required"); return;
    }
    setCreating(true);
    const tid = toast.loading("Confirm in MetaMask...");
    try {
      const tx = await contract.createEvent(
        form.name, form.date, form.venue,
        ethers.parseEther(form.ticketPrice),
        Number(form.totalSupply), Number(form.maxResalePct)
      );
      toast.loading("Creating event on-chain...", { id: tid });
      await tx.wait();
      toast.success("✅ Event created!", { id: tid });
      setForm({ name: "", date: "", venue: "", ticketPrice: "", totalSupply: "", maxResalePct: "120" });
    } catch (err) {
      toast.error(err?.reason || err?.message || "Failed", { id: tid });
    } finally {
      setCreating(false);
    }
  }

  async function handleWithdraw() {
    setWithdrawing(true);
    const tid = toast.loading("Withdrawing...");
    try {
      const tx = await contract.withdrawRevenue();
      await tx.wait();
      toast.success("Revenue withdrawn!", { id: tid });
      setBalance("0");
    } catch (err) {
      toast.error(err?.reason || err?.message || "No funds or failed", { id: tid });
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleDeactivate(eid) {
    const tid = toast.loading(`Deactivating event #${eid}...`);
    try {
      const tx = await contract.deactivateEvent(Number(eid));
      await tx.wait();
      toast.success(`Event #${eid} deactivated`, { id: tid });
      setEvents(ev => ev.map(e => e.eventId === eid ? { ...e, isActive: false } : e));
    } catch (err) {
      toast.error(err?.reason || err?.message || "Failed", { id: tid });
    }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard Overview</h1>
          <p style={s.subtitle}>Manage your ticketing ecosystem and event revenue.</p>
        </div>
        <div style={s.ownerPill}>
          <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>verified</span>
          Owner
        </div>
      </header>

      {/* Stats */}
      <div style={s.statsGrid}>
        <StatCard label="Total Sales"    value={stats.ticketsSold} trend="+12%" />
        <StatCard label="Active Events"  value={stats.active}      trend="+5%" />
        <StatCard label="Total Events"   value={stats.total}       trend="" gold />
      </div>

      {/* Main grid */}
      <div style={s.mainGrid}>
        {/* Create Event Form */}
        <div style={s.formCard}>
          <h3 style={s.cardTitle}>
            <span className="material-symbols-outlined" style={{ color: "#e2c97e" }}>add_circle</span>
            Create New Event
          </h3>
          <form onSubmit={handleCreate} style={s.form}>
            <div style={s.row2}>
              <Field label="Event Name"  value={form.name}         onChange={v => f("name", v)}         placeholder="e.g. Summer Music Festival" />
              <Field label="Venue"       value={form.venue}        onChange={v => f("venue", v)}        placeholder="Search for a venue..." icon="location_on" />
            </div>
            <div style={s.row3}>
              <Field label="Date"            value={form.date}         onChange={v => f("date", v)}         type="date" />
              <Field label="Ticket Price (ETH)" value={form.ticketPrice} onChange={v => f("ticketPrice", v)} placeholder="0.05" type="number" />
              <Field label="Max Capacity"    value={form.totalSupply}  onChange={v => f("totalSupply", v)}  placeholder="500" type="number" />
            </div>
            <Field label="Max Resale % (100 = no markup)" value={form.maxResalePct} onChange={v => f("maxResalePct", v)} placeholder="120" type="number" />
            <div style={s.formFooter}>
              <button type="button" style={s.btnOutline} onClick={() => setForm({ name: "", date: "", venue: "", ticketPrice: "", totalSupply: "", maxResalePct: "120" })}>
                Clear
              </button>
              <button type="submit" style={s.btnPrimary} disabled={creating}>
                {creating ? "Publishing..." : "Publish Event"}
              </button>
            </div>
          </form>
        </div>

        {/* Right column */}
        <div style={s.rightCol}>
          {/* Revenue Card */}
          <div style={s.revenueCard}>
            <div style={s.revenueIcon}>
              <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "rgba(31,28,19,0.3)" }}>account_balance</span>
            </div>
            <p style={s.revenueLabel}>Available Balance</p>
            <div style={s.revenueValue}>{balance} ETH</div>
            <button onClick={handleWithdraw} style={s.withdrawBtn} disabled={withdrawing}>
              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>outbound</span>
              {withdrawing ? "Withdrawing..." : "Withdraw Revenue"}
            </button>
          </div>

          {/* Deactivate Card */}
          <div style={s.deactivateCard} className="glass">
            <div style={s.deactivateHeader}>
              <div style={s.dangerIcon}>
                <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", color: "#ef4444" }}>block</span>
              </div>
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f1ead6" }}>Quick Deactivation</h4>
              </div>
            </div>
            <p style={s.deactivateSub}>Stop ticket sales immediately. This action is reversible.</p>
            <div style={s.eventList}>
              {events.filter(e => e.isActive).slice(0, 3).map(ev => (
                <div key={ev.eventId} style={s.eventRow}>
                  <span style={{ fontSize: "0.85rem", color: "#f1ead6", fontWeight: 500 }}>{ev.name}</span>
                  <button onClick={() => handleDeactivate(ev.eventId)} style={s.deactivateBtn}>
                    Deactivate
                  </button>
                </div>
              ))}
              {events.filter(e => e.isActive).length === 0 && (
                <p style={{ color: "#6b6455", fontSize: "0.82rem", textAlign: "center", padding: "0.5rem 0" }}>No active events</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, gold }) {
  return (
    <div style={{ ...s.statCard, ...(gold ? s.statCardGold : {}) }}>
      <div style={s.statGlow} />
      <p style={{ ...s.statLabel2, ...(gold ? { color: "rgba(31,28,19,0.7)" } : {}) }}>{label}</p>
      <div style={s.statBottom}>
        <span style={{ ...s.statValue, ...(gold ? { color: "#1f1c13" } : {}) }}>{value}</span>
        {trend && (
          <span style={{ ...s.statTrend, ...(gold ? { color: "#1f1c13" } : {}) }}>
            <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>trending_up</span>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", icon }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#9b8f7a" }}>{label}</label>
      <div style={{ position: "relative" }}>
        {icon && <span className="material-symbols-outlined" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "1rem", color: "#6b6455" }}>{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={icon ? { paddingLeft: "2.5rem" } : {}}
        />
      </div>
    </div>
  );
}

const s = {
  page:    { flex: 1, padding: "2.5rem 3rem", overflowY: "auto" },
  header:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  title:   { fontSize: "2rem", fontWeight: 700, color: "#f1ead6", letterSpacing: "-0.5px" },
  subtitle: { color: "#6b6455", marginTop: "0.25rem", fontSize: "0.9rem" },
  ownerPill: { display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(226,201,126,0.1)", border: "1px solid rgba(226,201,126,0.2)", color: "#e2c97e", fontSize: "0.82rem", fontWeight: 600, padding: "6px 14px", borderRadius: "20px" },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" },
  statCard:  { background: "rgba(226,201,126,0.04)", border: "1px solid rgba(226,201,126,0.08)", borderRadius: "14px", padding: "1.5rem", position: "relative", overflow: "hidden" },
  statCardGold: { background: "#e2c97e", border: "none" },
  statGlow:  { position: "absolute", right: "-16px", bottom: "-16px", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(226,201,126,0.08)", filter: "blur(20px)" },
  statLabel2: { fontSize: "0.78rem", color: "#9b8f7a", marginBottom: "1rem", fontWeight: 500 },
  statBottom: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
  statValue:  { fontSize: "2rem", fontWeight: 700, color: "#f1ead6" },
  statTrend:  { display: "flex", alignItems: "center", gap: "2px", fontSize: "0.82rem", color: "#22c55e", fontWeight: 700 },

  mainGrid:  { display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.5rem" },

  formCard:  { background: "#252118", border: "1px solid rgba(226,201,126,0.08)", borderRadius: "16px", padding: "2rem" },
  cardTitle: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", fontWeight: 700, color: "#f1ead6", marginBottom: "1.5rem" },
  form:      { display: "flex", flexDirection: "column", gap: "1rem" },
  row2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  row3:      { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" },
  formFooter: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem" },
  btnPrimary: { display: "flex", alignItems: "center", gap: "0.4rem", background: "#e2c97e", color: "#1f1c13", border: "none", padding: "11px 24px", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", fontFamily: "Space Grotesk, sans-serif" },
  btnOutline: { background: "transparent", border: "1px solid rgba(226,201,126,0.15)", color: "#9b8f7a", padding: "11px 20px", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem", fontFamily: "Space Grotesk, sans-serif" },

  rightCol:  { display: "flex", flexDirection: "column", gap: "1.25rem" },
  revenueCard: { background: "#e2c97e", borderRadius: "16px", padding: "1.75rem", position: "relative", overflow: "hidden" },
  revenueIcon: { position: "absolute", top: 0, right: 0, padding: "1rem" },
  revenueLabel: { fontSize: "0.85rem", fontWeight: 600, color: "rgba(31,28,19,0.7)", marginBottom: "0.25rem" },
  revenueValue: { fontSize: "2.2rem", fontWeight: 700, color: "#1f1c13", marginBottom: "1.25rem" },
  withdrawBtn: { width: "100%", background: "#1f1c13", color: "#e2c97e", border: "none", padding: "12px", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontFamily: "Space Grotesk, sans-serif" },

  deactivateCard:   { borderRadius: "16px", padding: "1.5rem" },
  deactivateHeader: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" },
  dangerIcon:       { width: "36px", height: "36px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" },
  deactivateSub:    { fontSize: "0.8rem", color: "#6b6455", marginBottom: "1rem" },
  eventList:        { display: "flex", flexDirection: "column", gap: "0.5rem" },
  eventRow:         { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(31,28,19,0.4)", border: "1px solid rgba(226,201,126,0.08)", borderRadius: "8px", padding: "0.6rem 0.9rem" },
  deactivateBtn:    { background: "none", border: "none", color: "#ef4444", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "Space Grotesk, sans-serif" },

  gated:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: "1rem" },
  gatedIcon:  { width: "64px", height: "64px", borderRadius: "16px", background: "rgba(226,201,126,0.08)", display: "flex", alignItems: "center", justifyContent: "center" },
  gatedTitle: { fontSize: "1.4rem", fontWeight: 700, color: "#f1ead6" },
  gatedSub:   { color: "#6b6455" },
};
