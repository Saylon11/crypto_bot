export class Logger {
  constructor(private name: string) {}
  info(msg: string, data?: any) { console.log(`[${this.name}] ${msg}`, data || ''); }
  warn(msg: string, data?: any) { console.warn(`[${this.name}] ${msg}`, data || ''); }
  error(msg: string, data?: any) { console.error(`[${this.name}] ${msg}`, data || ''); }
  debug(msg: string, data?: any) { console.log(`[${this.name}] ${msg}`, data || ''); }
}

// For raid logger compatibility
export async function logRaid(data: any) {
  console.log('Raid:', data);
}
export function startRaidSession() {
  return 'session-' + Date.now();
}
export async function endRaidSession() {
  console.log('Session ended');
}
export async function getRaidStats() {
  return { totalVolume: 0, last24hVolume: 0 };
}
