// scripts/deploy.js
// Hardhat deployment script for EventTicketPlatform
//
// Usage:
//   npx hardhat run scripts/deploy.js --network <network>
//
// Supported networks (configure in hardhat.config.ts):
//   localhost | sepolia | mainnet

const { ethers } = require("hardhat");

async function main() {
  // ── Signers ──────────────────────────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:       ", ethers.formatEther(balance), "ETH\n");

  // ── Constructor Arguments ─────────────────────────────────────────────────
  // platformFeePercent in basis points (250 = 2.5%)
  // Must be <= 1000 (10% hard cap enforced on-chain)
  const INITIAL_FEE_BPS = 250;

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("Deploying EventTicketPlatform...");
  const EventTicketPlatform = await ethers.getContractFactory("EventTicketPlatform");
  const contract = await EventTicketPlatform.deploy(INITIAL_FEE_BPS);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("EventTicketPlatform deployed to:", address);
  console.log("Initial platform fee:           ", INITIAL_FEE_BPS, "bps (", INITIAL_FEE_BPS / 100, "%)");
  console.log("Owner:                          ", deployer.address);

  // ── Optional: Create a sample event after deployment ─────────────────────
  // Remove or comment out this block if you don't need a seed event.
  console.log("\nCreating sample event...");
  const tx = await contract.createEvent(
    "Genesis Concert",
    "2025-12-31",
    "Madison Square Garden, New York",
    ethers.parseEther("0.05"),
    500,
    120                                      // totalSupply
  );
  await tx.wait();
  console.log("Sample event created (eventId: 1)");

  // ── Verification hint ─────────────────────────────────────────────────────
  console.log("\n── Etherscan Verification ──────────────────────────────────");
  console.log("npx hardhat verify --network <network>", address, INITIAL_FEE_BPS);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
