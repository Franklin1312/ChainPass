// src/components/Sidebar.js
import { NavLink, useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

const navItems = [
  { to: "/",           icon: "confirmation_number", label: "Events"     },
  { to: "/my-tickets", icon: "style",               label: "My Tickets" },
];

const ownerItems = [
  { to: "/admin",   icon: "dashboard",  label: "Dashboard" },
  { to: "/scanner", icon: "qr_code_scanner", label: "QR Scanner" },
];

export default function Sidebar() {
  const { account, isOwner, connect, disconnect } = useWallet();

  const short = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";

  return (
    <aside style={s.sidebar}>
      {/* Logo */}
      <div style={s.logo}>
        <div style={s.logoIcon}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.3rem", color: "#1f1c13" }}>confirmation_number</span>
        </div>
        <div>
          <div style={s.logoName}>ChainPass</div>
          <div style={s.logoSub}>NFT TICKETING</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navSection}>MAIN</div>
        {navItems.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        {isOwner && (
          <>
            <div style={{ ...s.navSection, marginTop: "1.5rem" }}>ADMIN</div>
            {ownerItems.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* Bottom wallet */}
      <div style={s.bottom}>
        {account ? (
          <div style={s.walletBox} className="glass">
            <div style={s.walletAvatar}>
              {account.slice(2, 4).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={s.walletAddr}>{short(account)}</div>
              <div style={s.walletRole}>{isOwner ? "Owner" : "Member"}</div>
            </div>
            <button onClick={disconnect} style={s.disconnectBtn} title="Disconnect">
              <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>logout</span>
            </button>
          </div>
        ) : (
          <button onClick={connect} style={s.connectBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>account_balance_wallet</span>
            Connect Wallet
          </button>
        )}
      </div>
    </aside>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} end style={({ isActive }) => ({
      ...s.navItem,
      ...(isActive ? s.navItemActive : {}),
    })}>
      <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>{icon}</span>
      {label}
    </NavLink>
  );
}

const s = {
  sidebar: {
    width: "280px", minWidth: "280px", background: "#1a1710",
    borderRight: "1px solid rgba(226,201,126,0.08)",
    display: "flex", flexDirection: "column",
    position: "sticky", top: 0, height: "100vh", overflow: "hidden",
  },
  logo: {
    padding: "2rem", display: "flex", alignItems: "center", gap: "0.75rem",
    borderBottom: "1px solid rgba(226,201,126,0.08)",
  },
  logoIcon: {
    width: "40px", height: "40px", borderRadius: "10px",
    background: "#e2c97e", display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoName: { fontWeight: 700, fontSize: "1.1rem", color: "#f1ead6", letterSpacing: "-0.3px" },
  logoSub:  { fontSize: "0.65rem", color: "#e2c97e", letterSpacing: "0.15em", fontWeight: 600 },
  nav:      { flex: 1, padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.25rem" },
  navSection: { fontSize: "0.65rem", color: "#6b6455", letterSpacing: "0.15em", fontWeight: 700, padding: "0 0.75rem", marginBottom: "0.5rem" },
  navItem: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    padding: "0.75rem 1rem", borderRadius: "10px",
    color: "#9b8f7a", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500,
    transition: "all 0.15s",
  },
  navItemActive: {
    background: "#e2c97e", color: "#1f1c13", fontWeight: 700,
  },
  bottom: { padding: "1.25rem" },
  walletBox: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    padding: "0.75rem", borderRadius: "12px",
  },
  walletAvatar: {
    width: "36px", height: "36px", borderRadius: "50%",
    background: "rgba(226,201,126,0.15)", color: "#e2c97e",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.75rem", fontWeight: 700,
  },
  walletAddr: { fontSize: "0.82rem", fontWeight: 600, color: "#f1ead6", fontFamily: "monospace" },
  walletRole: { fontSize: "0.7rem", color: "#e2c97e", fontWeight: 600 },
  disconnectBtn: {
    background: "none", border: "none", color: "#6b6455", cursor: "pointer", padding: "4px",
  },
  connectBtn: {
    width: "100%", background: "#e2c97e", color: "#1f1c13", border: "none",
    padding: "12px", borderRadius: "10px", fontWeight: 700, cursor: "pointer",
    fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    fontFamily: "Space Grotesk, sans-serif",
  },
};
