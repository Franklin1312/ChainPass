// backend/scripts/syncEvents.js
// Run this once to sync all past on-chain events into MongoDB
require("dotenv").config({ path: "./.env.backend" });
const { ethers } = require("ethers");
const mongoose  = require("mongoose");
const contractJson = require("../abi/EventTicketPlatform.json");
const Event     = require("../models/Event");

const abi = contractJson.abi;

async function sync() {
  // Connect MongoDB
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  // Connect to contract
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS, abi, provider
  );

  // Get total number of events by trying eventIds 1, 2, 3...
  console.log("🔍 Scanning on-chain events...");
  let eventId = 1;

  while (true) {
    try {
      const ev = await contract.getEventDetails(eventId);

      await Event.findOneAndUpdate(
        { eventId },
        {
          eventId,
          name:             ev.name,
          date:             ev.date,
          venue:            ev.venue,
          ticketPrice:      ethers.formatEther(ev.ticketPrice),
          totalSupply:      Number(ev.totalSupply),
          ticketsMinted:    Number(ev.ticketsMinted),
          maxResalePercent: Number(ev.maxResalePercent),
          isActive:         ev.isActive,
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Synced event #${eventId}: ${ev.name}`);
      eventId++;
    } catch (err) {
      // No more events
      console.log(`ℹ️  No event found at id ${eventId} — stopping.`);
      break;
    }
  }

  console.log("🎉 Sync complete!");
  mongoose.disconnect();
}

sync().catch(console.error);