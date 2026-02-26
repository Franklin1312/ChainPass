// routes/validate.js
// POST /api/validate
// Called by the gate scanner to verify a QR code and mark the ticket as used on-chain.
//
// Flow:
//   1. Scanner reads QR → gets tokenId + qrHash
//   2. Calls POST /api/validate { tokenId, qrHash }
//   3. Backend checks MongoDB (quick pre-check)
//   4. Backend signer calls markTicketAsUsed() on Sepolia
//   5. Listener auto-updates MongoDB when TicketUsed event fires
//   6. Returns result to scanner

const express  = require("express");
const { ethers } = require("ethers");
const router   = express.Router();
const Ticket   = require("../models/Ticket");
const { abi } = require("../abi/EventTicketPlatform.json");

// ── Signer setup (owner wallet — needed to call markTicketAsUsed) ────────────
function getContract() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const signer   = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, signer);
}

// ── POST /api/validate ───────────────────────────────────────────────────────
// Body: { tokenId: number, qrHash: string }
router.post("/", async (req, res) => {
  const { tokenId, qrHash } = req.body;

  // ── Input validation ───────────────────────────────────────────────────────
  if (!tokenId || !qrHash) {
    return res.status(400).json({
      success: false,
      message: "tokenId and qrHash are required.",
    });
  }

  try {
    // ── Step 1: Pre-check MongoDB (fast, no gas cost) ──────────────────────
    const ticket = await Ticket.findOne({ tokenId: Number(tokenId) });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found. It may not have been synced yet.",
      });
    }

    if (ticket.isUsed) {
      return res.status(409).json({
        success: false,
        message: "Ticket has already been used. Entry denied.",
        ticket: summary(ticket),
      });
    }

    if (ticket.qrHash !== qrHash) {
      return res.status(401).json({
        success: false,
        message: "QR hash mismatch. Invalid ticket.",
      });
    }

    // ── Step 2: Call markTicketAsUsed() on-chain ───────────────────────────
    const contract = getContract();

    // Estimate gas first so we get a clear error before sending tx
    await contract.markTicketAsUsed.estimateGas(tokenId, qrHash);

    const tx = await contract.markTicketAsUsed(tokenId, qrHash);
    console.log(`🔖 markTicketAsUsed tx sent → tokenId: ${tokenId} | txHash: ${tx.hash}`);

    const receipt = await tx.wait(); // wait for 1 confirmation
    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

    // MongoDB will auto-update via the TicketUsed listener — no manual update needed

    return res.status(200).json({
      success: true,
      message: "Ticket validated. Entry granted ✅",
      txHash:  tx.hash,
      block:   receipt.blockNumber,
      ticket:  summary(ticket),
    });

  } catch (err) {
    console.error("Validation error:", err);

    // Parse on-chain custom errors into readable messages
    const reason = parseChainError(err);
    return res.status(500).json({
      success: false,
      message: reason,
    });
  }
});

// ── GET /api/validate/:tokenId — check ticket status without consuming it ───
router.get("/:tokenId", async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ tokenId: Number(req.params.tokenId) });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    return res.json({
      tokenId:    ticket.tokenId,
      eventId:    ticket.eventId,
      seatNumber: ticket.seatNumber,
      owner:      ticket.originalBuyer,
      isUsed:     ticket.isUsed,
      status:     ticket.isUsed ? "USED" : "VALID",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function summary(ticket) {
  return {
    tokenId:    ticket.tokenId,
    eventId:    ticket.eventId,
    seatNumber: ticket.seatNumber,
    owner:      ticket.originalBuyer,
  };
}

function parseChainError(err) {
  if (err?.reason)                          return `Contract error: ${err.reason}`;
  if (err?.message?.includes("AlreadyUsed")) return "Already used on-chain.";
  if (err?.message?.includes("BadQRHash"))   return "QR hash rejected by contract.";
  if (err?.message?.includes("BadTokenId"))  return "Token does not exist on-chain.";
  if (err?.message?.includes("insufficient funds")) return "Backend wallet has insufficient ETH for gas.";
  return err?.message || "Unknown error during on-chain validation.";
}

module.exports = router;
