// src/pages/MyTickets.js
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useWallet } from "../context/WalletContext";

const API = "http://localhost:3001";

function buildQRImageUrl(tokenId, qrHash) {
  const data = JSON.stringify({ tokenId, qrHash });
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}

export default function MyTickets() {
  const { account, connect } = useWallet();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    axios.get(`${API}/api/tickets/owner/${account}`)
      .then(r => setTickets(r.data))
      .catch(() => toast.error("Failed to load tickets"))
      .finally(() => setLoading(false));
  }, [account]);

  if (!account) return (
    <div style={s.page}>
      <div style={s.connectState}>
        <div style={s.connectIcon}>
          <span className="material-symbols-outlined" style={{ fontSize: "2rem", color: "#e2c97e" }}>account_balance_wallet</span>
        </div>
        <h2 style={s.connectTitle}>Connect Your Wallet</h2>
        <p style={s.connectSub}>Connect MetaMask to view your NFT tickets</p>
        <button onClick={connect} style={s.btnPrimary}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>account_balance_wallet</span>
          Connect MetaMask
        </button>
      </div>
    </div>
  );

  const valid = tickets.filter(t => !t.isUsed).length;
  const used  = tickets.filter(t =>  t.isUsed).length;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>My Tickets</h1>
          <p style={s.subtitle}>
            <span style={s.mono}>{account.slice(0,6)}...{account.slice(-4)}</span>
          </p>
        </div>
        <div style={s.statsRow}>
          <div style={s.statPill}>
            <span style={{ color: "#22c55e" }}>●</span> {valid} Valid
          </div>
          <div style={s.statPill}>
            <span style={{ color: "#6b6455" }}>●</span> {used} Used
          </div>
        </div>
      </header>

      {loading ? (
        <div style={s.center}><div style={s.spinner} /></div>
      ) : tickets.length === 0 ? (
        <div style={s.empty}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#6b6455" }}>confirmation_number</span>
          <p style={{ color: "#6b6455", marginTop: "1rem" }}>No tickets found for this wallet.</p>
          <a href="/" style={s.browseLink}>Browse Events →</a>
        </div>
      ) : (
        <div style={s.grid} className="animate-in">
          {tickets.map(t => <TicketCard key={t.tokenId} ticket={t} />)}
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket }) {
  const [showQR,   setShowQR]   = useState(false);
  const [showHash, setShowHash] = useState(false);
  const isValid = !ticket.isUsed;

  return (
    <div style={{ ...s.card, borderColor: isValid ? "rgba(34,197,94,0.12)" : "rgba(226,201,126,0.06)" }}>
      {/* Ticket header stripe */}
      <div style={{ ...s.stripe, background: isValid ? "rgba(34,197,94,0.06)" : "rgba(226,201,126,0.04)" }}>
        <div>
          <div style={s.tokenId}>TOKEN #{ticket.tokenId}</div>
          <div style={s.eventRef}>Event #{ticket.eventId}</div>
        </div>
        <span style={{ ...s.badge, background: isValid ? "rgba(34,197,94,0.12)" : "rgba(226,201,126,0.08)", color: isValid ? "#22c55e" : "#6b6455", border: `1px solid ${isValid ? "rgba(34,197,94,0.2)" : "rgba(226,201,126,0.1)"}` }}>
          {isValid ? "✓ Valid" : "✗ Used"}
        </span>
      </div>

      {/* Dashed divider like real ticket */}
      <div style={s.tearLine}>
        <div style={s.circle1} />
        <div style={s.dashes} />
        <div style={s.circle2} />
      </div>

      {/* Ticket details */}
      <div style={s.details}>
        <TicketRow icon="event_seat"    label="Seat"      value={ticket.seatNumber} />
        <TicketRow icon="payments"      label="Paid"      value={`${ticket.originalPrice} ETH`} />
        <TicketRow icon="swap_horiz"    label="Transfers" value={ticket.transferCount} />
        {ticket.listing?.isActive && (
          <TicketRow icon="sell" label="Listed" value={`${ticket.listing.price} ETH`} highlight />
        )}
      </div>

      {/* QR Buttons — only for valid tickets */}
      {isValid && (
        <div style={s.btnGroup}>
          <button onClick={() => { setShowQR(!showQR); setShowHash(false); }} style={{ ...s.qrBtn, ...(showQR ? s.qrBtnActive : {}) }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>qr_code</span>
            {showQR ? "Hide QR" : "Show QR Code"}
          </button>
          <button onClick={() => { setShowHash(!showHash); setShowQR(false); }} style={s.hashBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>key</span>
            {showHash ? "Hide" : "QR Hash"}
          </button>
        </div>
      )}

      {/* QR Image */}
      {showQR && (
        <div style={s.qrImageBox}>
          <p style={s.qrNote}>📷 Show this at the entry gate</p>
          <div style={s.qrImgWrap}>
            <img src={buildQRImageUrl(ticket.tokenId, ticket.qrHash)} alt="QR" style={{ width: "180px", height: "180px", display: "block" }} />
          </div>
          <p style={s.qrSub}>Token #{ticket.tokenId} · Seat {ticket.seatNumber}</p>
        </div>
      )}

      {/* Raw Hash */}
      {showHash && (
        <div style={s.hashBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "#9b8f7a" }}>QR Hash (manual fallback)</span>
            <button
              onClick={() => { navigator.clipboard.writeText(ticket.qrHash); toast.success("Copied!"); }}
              style={s.copyBtn}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>content_copy</span>
            </button>
          </div>
          <p style={s.hashText}>{ticket.qrHash}</p>
        </div>
      )}
    </div>
  );
}

function TicketRow({ icon, label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(226,201,126,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#6b6455" }}>{icon}</span>
        <span style={{ fontSize: "0.82rem", color: "#9b8f7a" }}>{label}</span>
      </div>
      <span style={{ fontSize: "0.85rem", color: highlight ? "#e2c97e" : "#f1ead6", fontWeight: highlight ? 700 : 400 }}>{value}</span>
    </div>
  );
}

const s = {
  page:   { flex: 1, padding: "2.5rem 3rem", overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  title:  { fontSize: "2rem", fontWeight: 700, color: "#f1ead6", letterSpacing: "-0.5px" },
  subtitle: { color: "#6b6455", marginTop: "0.25rem", fontSize: "0.85rem" },
  mono:   { fontFamily: "monospace", color: "#9b8f7a" },
  statsRow: { display: "flex", gap: "0.75rem" },
  statPill: { display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(226,201,126,0.05)", border: "1px solid rgba(226,201,126,0.1)", borderRadius: "20px", padding: "5px 14px", fontSize: "0.82rem", color: "#9b8f7a" },

  grid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1.25rem" },
  card:  { background: "#252118", border: "1px solid", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" },

  stripe:   { padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  tokenId:  { fontSize: "0.68rem", color: "#6b6455", fontFamily: "monospace", letterSpacing: "0.08em" },
  eventRef: { fontSize: "1rem", fontWeight: 700, color: "#f1ead6", marginTop: "2px" },
  badge:    { fontSize: "0.72rem", padding: "3px 10px", borderRadius: "20px", fontWeight: 600 },

  tearLine: { display: "flex", alignItems: "center", padding: "0 0", position: "relative", height: "1px", margin: "0 0" },
  circle1:  { width: "14px", height: "14px", borderRadius: "50%", background: "#1f1c13", marginLeft: "-7px", flexShrink: 0 },
  circle2:  { width: "14px", height: "14px", borderRadius: "50%", background: "#1f1c13", marginRight: "-7px", flexShrink: 0 },
  dashes:   { flex: 1, borderTop: "1.5px dashed rgba(226,201,126,0.12)" },

  details:  { padding: "1rem 1.5rem", display: "flex", flexDirection: "column" },

  btnGroup: { display: "flex", gap: "0.5rem", padding: "0 1.5rem 1rem" },
  qrBtn:    { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", background: "rgba(226,201,126,0.08)", border: "1px solid rgba(226,201,126,0.15)", color: "#e2c97e", padding: "8px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "Space Grotesk, sans-serif" },
  qrBtnActive: { background: "#e2c97e", color: "#1f1c13" },
  hashBtn:  { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", background: "transparent", border: "1px solid rgba(226,201,126,0.1)", color: "#9b8f7a", padding: "8px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontFamily: "Space Grotesk, sans-serif" },

  qrImageBox: { margin: "0 1.5rem 1.25rem", background: "rgba(226,201,126,0.04)", borderRadius: "12px", padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" },
  qrNote:     { fontSize: "0.75rem", color: "#9b8f7a" },
  qrImgWrap:  { background: "#fff", padding: "8px", borderRadius: "8px" },
  qrSub:      { fontSize: "0.72rem", color: "#6b6455" },

  hashBox:   { margin: "0 1.5rem 1.25rem", background: "rgba(226,201,126,0.04)", borderRadius: "10px", padding: "0.9rem" },
  copyBtn:   { background: "none", border: "none", color: "#9b8f7a", cursor: "pointer", padding: "2px" },
  hashText:  { fontSize: "0.68rem", color: "#6b6455", fontFamily: "monospace", wordBreak: "break-all" },

  connectState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: "1rem" },
  connectIcon:  { width: "64px", height: "64px", borderRadius: "16px", background: "rgba(226,201,126,0.1)", display: "flex", alignItems: "center", justifyContent: "center" },
  connectTitle: { fontSize: "1.4rem", fontWeight: 700, color: "#f1ead6" },
  connectSub:   { color: "#6b6455", fontSize: "0.9rem" },
  btnPrimary:   { display: "flex", alignItems: "center", gap: "0.5rem", background: "#e2c97e", color: "#1f1c13", border: "none", padding: "12px 24px", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", fontFamily: "Space Grotesk, sans-serif" },

  center:    { display: "flex", justifyContent: "center", alignItems: "center", height: "40vh" },
  spinner:   { width: "36px", height: "36px", border: "3px solid rgba(226,201,126,0.1)", borderTop: "3px solid #e2c97e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  empty:     { textAlign: "center", padding: "4rem 0", display: "flex", flexDirection: "column", alignItems: "center" },
  browseLink: { color: "#e2c97e", textDecoration: "none", fontWeight: 600, marginTop: "0.75rem", fontSize: "0.9rem" },
};
