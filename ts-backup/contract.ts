// HootBot/src/mind/contract.ts
/**
 * The Sacred Contract between M.I.N.D. and HootBot
 * This file defines the immutable interface for brain-body communication
 */

import { MindDirective } from './mindCore';

/**
 * Directive Validator - Ensures contract compliance
 */
export class DirectiveValidator {
  private static readonly SUPPORTED_VERSION = '1.0';
  private static readonly VALID_ACTIONS = ['BUY', 'SELL', 'WAIT'] as const;
  private static readonly VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
  private static readonly VALID_PERSONALITIES = ['FOMO', 'FEAR', 'GREED', 'CONSERVATIVE', 'AGGRESSIVE', 'NEUTRAL'] as const;
  private static readonly VALID_URGENCIES = ['IMMEDIATE', 'NORMAL', 'PATIENT'] as const;
  private static readonly VALID_STEALTH = ['LOUD', 'NORMAL', 'SILENT'] as const;
  
  /**
   * Validates a directive conforms to the contract
   */
  static validate(directive: any): directive is MindDirective {
    // Check if directive exists
    if (!directive || typeof directive !== 'object') {
      console.error('❌ Invalid directive: not an object');
      return false;
    }
    
    // Validate version
    if (directive.version !== this.SUPPORTED_VERSION) {
      console.error(`❌ Invalid version: ${directive.version} (expected ${this.SUPPORTED_VERSION})`);
      return false;
    }
    
    // Validate required fields
    const requiredFields = ['timestamp', 'action', 'tokenAddress', 'executionProfile', 'reason', 'confidence', 'priority'];
    for (const field of requiredFields) {
      if (!(field in directive)) {
        console.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate timestamp
    if (typeof directive.timestamp !== 'number' || directive.timestamp <= 0) {
      console.error('❌ Invalid timestamp');
      return false;
    }
    
    // Validate action
    if (!this.VALID_ACTIONS.includes(directive.action)) {
      console.error(`❌ Invalid action: ${directive.action}`);
      return false;
    }
    
    // Validate token address
    if (typeof directive.tokenAddress !== 'string' || directive.tokenAddress.length < 32) {
      console.error('❌ Invalid token address');
      return false;
    }
    
    // Validate amount for BUY/SELL
    if ((directive.action === 'BUY' || directive.action === 'SELL') && 
        (!directive.amount || typeof directive.amount !== 'number' || directive.amount <= 0)) {
      console.error(`❌ ${directive.action} directive missing valid amount`);
      return false;
    }
    
    // Validate execution profile
    if (!this.validateExecutionProfile(directive.executionProfile)) {
      return false;
    }
    
    // Validate confidence
    if (typeof directive.confidence !== 'number' || directive.confidence < 0 || directive.confidence > 100) {
      console.error(`❌ Invalid confidence: ${directive.confidence}`);
      return false;
    }
    
    // Validate priority
    if (!this.VALID_PRIORITIES.includes(directive.priority)) {
      console.error(`❌ Invalid priority: ${directive.priority}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validates execution profile sub-object
   */
  private static validateExecutionProfile(profile: any): boolean {
    if (!profile || typeof profile !== 'object') {
      console.error('❌ Invalid execution profile: not an object');
      return false;
    }
    
    if (!this.VALID_PERSONALITIES.includes(profile.personality)) {
      console.error(`❌ Invalid personality: ${profile.personality}`);
      return false;
    }
    
    if (!this.VALID_URGENCIES.includes(profile.urgency)) {
      console.error(`❌ Invalid urgency: ${profile.urgency}`);
      return false;
    }
    
    if (!this.VALID_STEALTH.includes(profile.stealth)) {
      console.error(`❌ Invalid stealth: ${profile.stealth}`);
      return false;
    }
    
    return true;
  }
}

/**
 * Contract Events - For monitoring brain-body communication
 */
export enum ContractEvent {
  DIRECTIVE_SENT = 'directive_sent',
  DIRECTIVE_VALIDATED = 'directive_validated',
  DIRECTIVE_REJECTED = 'directive_rejected',
  EXECUTION_STARTED = 'execution_started',
  EXECUTION_COMPLETED = 'execution_completed',
  EXECUTION_FAILED = 'execution_failed'
}

/**
 * Contract metrics for monitoring
 */
export interface ContractMetrics {
  totalDirectivesSent: number;
  totalDirectivesValidated: number;
  totalDirectivesRejected: number;
  totalExecutionsStarted: number;
  totalExecutionsCompleted: number;
  totalExecutionsFailed: number;
  lastDirectiveTime: number;
  lastExecutionTime: number;
}