module.exports = {
  apps: [
    {
      name: 'ycyw-meeting-api',
      cwd: './backend',
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1, // SQLite does not support multi-process writes
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
