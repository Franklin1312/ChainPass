// services/listener.js
// Listens to on-chain events from EventTicketPlatform
// and syncs them into MongoDB in real time.

const { ethers } = require("ethers");
const Event  = require("../models/Event");
const Ticket = require("../models/Ticket");
const { abi } = require("../abi/EventTicketPlatform.json");

let contract;

async function startListener() {
  const provider = new ethers.WebSocketProvider(process.env.WS_RPC_URL);
  contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);

  console.log("🔗 Blockchain listener started —", process.env.CONTRACT_ADDRESS);

  // ── EventCreated ────────────────────────────────────────────────────────────
  contract.on("EventCreated", async (eventId, name, ticketPrice, totalSupply) => {
    try {
      const ev = await contract.getEventDetails(eventId);
      await Event.findOneAndUpdate(
        { eventId: Number(eventId) },
        {
          eventId:          Number(eventId),
          name:             ev.name,
          date:             ev.date,
          venue:            ev.venue,
          ticketPrice:      ethers.formatEther(ev.ticketPrice),
          totalSupply:      Number(ev.totalSupply),
          maxResalePercent: Number(ev.maxResalePercent),
          isActive:         ev.isActive,
        },
        { upsert: true, new: true }
      );
      console.log(`📅 EventCreated synced  → eventId: ${Number(eventId)} | ${name}`);
    } catch (err) {
      console.error("EventCreated handler error:", err.message);
    }
  });

  // ── EventDeactivated ────────────────────────────────────────────────────────
  contract.on("EventDeactivated", async (eventId) => {
    try {
      await Event.findOneAndUpdate({ eventId: Number(eventId) }, { isActive: false });
      console.log(`🚫 EventDeactivated     → eventId: ${Number(eventId)}`);
    } catch (err) {
      console.error("EventDeactivated handler error:", err.message);
    }
  });

  // ── TicketMinted ────────────────────────────────────────────────────────────
  contract.on("TicketMinted", async (tokenId, eventId, buyer, qrHash) => {
    try {
      const td = await contract.tickets(tokenId);
      await Ticket.findOneAndUpdate(
        { tokenId: Number(tokenId) },
        {
          tokenId:       Number(tokenId),
          eventId:       Number(eventId),
          seatNumber:    td.seatNumber,
          originalPrice: ethers.formatEther(td.originalPrice),
          originalBuyer: buyer,
          qrHash:        qrHash,
          transferCount: Number(td.transferCount),
        },
        { upsert: true, new: true }
      );

      // Update ticketsMinted count on Event
      await Event.findOneAndUpdate(
        { eventId: Number(eventId) },
        { $inc: { ticketsMinted: 1 } }
      );

      console.log(`🎟️  TicketMinted synced  → tokenId: ${Number(tokenId)} | buyer: ${buyer}`);
    } catch (err) {
      console.error("TicketMinted handler error:", err.message);
    }
  });

  // ── TicketListed ────────────────────────────────────────────────────────────
  contract.on("TicketListed", async (tokenId, seller, price) => {
    try {
      await Ticket.findOneAndUpdate(
        { tokenId: Number(tokenId) },
        {
          "listing.isActive": true,
          "listing.seller":   seller,
          "listing.price":    ethers.formatEther(price),
          "listing.listedAt": new Date(),
        }
      );
      console.log(`📋 TicketListed synced  → tokenId: ${Number(tokenId)} | price: ${ethers.formatEther(price)} ETH`);
    } catch (err) {
      console.error("TicketListed handler error:", err.message);
    }
  });

  // ── ListingCancelled ────────────────────────────────────────────────────────
  contract.on("ListingCancelled", async (tokenId) => {
    try {
      await Ticket.findOneAndUpdate(
        { tokenId: Number(tokenId) },
        { "listing.isActive": false }
      );
      console.log(`❌ ListingCancelled     → tokenId: ${Number(tokenId)}`);
    } catch (err) {
      console.error("ListingCancelled handler error:", err.message);
    }
  });

  // ── TicketSold (resale) ─────────────────────────────────────────────────────
  contract.on("TicketSold", async (tokenId, seller, buyer, price, fee) => {
    try {
      await Ticket.findOneAndUpdate(
        { tokenId: Number(tokenId) },
        {
          originalBuyer:      buyer,          // new owner
          "listing.isActive": false,
          $inc: { transferCount: 1 },
        }
      );
      console.log(`💸 TicketSold synced    → tokenId: ${Number(tokenId)} | ${seller} → ${buyer}`);
    } catch (err) {
      console.error("TicketSold handler error:", err.message);
    }
  });

  // ── TicketUsed ──────────────────────────────────────────────────────────────
  contract.on("TicketUsed", async (tokenId) => {
    try {
      await Ticket.findOneAndUpdate(
        { tokenId: Number(tokenId) },
        { isUsed: true, "listing.isActive": false }
      );
      console.log(`✅ TicketUsed synced    → tokenId: ${Number(tokenId)}`);
    } catch (err) {
      console.error("TicketUsed handler error:", err.message);
    }
  });
}

module.exports = { startListener };
