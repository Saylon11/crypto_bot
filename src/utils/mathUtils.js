// Simple math utilities for HootBot

function sum(array) {
  return array.reduce((a, b) => a + b, 0);
}

function average(array) {
  return array.length > 0 ? sum(array) / array.length : 0;
}

function standardDeviation(array) {
  const avg = average(array);
  const squareDiffs = array.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
}

function median(array) {
  const sorted = [...array].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

module.exports = {
  sum,
  average,
  standardDeviation,
  median
};
