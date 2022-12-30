module.exports = {
  apps: [
    {
      name: 'virtual-speed-date',
      script: './dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: ['./dist'],
    },
  ],
};
