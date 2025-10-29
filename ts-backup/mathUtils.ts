// src/utils/mathUtils.ts

/**
 * Basic Math Utilities for HootBot M-I-N-D
 * Phase 1: Core Foundation Only
 */

export function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
}

export function calculateStandardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const avg = calculateAverage(numbers);
  const variance = calculateAverage(numbers.map(num => Math.pow(num - avg, 2)));
  return Math.sqrt(variance);
}

export function findMax(numbers: number[]): number {
  return numbers.length ? Math.max(...numbers) : 0;
}

export function findMin(numbers: number[]): number {
  return numbers.length ? Math.min(...numbers) : 0;
}