// scheduler.js - HootBot Raid Scheduler
const scheduler = require('./dist/pumpTools/raidScheduler').default;

// Schedule raids for peak hours
function scheduleRaids() {
  console.log('🗓️ Setting up raid schedule...\n');
  
  // Get current time
  const now = new Date();
  
  // Schedule raid for next 22:00 UTC (peak hour)
  const raid1 = new Date(now);
  raid1.setUTCHours(22, 0, 0, 0);
  if (raid1 < now) {
    raid1.setDate(raid1.getDate() + 1);
  }
  
  // Schedule first raid
  const raidId1 = scheduler.scheduleRaid(raid1.toISOString(), 3.0);
  console.log(`🎯 Scheduled 3 SOL raid for ${raid1.toISOString()}`);
  console.log(`   Raid ID: ${raidId1}`);
  
  // Schedule another raid 2 hours later
  const raid2 = new Date(raid1);
  raid2.setHours(raid2.getHours() + 2);
  
  const raidId2 = scheduler.scheduleRaid(raid2.toISOString(), 2.0);
  console.log(`🎯 Scheduled 2 SOL raid for ${raid2.toISOString()}`);
  console.log(`   Raid ID: ${raidId2}`);
  
  // Schedule morning raid (14:00 UTC = 9am EST)
  const raid3 = new Date(now);
  raid3.setUTCHours(14, 0, 0, 0);
  if (raid3 < now) {
    raid3.setDate(raid3.getDate() + 1);
  }
  
  const raidId3 = scheduler.scheduleRaid(raid3.toISOString(), 1.5);
  console.log(`🎯 Scheduled 1.5 SOL raid for ${raid3.toISOString()}`);
  console.log(`   Raid ID: ${raidId3}`);
  
  console.log('\n✅ All raids scheduled!');
  console.log('📋 Currently scheduled raids:', scheduler.listScheduledRaids());
}

// Enable smart raids (automatic opportunistic raids)
function enableSmartRaids() {
  console.log('\n🤖 Enabling smart raid system...');
  
  // Check market every 30 minutes for opportunities
  scheduler.scheduleSmartRaids(30);
  
  console.log('✅ Smart raids enabled! Will check market every 30 minutes.');
  console.log('   High confidence opportunities will trigger automatic raids.');
}

// Main execution
console.log('🦉 HootBot Raid Scheduler\n');

// Schedule fixed raids
scheduleRaids();

// Enable smart raids
enableSmartRaids();

console.log('\n⚡ Scheduler running! Keep this terminal open.');
console.log('Press Ctrl+C to stop all scheduled raids.\n');