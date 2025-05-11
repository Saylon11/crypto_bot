// src/utils/timeUtils.ts

/**
 * Basic Time Utilities for HootBot M-I-N-D
 * Phase 1: Core Foundation Only
 */

export function convertTimestampToUTCDate(timestamp: number): Date {
  return new Date(timestamp * 1000); // Assuming incoming timestamp is in seconds
}

export function getUTCHourFromTimestamp(timestamp: number): number {
  const date = convertTimestampToUTCDate(timestamp);
  return date.getUTCHours();
}

export function bucketTimestampByHour(timestamp: number): string {
  const hour = getUTCHourFromTimestamp(timestamp);
  return `${hour}:00 - ${hour + 1}:00 UTC`;
}