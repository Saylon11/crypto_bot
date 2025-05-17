"use strict";
// src/utils/mathUtils.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAverage = calculateAverage;
exports.calculateStandardDeviation = calculateStandardDeviation;
exports.findMax = findMax;
exports.findMin = findMin;
/**
 * Basic Math Utilities for HootBot M-I-N-D
 * Phase 1: Core Foundation Only
 */
function calculateAverage(numbers) {
    if (numbers.length === 0)
        return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
}
function calculateStandardDeviation(numbers) {
    if (numbers.length === 0)
        return 0;
    const avg = calculateAverage(numbers);
    const variance = calculateAverage(numbers.map(num => Math.pow(num - avg, 2)));
    return Math.sqrt(variance);
}
function findMax(numbers) {
    return numbers.length ? Math.max(...numbers) : 0;
}
function findMin(numbers) {
    return numbers.length ? Math.min(...numbers) : 0;
}
//# sourceMappingURL=mathUtils.js.map