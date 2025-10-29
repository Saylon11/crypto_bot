// M.I.N.D. Directive Schema v1.0
export const MIND_DIRECTIVE_SCHEMA_V1 = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://hootbot.ai/schemas/mind-directive/v1.0",
  type: "object",
  required: ["directive_id", "timestamp_utc", "action", "target_asset", "parameters"],
  properties: {
    directive_id: {
      type: "string",
      pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
      description: "UUID v4 for directive tracking"
    },
    timestamp_utc: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 timestamp in UTC"
    },
    action: {
      type: "string",
      enum: ["BUY", "SELL", "WAIT"],
      description: "Trading directive action"
    },
    target_asset: {
      type: "string",
      pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$",
      description: "Solana token mint address"
    },
    parameters: {
      type: "object",
      properties: {
        amount_sol: {
          type: "number",
          minimum: 0.001,
          description: "Amount in SOL to trade"
        },
        slippage_bps: {
          type: "integer",
          minimum: 0,
          maximum: 5000,
          description: "Slippage tolerance in basis points"
        },
        execution_profile: {
          type: "string",
          enum: ["conservative", "normal", "aggressive", "fomo", "fear"],
          description: "Psychological context for execution"
        },
        reason: {
          type: "string",
          description: "Human-readable explanation for the directive"
        }
      },
      required: ["amount_sol", "execution_profile"]
    }
  }
};

// TypeScript interface matching the schema
export interface MindDirective {
  directive_id: string;
  timestamp_utc: string;
  action: 'BUY' | 'SELL' | 'WAIT';
  target_asset: string;
  parameters: {
    amount_sol: number;
    slippage_bps?: number;
    execution_profile: 'conservative' | 'normal' | 'aggressive' | 'fomo' | 'fear';
    reason?: string;
  };
}
