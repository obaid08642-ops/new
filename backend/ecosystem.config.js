module.exports = {
  apps: [{
    name: 'nabdah-backend',
    script: 'dist/main.js',
    instances: 3,
    exec_mode: 'cluster',
    max_memory_restart: '600M',
    env: { NODE_ENV: 'production' },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Graceful reload for zero-downtime deploys
    wait_ready: true,
  }],
};
