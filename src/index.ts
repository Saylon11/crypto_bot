import { Connection } from "@solana/web3.js";
import * as dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Load QuickNode API URL from .env file
const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL || "";

if (!QUICKNODE_RPC_URL) {
    console.error("❌ Error: QUICKNODE_RPC_URL is missing from .env");
    process.exit(1);
}

// Create a connection to Solana
const connection = new Connection(QUICKNODE_RPC_URL, "confirmed");

async function getBlockHeight() {
    try {
        const blockHeight = await connection.getBlockHeight();
        console.log(`✅ Solana Block Height: ${blockHeight}`);
    } catch (error) {
        console.error("❌ Error fetching block height:", error);
    }
}

async function getSlotNumber() {
    try {
        const slotNumber = await connection.getSlot();
        console.log(`✅ Solana Slot Number: ${slotNumber}`);
    } catch (error) {
        console.error("❌ Error fetching slot number:", error);
    }
}

// Example function to demonstrate the structure
function exampleFunction() {
    console.log("Hello, world!");
}

// Call the example function
exampleFunction();

// Run both functions
getBlockHeight();
getSlotNumber();