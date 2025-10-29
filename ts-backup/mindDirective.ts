// HootBot/src/core/mindDirective.ts

import Ajv from 'ajv';
import { Logger } from './logger';

/**
 * M.I.N.D. Directive Schema Version 1.0
 * This is the formal contract between M.I.N.D. (brain) and HootBot (body)
 */

export const MIND_DIRECTIVE_SCHEMA_V1 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://hootbot.ai/schemas/mind-directive/v1.0',
  title: 'MIND Directive',
  description: 'Formal directive from M.I.N.D. to HootBot execution layer',
  type: 'object',
  required: ['version', 'directive_id', 'timestamp_utc', 'action', 'parameters'],
  properties: {
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+$',
      description: 'Schema version (e.g., "1.0")'
    },
    directive_id: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier for this directive'
    },
    timestamp_utc: {
      type: 'string',
      format: 'date-time',
      description: 'ISO 8601 timestamp in UTC'
    },
    action: {
      type: 'string',
      enum: ['BUY', 'SELL', 'WAIT', 'MONITOR', 'REBALANCE'],
      description: 'The action HootBot should execute'
    },
    target_asset: {
      type: 'string',
      description: 'Token mint address or asset identifier'
    },
    parameters: {
      type: 'object',
      description: 'Action-specific parameters',
      oneOf: [
        { $ref: '#/definitions/buyParameters' },
        { $ref: '#/definitions/sellParameters' },
        { $ref: '#/definitions/waitParameters' },
        { $ref: '#/definitions/monitorParameters' },
        { $ref: '#/definitions/rebalanceParameters' }
      ]
    },
    execution_context: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Human-readable explanation for the directive'
        },
        confidence_score: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'M.I.N.D. confidence in this decision (0-100)'
        },
        market_conditions: {
          type: 'object',
          properties: {
            survivability_score: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            panic_score: {
              type: 'number',
              minimum: 0,
              maximum: 100
            },
            whale_activity: {
              type: 'boolean'
            },
            volume_trend: {
              type: 'string',
              enum: ['INCREASING', 'STABLE', 'DECREASING', 'UNKNOWN']
            }
          }
        },
        execution_profile: {
          type: 'string',
          enum: ['conservative', 'normal', 'aggressive', 'fomo'],
          description: 'Psychological context for execution behavior'
        }
      },
      required: ['reason', 'confidence_score']
    }
  },
  definitions: {
    buyParameters: {
      type: 'object',
      required: ['amount_sol', 'slippage_tolerance'],
      properties: {
        amount_sol: {
          type: 'number',
          minimum: 0.001,
          description: 'Amount in SOL to spend'
        },
        slippage_tolerance: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Maximum acceptable slippage percentage'
        },
        priority_fee: {
          type: 'number',
          minimum: 0,
          description: 'Priority fee in SOL (optional)'
        },
        max_retries: {
          type: 'integer',
          minimum: 0,
          maximum: 10,
          default: 3
        }
      }
    },
    sellParameters: {
      type: 'object',
      required: ['percentage', 'slippage_tolerance'],
      properties: {
        percentage: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Percentage of holdings to sell'
        },
        slippage_tolerance: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },
        min_sol_output: {
          type: 'number',
          minimum: 0,
          description: 'Minimum SOL to receive (optional safety check)'
        },
        priority_fee: {
          type: 'number',
          minimum: 0
        }
      }
    },
    waitParameters: {
      type: 'object',
      required: ['duration_seconds'],
      properties: {
        duration_seconds: {
          type: 'integer',
          minimum: 1,
          maximum: 3600,
          description: 'How long to wait before next evaluation'
        },
        monitor_conditions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: {
                type: 'string',
                enum: ['price', 'volume', 'holder_count', 'liquidity']
              },
              threshold: {
                type: 'number'
              },
              comparison: {
                type: 'string',
                enum: ['gt', 'lt', 'eq', 'gte', 'lte']
              }
            }
          }
        }
      }
    },
    monitorParameters: {
      type: 'object',
      required: ['interval_seconds', 'duration_seconds'],
      properties: {
        interval_seconds: {
          type: 'integer',
          minimum: 10,
          maximum: 300
        },
        duration_seconds: {
          type: 'integer',
          minimum: 60,
          maximum: 86400
        },
        alert_conditions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              threshold: { type: 'number' },
              action_if_met: {
                type: 'string',
                enum: ['BUY', 'SELL', 'ALERT']
              }
            }
          }
        }
      }
    },
    rebalanceParameters: {
      type: 'object',
      required: ['target_allocations'],
      properties: {
        target_allocations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['asset', 'percentage'],
            properties: {
              asset: { type: 'string' },
              percentage: { 
                type: 'number',
                minimum: 0,
                maximum: 100
              }
            }
          }
        },
        max_slippage: {
          type: 'number',
          minimum: 0,
          maximum: 100
        }
      }
    }
  }
};

