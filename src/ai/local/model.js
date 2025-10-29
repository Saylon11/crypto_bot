// model.js - Predictive ML, offline-trainable
const tf = require('@tensorflow/tfjs-node');

class PredictiveModel {
  constructor() {
    this.model = this.createModel();
  }
  
  createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [12], units: 64, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({ 
      optimizer: tf.train.adam(0.001), 
      loss: 'binaryCrossentropy', 
      metrics: ['accuracy'] 
    });
    return model;
  }
  
  async predict(features) {
    return tf.tidy(() => {
      const input = tf.tensor2d([features]);
      return this.model.predict(input).dataSync()[0];
    });
  }
  
  async trainFromHistory() {
    // Direct load from feedback.json per CTO directive
    const fs = require('fs');
    const path = require('path');
    const feedbackPath = path.join(__dirname, '../../../data/trades/feedback.json');
    
    if (!fs.existsSync(feedbackPath)) {
      return { status: 'no feedback file' };
    }
    
    const history = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
    
    if (history.length < 100) {
      return { status: 'insufficient data', count: history.length };
    }
    
    const validTrades = history.filter(t => t.featureVector && t.featureVector.length === 12);
    
    if (validTrades.length === 0) {
      return { status: 'no valid features' };
    }
    
    const xs = tf.tensor2d(validTrades.map(t => t.featureVector));
    const ys = tf.tensor2d(validTrades.map(t => [t.profitable]));
    
    const result = await this.model.fit(xs, ys, { 
      epochs: 10, 
      batchSize: 32,
      verbose: 0 
    });
    
    xs.dispose(); 
    ys.dispose();
    
    return { 
      status: 'success',
      loss: result.history.loss[result.history.loss.length - 1],
      accuracy: result.history.acc ? result.history.acc[result.history.acc.length - 1] : null
    };
  }
}

module.exports = new PredictiveModel();
