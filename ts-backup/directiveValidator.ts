// HootBot/src/core/contracts/directiveSchema.ts

/**
 * JSON Schema for M.I.N.D. -> HootBot directive validation
 * This is the inviolable contract between brain and body
 */
export const directiveSchema = {
  type: "object",
  required: ["action", "token", "amount", "timestamp", "reason"],
  properties: {
    // Core directive fields
    action: {
      type: "string",
      enum: ["BUY", "SELL", "WAIT"]
    },
    token: {
      type: "string",
      pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$" // Base58 Solana address
    },
    amount: {
      type: "number",
      minimum: 0.001,
      maximum: 100
    },
    timestamp: {
      type: "number",
      minimum: 1700000000000 // Reasonable timestamp after 2023
    },
    reason: {
      type: "string",
      minLength: 5,
      maxLength: 200
    },
    
    // Execution profile for human realism
    execution_profile: {
      type: "object",
      properties: {
        urgency: {
          type: "string",
          enum: ["low", "medium", "high", "panic"]
        },
        emotion: {
          type: "string",
          enum: ["fear", "greed", "fomo", "confidence", "neutral"]
        },
        slippage_tolerance: {
          type: "number",
          minimum: 0.01,
          maximum: 0.5
        },
        priority_fee: {
          type: "number",
          minimum: 0,
          maximum: 0.01
        }
      },
      additionalProperties: false
    },
    
    // Optional metadata
    metadata: {
      type: "object",
      properties: {
        source: {
          type: "string",
          enum: ["scanner", "copy_trade", "manual", "panic_sell"]
        },
        confidence_score: {
          type: "number",
          minimum: 0,
          maximum: 100
        },
        expected_return: {
          type: "number"
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};