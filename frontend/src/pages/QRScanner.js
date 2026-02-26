// src/pages/QRScanner.js
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useWallet } from "../context/WalletContext";

const API = "http://localhost:3001";

export default function QRScanner() {
  const { account, isOwner, connect } = useWallet();
  const [mode,       setMode]       = useState("camera");
  const [tokenId,    setTokenId]    = useState("");
  const [qrHash,     setQrHash]     = useState("");
  const [result,     setResult]     = useState(null);
  const [checking,   setChecking]   = useState(false);
  const [validating, setValidating] = useState(false);
  const [scanning,   setScanning]   = useState(false);
  const html5QrRef = useRef(null);

  useEffect(() => { return () => stopCamera(); }, []);

  async function startCamera() {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      html5QrRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        onQRScanned, () => {}
      );
    } catch {
      toast.error("Camera access denied or not available.");
      setScanning(false);
    }
  }

  async function stopCamera() {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); html5QrRef.current.clear(); } catch {}
      html5QrRef.current = null;
    }
    setScanning(false);
  }

  function onQRScanned(text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.tokenId && parsed.qrHash) {
        stopCamera();
        setTokenId(String(parsed.tokenId));
        setQrHash(parsed.qrHash);
        toast.success(`✅ QR scanned — Token #${parsed.tokenId}`);
        handleValidateWith(parsed.tokenId, parsed.qrHash);
      } else { toast.error("Invalid QR format"); }
    } catch { toast.error("Could not read QR code"); }
  }

  async function handleCheck() {
    if (!tokenId) { toast.error("Enter a Token ID"); return; }
    setChecking(true); setResult(null);
    try {
      const { data } = await axios.get(`${API}/api/validate/${tokenId}`);
      setResult({ type: "check", ...data });
    } catch (err) {
      setResult({ type: "error", message: err.response?.data?.error || "Ticket not found" });
    } finally { setChecking(false); }
  }

  async function handleValidateWith(tid, hash) {
    setValidating(true); setResult(null);
    const tid2 = toast.loading("Validating on-chain...");
    try {
      const { data } = await axios.post(`${API}/api/validate`, { tokenId: Number(tid), qrHash: hash });
      setResult({ type: "success", ...data });
      toast.success("Entry granted!", { id: tid2 });
    } catch (err) {
      const msg = err.response?.data?.message || "Validation failed";
      setResult({ type: "denied", message: msg });
      toast.error(msg, { id: tid2 });
    } finally { setValidating(false); }
  }

  async function handleValidate() {
    if (!tokenId || !qrHash) { toast.error("Token ID and QR Hash required"); return; }
    handleValidateWith(tokenId, qrHash);
  }

  function reset() { setTokenId(""); setQrHash(""); setResult(null); stopCamera(); }

  if (!account) return (
    <div style={s.page}>
      <div style={s.gated}>
        <div style={s.gatedIcon}><span className="material-symbols-outlined" style={{ fontSize: "2rem", color: "#e2c97e" }}>qr_code_scanner</span></div>
        <h2 style={s.gatedTitle}>QR Entry Scanner</h2>
        <p style={s.gatedSub}>Connect the owner wallet to validate tickets</p>
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
        <p style={s.gatedSub}>Only gate operators can validate tickets</p>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>QR Entry Scanner</h1>
          <p style={s.subtitle}>Validate and admit ticket holders at the gate</p>
        </div>
        <span style={s.gateBadge}>
          <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>verified_user</span>
          Gate Operator
        </span>
      </header>

      {/* Mode Toggle */}
      <div style={s.modeRow}>
        <button onClick={() => { setMode("camera"); setResult(null); }} style={{ ...s.modeBtn, ...(mode === "camera" ? s.modeBtnOn : {}) }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>photo_camera</span>
          Camera Scan
        </button>
        <button onClick={() => { setMode("manual"); stopCamera(); setResult(null); }} style={{ ...s.modeBtn, ...(mode === "manual" ? s.modeBtnOn : {}) }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>keyboard</span>
          Manual Entry
        </button>
      </div>

      <div style={s.layout}>
        {/* Left Input Panel */}
        <div style={s.inputCard}>
          {mode === "camera" ? (
            <>
              <h3 style={s.cardTitle}>
                <span className="material-symbols-outlined" style={{ color: "#e2c97e" }}>photo_camera</span>
                Camera Scan
              </h3>
              <p style={s.cardSub}>Point your camera at the attendee's QR code shown on their My Tickets page.</p>
              <div id="qr-reader" style={s.cameraBox} />
              {!scanning ? (
                <button onClick={startCamera} style={s.btnPrimary}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>photo_camera</span>
                  Start Camera
                </button>
              ) : (
                <button onClick={stopCamera} style={s.btnDanger}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>stop</span>
                  Stop Camera
                </button>
              )}
              {tokenId && !scanning && (
                <div style={s.scannedBox}>
                  <span className="material-symbols-outlined" style={{ color: "#22c55e", fontSize: "1rem" }}>check_circle</span>
                  <span style={{ fontSize: "0.85rem", color: "#22c55e" }}>Scanned Token #{tokenId} — validating...</span>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 style={s.cardTitle}>
                <span className="material-symbols-outlined" style={{ color: "#e2c97e" }}>keyboard</span>
                Manual Entry
              </h3>
              <p style={s.cardSub}>Enter the Token ID and QR Hash from the attendee's ticket.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={s.label}>Token ID</label>
                  <input placeholder="e.g. 1" value={tokenId} onChange={e => setTokenId(e.target.value)} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={s.label}>QR Hash</label>
                  <input placeholder="0x..." value={qrHash} onChange={e => setQrHash(e.target.value)} />
                </div>
              </div>
              <div style={s.btnRow}>
                <button onClick={handleCheck} style={s.btnOutline} disabled={checking}>
                  {checking ? "Checking..." : "Check Status"}
                </button>
                <button onClick={handleValidate} style={s.btnPrimary} disabled={validating}>
                  {validating ? "Validating..." : "Grant Entry"}
                </button>
              </div>
            </>
          )}

          {result && (
            <button onClick={reset} style={s.resetBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>refresh</span>
              Reset for next scan
            </button>
          )}
        </div>

        {/* Right Result Panel */}
        <div style={s.resultCard}>
          {!result ? (
            <div style={s.idle}>
              <div style={s.idleRing}>
                <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", color: scanning ? "#e2c97e" : "#6b6455" }}>
                  {scanning ? "qr_code_scanner" : "qr_code"}
                </span>
              </div>
              <p style={s.idleText}>{scanning ? "Scanning — point at QR code..." : "Scan result appears here"}</p>
            </div>
          ) : result.type === "error" ? (
            <ResultScreen icon="error" color="#ef4444" title="Not Found" message={result.message} />
          ) : result.type === "denied" ? (
            <ResultScreen icon="cancel" color="#ef4444" title="Entry Denied" message={result.message} />
          ) : result.type === "check" ? (
            <div style={s.checkBox}>
              <div style={{ ...s.resultRing, background: result.status === "VALID" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `2px solid ${result.status === "VALID" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", color: result.status === "VALID" ? "#22c55e" : "#ef4444" }}>
                  {result.status === "VALID" ? "check_circle" : "cancel"}
                </span>
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: result.status === "VALID" ? "#22c55e" : "#ef4444" }}>
                {result.status === "VALID" ? "Ticket Valid" : "Already Used"}
              </h2>
              <div style={s.resultRows}>
                <RRow label="Token"  value={`#${result.tokenId}`} />
                <RRow label="Event"  value={`#${result.eventId}`} />
                <RRow label="Seat"   value={result.seatNumber} />
                <RRow label="Owner"  value={`${result.owner?.slice(0,10)}...`} />
              </div>
              {result.status === "VALID" && mode === "manual" && (
                <button onClick={handleValidate} style={{ ...s.btnPrimary, width: "100%" }} disabled={validating}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>how_to_reg</span>
                  {validating ? "Admitting..." : "Admit Attendee"}
                </button>
              )}
            </div>
          ) : (
            <div style={s.successBox}>
              <div style={s.successRing}>
                <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#22c55e" }}>how_to_reg</span>
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22c55e" }}>Entry Granted!</h2>
              <div style={s.resultRows}>
                <RRow label="Token"  value={`#${result.ticket?.tokenId}`} />
                <RRow label="Seat"   value={result.ticket?.seatNumber} />
                <RRow label="Block"  value={result.block} />
                <RRow label="Tx"     value={`${result.txHash?.slice(0,12)}...`} />
              </div>
              <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noreferrer" style={s.etherscanLink}>
                <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>open_in_new</span>
                View on Etherscan
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultScreen({ icon, color, title, message }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <span className="material-symbols-outlined" style={{ fontSize: "3rem", color }}>{icon}</span>
      <h2 style={{ color, fontSize: "1.3rem", fontWeight: 700 }}>{title}</h2>
      <p style={{ color: "#9b8f7a", textAlign: "center", fontSize: "0.85rem" }}>{message}</p>
    </div>
  );
}

function RRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(226,201,126,0.06)" }}>
      <span style={{ fontSize: "0.82rem", color: "#6b6455" }}>{label}</span>
      <span style={{ fontSize: "0.82rem", color: "#f1ead6", fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

const s = {
  page:     { flex: 1, padding: "2.5rem 3rem", overflowY: "auto" },
  header:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  title:    { fontSize: "2rem", fontWeight: 700, color: "#f1ead6", letterSpacing: "-0.5px" },
  subtitle: { color: "#6b6455", marginTop: "0.25rem", fontSize: "0.9rem" },
  gateBadge: { display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: "0.82rem", fontWeight: 600, padding: "6px 14px", borderRadius: "20px" },

  modeRow:    { display: "flex", gap: "0.5rem", marginBottom: "1.5rem" },
  modeBtn:    { display: "flex", alignItems: "center", gap: "0.4rem", padding: "8px 20px", borderRadius: "8px", border: "1px solid rgba(226,201,126,0.1)", background: "transparent", color: "#9b8f7a", cursor: "pointer", fontSize: "0.88rem", fontFamily: "Space Grotesk, sans-serif" },
  modeBtnOn:  { background: "rgba(226,201,126,0.1)", border: "1px solid rgba(226,201,126,0.2)", color: "#e2c97e" },

  layout:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" },
  inputCard: { background: "#252118", border: "1px solid rgba(226,201,126,0.08)", borderRadius: "16px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" },
  cardTitle: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", fontWeight: 700, color: "#f1ead6" },
  cardSub:   { color: "#6b6455", fontSize: "0.82rem", lineHeight: 1.5 },
  cameraBox: { width: "100%", minHeight: "260px", background: "#1a1710", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(226,201,126,0.08)" },
  label:     { fontSize: "0.78rem", fontWeight: 600, color: "#9b8f7a" },
  btnRow:    { display: "flex", gap: "0.75rem" },
  btnPrimary: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "#e2c97e", color: "#1f1c13", border: "none", padding: "11px", borderRadius: "10px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem", fontFamily: "Space Grotesk, sans-serif" },
  btnOutline: { flex: 1, background: "transparent", border: "1px solid rgba(226,201,126,0.15)", color: "#9b8f7a", padding: "11px", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem", fontFamily: "Space Grotesk, sans-serif" },
  btnDanger:  { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "11px", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontFamily: "Space Grotesk, sans-serif" },
  resetBtn:  { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "transparent", border: "1px solid rgba(226,201,126,0.1)", color: "#6b6455", padding: "8px", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontFamily: "Space Grotesk, sans-serif" },
  scannedBox: { display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "8px", padding: "0.75rem" },

  resultCard: { background: "#252118", border: "1px solid rgba(226,201,126,0.08)", borderRadius: "16px", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center" },
  idle:       { display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" },
  idleRing:   { width: "80px", height: "80px", borderRadius: "50%", background: "rgba(226,201,126,0.05)", border: "1px solid rgba(226,201,126,0.1)", display: "flex", alignItems: "center", justifyContent: "center" },
  idleText:   { color: "#6b6455", fontSize: "0.88rem" },
  checkBox:   { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" },
  resultRing: { width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  resultRows: { width: "100%", display: "flex", flexDirection: "column" },
  successBox: { width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" },
  successRing: { width: "80px", height: "80px", borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse-glow 2s infinite" },
  etherscanLink: { display: "flex", alignItems: "center", gap: "0.35rem", color: "#e2c97e", fontSize: "0.82rem", textDecoration: "none" },

  gated:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", gap: "1rem" },
  gatedIcon:  { width: "64px", height: "64px", borderRadius: "16px", background: "rgba(226,201,126,0.08)", display: "flex", alignItems: "center", justifyContent: "center" },
  gatedTitle: { fontSize: "1.4rem", fontWeight: 700, color: "#f1ead6" },
  gatedSub:   { color: "#6b6455" },
};
