import { Connection, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import axios from 'axios';
import { QUICKNODE_RPC_URL, METIS_JUPITER_API_URL, getPriorityFees, executeSwap } from './qnAPI';
import { QuoteResponse } from './types';

// Ensure proper endpoint formatting
const formattedMetisJupiterApiUrl = METIS_JUPITER_API_URL.endsWith('/')
  ? METIS_JUPITER_API_URL
  : `${METIS_JUPITER_API_URL}/`;

// Solana connection (centralized)
const connection = new Connection(QUICKNODE_RPC_URL, "confirmed");

// Manually update your wallet public key here
const userPublicKey = "<YOUR_WALLET_PUBLIC_KEY>";

// Helper Functions for blockchain state (Optional debugging)
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

// Trade flow
async function performSwap(inputMint: string, outputMint: string, amount: number, slippage: number) {
  try {
    const priorityFee = await getPriorityFees();

    if (!priorityFee) {
      throw new Error("Priority fee retrieval failed");
    }

    const swapResult = await executeSwap(
      inputMint,
      outputMint,
      amount,
      slippage,
      priorityFee,
      userPublicKey
    );

    console.log('🎉 Swap Result:', swapResult);

  } catch (error) {
    console.error("❌ Error executing swap with priority fees:", error);
  }
}

// Example transaction creator with priority fee
async function createTransactionWithPriorityFee(priorityFee: number): Promise<Transaction> {
  const transaction = new Transaction();
  
  // Your instructions explicitly here...

  const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFee,
  });

  transaction.add(priorityFeeInstruction);
  return transaction;
}

// Execute full end-to-end trade flow (ensure you update input/output token mint addresses)
const executeTradeFlow = async () => {
  const INPUT_MINT_ADDRESS = "<INPUT_MINT_ADDRESS>"; // Replace explicitly
  const OUTPUT_MINT_ADDRESS = "<OUTPUT_MINT_ADDRESS>"; // Replace explicitly
  const amount = 1000000000; // Adjust precisely based on your trading needs
  const slippage = 0.5; // Your desired slippage

  try {
    const quoteResponse = await axios.get(`${formattedMetisJupiterApiUrl}quote`, {
      params: { inputMint: INPUT_MINT_ADDRESS, outputMint: OUTPUT_MINT_ADDRESS, amount: amount },
      headers: { "Content-Type": "application/json", "Host": "jupiter-swap-api.quiknode.pro" },
    });

    console.log('✅ Received Quote:', quoteResponse.data);

    const priorityFee = await getPriorityFees();

    const swapResult = await executeSwap(
      INPUT_MINT_ADDRESS,
      OUTPUT_MINT_ADDRESS,
      amount,
      slippage,
      priorityFee!,
      userPublicKey
    );

    console.log('🎉 Swap executed successfully:', swapResult);

  } catch (error) {
    console.error('🚨 Error in trade flow:', error);
  }
};

// Test function explicitly (remove or comment out in production)
executeTradeFlow().catch(console.error);

// Utility/debugging function calls (comment out as needed in production)
getBlockHeight();
getSlotNumber();