// src/context/WalletContext.js
import { createContext, useContext, useState, useCallback } from "react";
import { ethers } from "ethers";
import contractJson from "../abi/EventTicketPlatform.json";
import toast from "react-hot-toast";

const abi = contractJson.abi;
const CONTRACT_ADDRESS = "0x69a25A22F86b375ae79D756B37b721EfEf4FC574";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account,  setAccount]  = useState(null);
  const [contract, setContract] = useState(null);
  const [isOwner,  setIsOwner]  = useState(false);

  const connect = useCallback(async () => {
    if (!window.ethereum) { toast.error("MetaMask not found. Please install it."); return; }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        toast.error("Please switch to Sepolia testnet");
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
        } catch { toast.error("Switch to Sepolia in MetaMask manually"); return; }
      }

      const signer  = await provider.getSigner();
      const address = await signer.getAddress();
      const ct      = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      const owner   = await ct.owner();

      setAccount(address);
      setContract(ct);
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
      toast.success("Wallet connected!");
    } catch (err) {
      toast.error("Connection failed: " + (err?.reason || err?.message));
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null); setContract(null); setIsOwner(false);
    toast("Wallet disconnected");
  }, []);

  return (
    <WalletContext.Provider value={{ account, contract, isOwner, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() { return useContext(WalletContext); }
