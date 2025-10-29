module.exports = {
    apps: [{
      name: 'hootbot-mind',
      script: './mindTrader.js',
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: 10000,
      watch: false,
      max_memory_restart: '1G',
      cron_restart: '0 */6 * * *' // Restart every 6 hours for stability
    }]
  };
