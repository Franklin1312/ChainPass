// src/pages/BuyTicket.js
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import axios from "axios";
import toast from "react-hot-toast";
import { useWallet } from "../context/WalletContext";

const API = "http://localhost:3001";

export default function BuyTicket() {
  const { eventId }                    = useParams();
  const { account, contract, connect } = useWallet();
  const navigate                       = useNavigate();
  const [event,   setEvent]   = useState(null);
  const [seat,    setSeat]    = useState("");
  const [loading, setLoading] = useState(true);
  const [buying,  setBuying]  = useState(false);
  const [step,    setStep]    = useState(0); // 0=idle 1=confirming 2=pending 3=done

  useEffect(() => {
    axios.get(`${API}/api/events/${eventId}`)
      .then(r => setEvent(r.data))
      .catch(() => toast.error("Event not found"))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function handleBuy() {
    if (!account)      { connect(); return; }
    if (!seat.trim())  { toast.error("Please enter a seat number"); return; }
    if (!contract)     { toast.error("Contract not connected"); return; }

    setBuying(true);
    setStep(1);
    try {
      const metadataURI = `https://detickets.app/metadata/${eventId}/${seat}`;
      const price = ethers.parseEther(event.ticketPrice.toString());
      const tx = await contract.mintTicket(eventId, seat, metadataURI, account, { value: price });
      setStep(2);
      await tx.wait();
      setStep(3);
      toast.success("🎟 Ticket minted successfully!");
      setTimeout(() => navigate("/my-tickets"), 2000);
    } catch (err) {
      toast.error(err?.reason || err?.message || "Transaction failed");
      setStep(0);
    } finally {
      setBuying(false);
    }
  }

  if (loading) return <div style={s.center}><div style={s.spinner} /></div>;
  if (!event)  return <div style={s.center}><p style={{ color: "#6b6455" }}>Event not found.</p></div>;

  const soldOut = event.ticketsMinted >= event.totalSupply;
  const pct = Math.round(((event.ticketsMinted || 0) / event.totalSupply) * 100);

  return (
    <div style={s.page}>
      {/* Back */}
      <button onClick={() => navigate(-1)} style={s.back}>
        <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>arrow_back</span>
        Back to Events
      </button>

      <div style={s.layout}>
        {/* Left — Event Details */}
        <div style={s.detailCard} className="animate-in">
          <div style={s.detailTop}>
            <span style={{ ...s.pill, background: event.isActive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: event.isActive ? "#22c55e" : "#ef4444", border: `1px solid ${event.isActive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              {event.isActive ? "● On Sale" : "● Inactive"}
            </span>
          </div>

          <h1 style={s.eventTitle}>{event.name}</h1>

          <div style={s.detailList}>
            <DetailRow icon="calendar_month" label="Date"         value={event.date} />
            <DetailRow icon="location_on"    label="Venue"        value={event.venue} />
            <DetailRow icon="confirmation_number" label="Supply"  value={`${event.ticketsMinted || 0} / ${event.totalSupply} minted`} />
            <DetailRow icon="swap_horiz"     label="Max Resale"   value={`${event.maxResalePercent}% of original price`} />
          </div>

          {/* Progress */}
          <div style={s.progressBox}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#9b8f7a" }}>Availability</span>
              <span style={{ fontSize: "0.8rem", color: pct > 80 ? "#ef4444" : "#e2c97e", fontWeight: 600 }}>{100 - pct}% remaining</span>
            </div>
            <div style={s.progressTrack}>
              <div style={{ ...s.progressFill, width: `${pct}%`, background: pct > 80 ? "#ef4444" : "#e2c97e" }} />
            </div>
          </div>

          {/* Price */}
          <div style={s.priceBox}>
            <span style={s.priceLabelText}>Ticket Price</span>
            <span style={s.priceValue}>{event.ticketPrice} ETH</span>
          </div>
        </div>

        {/* Right — Buy Form */}
        <div style={s.buyCard} className="animate-in">
          <h2 style={s.buyTitle}>Mint Your Ticket</h2>
          <p style={s.buySub}>Secured as an NFT on Sepolia testnet</p>

          <div style={s.formGroup}>
            <label style={s.label}>
              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>event_seat</span>
              Seat / Section
            </label>
            <input
              placeholder="e.g. A12, VIP-01, GA"
              value={seat}
              onChange={e => setSeat(e.target.value)}
              disabled={buying}
            />
          </div>

          {/* Steps indicator */}
          {step > 0 && (
            <div style={s.steps}>
              {[
                { n: 1, label: "Confirm in MetaMask" },
                { n: 2, label: "Transaction pending" },
                { n: 3, label: "Ticket minted!" },
              ].map(st => (
                <div key={st.n} style={{ ...s.step, opacity: step >= st.n ? 1 : 0.3 }}>
                  <div style={{ ...s.stepDot, background: step >= st.n ? "#e2c97e" : "transparent", border: `2px solid ${step >= st.n ? "#e2c97e" : "#6b6455"}` }}>
                    {step > st.n ? <span className="material-symbols-outlined" style={{ fontSize: "0.8rem", color: "#1f1c13" }}>check</span> : null}
                  </div>
                  <span style={{ fontSize: "0.8rem", color: step >= st.n ? "#f1ead6" : "#6b6455" }}>{st.label}</span>
                </div>
              ))}
            </div>
          )}

          {!account ? (
            <button onClick={connect} style={s.btnPrimary}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>account_balance_wallet</span>
              Connect Wallet to Buy
            </button>
          ) : soldOut ? (
            <button style={{ ...s.btnPrimary, ...s.btnDisabled }} disabled>Sold Out</button>
          ) : step === 3 ? (
            <button style={{ ...s.btnPrimary, background: "#22c55e" }} disabled>
              <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>check_circle</span>
              Ticket Minted! Redirecting...
            </button>
          ) : (
            <button onClick={handleBuy} style={s.btnPrimary} disabled={buying}>
              {buying ? "Processing..." : `Mint for ${event.ticketPrice} ETH`}
              {!buying && <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>arrow_forward</span>}
            </button>
          )}

          {account && (
            <p style={s.walletNote}>
              Connected: <span style={s.mono}>{account.slice(0,6)}...{account.slice(-4)}</span>
            </p>
          )}

          <div style={s.infoBox}>
            <InfoRow icon="link"        text="Minted on Sepolia testnet" />
            <InfoRow icon="lock"        text="Non-transferable after entry scan" />
            <InfoRow icon="qr_code"     text="QR code generated on mint" />
            <InfoRow icon="replay"      text={`Resale up to ${event.maxResalePercent}% allowed`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.75rem 0", borderBottom: "1px solid rgba(226,201,126,0.06)" }}>
      <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", color: "#e2c97e", marginTop: "2px" }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.72rem", color: "#6b6455", marginBottom: "2px" }}>{label}</div>
        <div style={{ fontSize: "0.9rem", color: "#f1ead6" }}>{value}</div>
      </div>
    </div>
  );
}

function InfoRow({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#6b6455" }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

const s = {
  page:   { flex: 1, padding: "2.5rem 3rem", overflowY: "auto" },
  back:   { display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", color: "#9b8f7a", cursor: "pointer", fontSize: "0.88rem", marginBottom: "2rem", fontFamily: "Space Grotesk, sans-serif" },
  layout: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" },

  detailCard: { background: "#252118", border: "1px solid rgba(226,201,126,0.08)", borderRadius: "16px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" },
  detailTop:  { display: "flex", justifyContent: "space-between" },
  pill:       { fontSize: "0.75rem", padding: "4px 12px", borderRadius: "20px", fontWeight: 600 },
  eventTitle: { fontSize: "1.8rem", fontWeight: 700, color: "#f1ead6", lineHeight: 1.2 },
  detailList: { display: "flex", flexDirection: "column" },
  progressBox: { background: "rgba(226,201,126,0.04)", borderRadius: "10px", padding: "1rem" },
  progressTrack: { background: "rgba(226,201,126,0.08)", borderRadius: "4px", height: "6px", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: "4px", transition: "width 0.5s" },
  priceBox: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#e2c97e", borderRadius: "12px", padding: "1rem 1.5rem" },
  priceLabelText: { fontSize: "0.8rem", fontWeight: 600, color: "#1f1c13", opacity: 0.7 },
  priceValue: { fontSize: "1.5rem", fontWeight: 700, color: "#1f1c13" },

  buyCard:  { background: "#252118", border: "1px solid rgba(226,201,126,0.08)", borderRadius: "16px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" },
  buyTitle: { fontSize: "1.3rem", fontWeight: 700, color: "#f1ead6" },
  buySub:   { color: "#6b6455", fontSize: "0.85rem", marginTop: "-0.75rem" },
  formGroup: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  label:    { display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", fontWeight: 600, color: "#9b8f7a" },

  steps:   { display: "flex", flexDirection: "column", gap: "0.6rem", background: "rgba(226,201,126,0.04)", borderRadius: "10px", padding: "1rem" },
  step:    { display: "flex", alignItems: "center", gap: "0.75rem", transition: "opacity 0.3s" },
  stepDot: { width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  btnPrimary: { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#e2c97e", color: "#1f1c13", border: "none", padding: "13px", borderRadius: "12px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", fontFamily: "Space Grotesk, sans-serif", transition: "box-shadow 0.2s" },
  btnDisabled: { background: "rgba(226,201,126,0.15)", color: "#6b6455", cursor: "not-allowed" },
  walletNote: { textAlign: "center", fontSize: "0.78rem", color: "#6b6455" },
  mono:       { fontFamily: "monospace", color: "#9b8f7a" },
  infoBox:    { background: "rgba(226,201,126,0.03)", borderRadius: "10px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.78rem", color: "#6b6455" },

  center:  { display: "flex", justifyContent: "center", alignItems: "center", height: "50vh", flex: 1 },
  spinner: { width: "36px", height: "36px", border: "3px solid rgba(226,201,126,0.1)", borderTop: "3px solid #e2c97e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};