/**
 * Directive validator class
 */
export class DirectiveValidator {
  private ajv: Ajv;
  private validator: any;
  private logger: Logger;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    this.validator = this.ajv.compile(MIND_DIRECTIVE_SCHEMA_V1);
    this.logger = new Logger('DirectiveValidator');
  }

  /**
   * Validate a directive against the schema
   */
  public validate(directive: any): { valid: boolean; errors?: string[] } {
    const valid = this.validator(directive);
    
    if (!valid) {
      const errors = this.validator.errors?.map((err: any) => 
        `${err.instancePath || '/'}: ${err.message}`
      ) || ['Unknown validation error'];
      
      this.logger.warn('Directive validation failed', {
        directive_id: directive?.directive_id,
        errors
      });
      
      return { valid: false, errors };
    }
    
    this.logger.debug('Directive validated successfully', {
      directive_id: directive.directive_id,
      action: directive.action
    });
    
    return { valid: true };
  }
}

/**
 * TypeScript interfaces derived from the schema
 */
export interface MindDirective {
  version: string;
  directive_id: string;
  timestamp_utc: string;
  action: 'BUY' | 'SELL' | 'WAIT' | 'MONITOR' | 'REBALANCE';
  target_asset?: string;
  parameters: BuyParameters | SellParameters | WaitParameters | MonitorParameters | RebalanceParameters;
  execution_context: ExecutionContext;
}

export interface ExecutionContext {
  reason: string;
  confidence_score: number;
  market_conditions?: {
    survivability_score?: number;
    panic_score?: number;
    whale_activity?: boolean;
    volume_trend?: 'INCREASING' | 'STABLE' | 'DECREASING' | 'UNKNOWN';
  };
  execution_profile?: 'conservative' | 'normal' | 'aggressive' | 'fomo';
}

export interface BuyParameters {
  amount_sol: number;
  slippage_tolerance: number;
  priority_fee?: number;
  max_retries?: number;
}

export interface SellParameters {
  percentage: number;
  slippage_tolerance: number;
  min_sol_output?: number;
  priority_fee?: number;
}

export interface WaitParameters {
  duration_seconds: number;
  monitor_conditions?: Array<{
    metric: 'price' | 'volume' | 'holder_count' | 'liquidity';
    threshold: number;
    comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  }>;
}

export interface MonitorParameters {
  interval_seconds: number;
  duration_seconds: number;
  alert_conditions?: Array<{
    metric: string;
    threshold: number;
    action_if_met: 'BUY' | 'SELL' | 'ALERT';
  }>;
}

export interface RebalanceParameters {
  target_allocations: Array<{
    asset: string;
    percentage: number;
  }>;
  max_slippage?: number;
}

/**
 * Helper to create a properly formatted directive
 */
export function createDirective(
  action: MindDirective['action'],
  parameters: MindDirective['parameters'],
  context: ExecutionContext,
  target_asset?: string
): MindDirective {
  return {
    version: '1.0',
    directive_id: generateUUID(),
    timestamp_utc: new Date().toISOString(),
    action,
    target_asset,
    parameters,
    execution_context: context
  };
}

// Simple UUID generator (or use uuid package)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}