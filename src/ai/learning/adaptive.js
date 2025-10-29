// adaptive.js - Epsilon-greedy MAB for thresholds
const store = require('../../data/store');

const banditState = {
  arms: [0.5, 0.6, 0.7, 0.8, 0.9],
  epsilon: 0.15,
  results: {} // {arm: {trials: 0, totalReward: 0}}
};

banditState.arms.forEach(arm => banditState.results[arm] = {trials: 0, totalReward: 0});

function getAdaptiveThreshold() {
  if (Math.random() < banditState.epsilon) {
    return banditState.arms[Math.floor(Math.random() * banditState.arms.length)];
  } else {
    let bestArm = banditState.arms[0], bestReward = -Infinity;
    for (const arm of banditState.arms) {
      const stats = banditState.results[arm];
      const avg = stats.trials > 0 ? stats.totalReward / stats.trials : 0;
      if (avg > bestReward) { bestReward = avg; bestArm = arm; }
    }
    return bestArm;
  }
}

function updateBandit(arm, reward) {
  const stats = banditState.results[arm];
  stats.trials++;
  stats.totalReward += reward;
  stats.totalReward *= 0.99; // Decay for recency bias
  store.saveBanditState(banditState);
}

module.exports = { getAdaptiveThreshold, updateBandit };
