// HootBot/src/pumpTools/raidConfig.ts

export const RAID_CONFIG = {
  // MIND Analysis Settings
  SKIP_MIND_ANALYSIS: true, // Always skip MIND for raids on our own token
  
  // Raid Parameters
  BASE_RAID_AMOUNT: 0.05, // SOL per raid
  RAID_COUNT: 10, // Number of sequential buys
  DELAY_BETWEEN_RAIDS: 3000, // Milliseconds
  
  // Panic Buy Settings
  PANIC_BUY_MULTIPLIER: 10, // 10x = 0.5 SOL
  PANIC_BUY_SKIP_MIND: true,
  
  // Coordinated Buy Settings
  COORDINATED_BUY_SKIP_MIND: true,
  
  // Whale Mode Thresholds (when to inject big buys)
  WHALE_MODE_AMOUNT: 5.0, // SOL
  WHALE_MODE_FOLLOW_UP_COUNT: 5, // Number of smaller buys after whale
  WHALE_MODE_FOLLOW_UP_AMOUNT: 0.3, // SOL per follow-up
  
  // FOMO Pattern Settings
  FOMO_INITIAL_BUY: 2.0, // SOL
  FOMO_FOLLOW_UPS: 5, // Number of FOMO buys
  FOMO_MIN_AMOUNT: 0.1, // Min SOL per FOMO buy
  FOMO_MAX_AMOUNT: 0.5, // Max SOL per FOMO buy
  FOMO_MIN_DELAY: 3000, // Min delay between FOMO buys (ms)
  FOMO_MAX_DELAY: 8000, // Max delay between FOMO buys (ms)
  
  // Safety Limits
  MAX_SINGLE_RAID: 10.0, // Maximum SOL for a single raid
  DAILY_RAID_LIMIT: 100.0, // Maximum SOL for raids per day
  MIN_WALLET_BALANCE: 0.5, // Minimum SOL to keep in wallet
};

// Raid execution modes
export enum RaidMode {
  STANDARD = 'STANDARD', // Normal raid sequence
  PANIC = 'PANIC', // Panic buy mode
  WHALE = 'WHALE', // Whale injection mode
  FOMO = 'FOMO', // FOMO generation mode
  STEALTH = 'STEALTH', // Smaller, more natural-looking buys
}

// Get raid parameters based on mode
export function getRaidParams(mode: RaidMode) {
  switch (mode) {
    case RaidMode.PANIC:
      return {
        amount: RAID_CONFIG.BASE_RAID_AMOUNT * RAID_CONFIG.PANIC_BUY_MULTIPLIER,
        count: 1,
        delay: 0,
        skipMind: true
      };
    
    case RaidMode.WHALE:
      return {
        amount: RAID_CONFIG.WHALE_MODE_AMOUNT,
        count: 1,
        delay: 0,
        skipMind: true,
        followUp: {
          count: RAID_CONFIG.WHALE_MODE_FOLLOW_UP_COUNT,
          amount: RAID_CONFIG.WHALE_MODE_FOLLOW_UP_AMOUNT
        }
      };
    
    case RaidMode.FOMO:
      return {
        amount: RAID_CONFIG.FOMO_INITIAL_BUY,
        count: RAID_CONFIG.FOMO_FOLLOW_UPS,
        minAmount: RAID_CONFIG.FOMO_MIN_AMOUNT,
        maxAmount: RAID_CONFIG.FOMO_MAX_AMOUNT,
        minDelay: RAID_CONFIG.FOMO_MIN_DELAY,
        maxDelay: RAID_CONFIG.FOMO_MAX_DELAY,
        skipMind: true
      };
    
    case RaidMode.STEALTH:
      return {
        amount: RAID_CONFIG.BASE_RAID_AMOUNT * 0.5, // Half normal size
        count: RAID_CONFIG.RAID_COUNT * 2, // Double the count
        delay: RAID_CONFIG.DELAY_BETWEEN_RAIDS * 2, // Double the delay
        skipMind: true
      };
    
    default: // STANDARD
      return {
        amount: RAID_CONFIG.BASE_RAID_AMOUNT,
        count: RAID_CONFIG.RAID_COUNT,
        delay: RAID_CONFIG.DELAY_BETWEEN_RAIDS,
        skipMind: true
      };
  }
}