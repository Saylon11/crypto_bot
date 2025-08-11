"use strict";
// s./utils/mathUtils.ts
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
    var sum = numbers.reduce(function (acc, num) { return acc + num; }, 0);
    return sum / numbers.length;
}
function calculateStandardDeviation(numbers) {
    if (numbers.length === 0)
        return 0;
    var avg = calculateAverage(numbers);
    var variance = calculateAverage(numbers.map(function (num) { return Math.pow(num - avg, 2); }));
    return Math.sqrt(variance);
}
function findMax(numbers) {
    return numbers.length ? Math.max.apply(Math, numbers) : 0;
}
function findMin(numbers) {
    return numbers.length ? Math.min.apply(Math, numbers) : 0;
}
