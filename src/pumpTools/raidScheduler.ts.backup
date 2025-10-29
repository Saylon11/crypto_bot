// HootBot/src/pumpTools/raidScheduler.ts
import { executeRaidSequence } from './raidHootBot';
import { executePanicBuy, initiateCoordinatedBuy } from './tradeExecutor';
import { RAID_CONFIG, RaidMode, getRaidParams } from './raidConfig';
import { startRaidSession, endRaidSession, getRaidStats } from '../utils/logger';

interface ScheduledRaid {
  time: Date;
  mode: RaidMode;
  amount?: number;
}

const scheduledRaids: ScheduledRaid[] = [];
let isRaidActive = false;

export function scheduleRaid(time: Date | string, mode: RaidMode = RaidMode.STANDARD, amount?: number): void {
  const raidTime = typeof time === 'string' ? new Date(time) : time;
  
  scheduledRaids.push({ time: raidTime, mode, amount });
  scheduledRaids.sort((a, b) => a.time.getTime() - b.time.getTime());
  
  console.log(`📅 Raid scheduled for ${raidTime.toISOString()} - Mode: ${mode}`);
}

export async function executeScheduledRaid(raid: ScheduledRaid): Promise<void> {
  if (isRaidActive) {
    console.log('⚠️ Raid already in progress, skipping...');
    return;
  }
  
  isRaidActive = true;
  const sessionId = startRaidSession();
  
  try {
    console.log(`\n🚨 Executing scheduled ${raid.mode} raid`);
    
    const params = getRaidParams(raid.mode);
    
    switch (raid.mode) {
      case RaidMode.PANIC:
        await executePanicBuy(RAID_CONFIG.PANIC_BUY_MULTIPLIER, true);
        break;
        
      case RaidMode.WHALE:
        // Big whale buy
        await initiateCoordinatedBuy(params.amount, true);
        
        // Follow-up FOMO buys
        if (params.followUp) {
          console.log('🐋 Executing whale follow-up buys...');
          for (let i = 0; i < params.followUp.count; i++) {
            await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
            await initiateCoordinatedBuy(params.followUp.amount, true);
          }
        }
        break;
        
      case RaidMode.FOMO:
        // Initial big buy
        await initiateCoordinatedBuy(params.amount, true);
        
        // Random FOMO buys
        console.log('🔥 Generating FOMO pattern...');
        for (let i = 0; i < params.count; i++) {
          const delay = params.minDelay + Math.random() * (params.maxDelay - params.minDelay);
          const amount = params.minAmount + Math.random() * (params.maxAmount - params.minAmount);
          
          await new Promise(r => setTimeout(r, delay));
          await initiateCoordinatedBuy(amount, true);
        }
        break;
        
      case RaidMode.STEALTH:
        // Smaller, more natural-looking buys
        console.log('🥷 Executing stealth raid sequence...');
        for (let i = 0; i < params.count; i++) {
          const amount = params.amount * (0.8 + Math.random() * 0.4); // ±20% variation
          await initiateCoordinatedBuy(amount, true);
          
          if (i < params.count - 1) {
            await new Promise(r => setTimeout(r, params.delay));
          }
        }
        break;
        
      default: // STANDARD
        await executeRaidSequence(true); // Always skip MIND
    }
    
  } catch (error) {
    console.error('❌ Raid execution failed:', error);
  } finally {
    await endRaidSession();
    isRaidActive = false;
  }
}

export function startRaidScheduler(): void {
  console.log('🤖 Raid scheduler started');
  
  setInterval(async () => {
    const now = Date.now();
    
    // Check for scheduled raids
    while (scheduledRaids.length > 0 && scheduledRaids[0].time.getTime() <= now) {
      const raid = scheduledRaids.shift()!;
      await executeScheduledRaid(raid);
    }
  }, 30000); // Check every 30 seconds
}

export async function scheduleSmartRaids(intervalMinutes: number = 60): Promise<void> {
  console.log(`🧠 Smart raid scheduler activated - Interval: ${intervalMinutes} minutes`);
  
  // Initial raid
  await executeScheduledRaid({ 
    time: new Date(), 
    mode: RaidMode.STANDARD 
  });
  
  // Schedule periodic raids
  setInterval(async () => {
    // Get current stats
    const stats = await getRaidStats();
    
    // Determine raid mode based on recent performance
    let mode = RaidMode.STANDARD;
    
    if (stats.last24hVolume < 20) {
      // Low volume - need aggressive push
      mode = RaidMode.WHALE;
    } else if (stats.last24hVolume < 50) {
      // Moderate volume - FOMO generation
      mode = RaidMode.FOMO;
    } else {
      // Good volume - maintain with stealth
      mode = RaidMode.STEALTH;
    }
    
    console.log(`\n📊 Smart Raid Decision:`);
    console.log(`Last 24h volume: ${stats.last24hVolume.toFixed(2)} SOL`);
    console.log(`Selected mode: ${mode}`);
    
    await executeScheduledRaid({
      time: new Date(),
      mode
    });
    
  }, intervalMinutes * 60 * 1000);
}

// Peak hour raids (based on MIND analysis showing 22:00 UTC as peak)
export function schedulePeakHourRaids(): void {
  const now = new Date();
  const peakHour = new Date();
  peakHour.setUTCHours(22, 0, 0, 0);
  
  // If peak hour already passed today, schedule for tomorrow
  if (peakHour.getTime() < now.getTime()) {
    peakHour.setDate(peakHour.getDate() + 1);
  }
  
  // Schedule whale raid at peak hour
  scheduleRaid(peakHour, RaidMode.WHALE);
  
  // Schedule FOMO raids 15 and 30 minutes after
  const fomo1 = new Date(peakHour.getTime() + 15 * 60 * 1000);
  const fomo2 = new Date(peakHour.getTime() + 30 * 60 * 1000);
  
  scheduleRaid(fomo1, RaidMode.FOMO);
  scheduleRaid(fomo2, RaidMode.FOMO);
  
  console.log(`📍 Peak hour raids scheduled for ${peakHour.toISOString()}`);
}

// Export for command-line usage
if (require.main === module) {
  const mode = process.argv[2] as RaidMode || RaidMode.STANDARD;
  const amount = parseFloat(process.argv[3]) || undefined;
  
  executeScheduledRaid({
    time: new Date(),
    mode,
    amount
  }).then(() => {
    console.log('✅ Raid complete!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Raid failed:', error);
    process.exit(1);
  });
}