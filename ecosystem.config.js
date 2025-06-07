module.exports = {
  apps: [
    {
      name: 'slush-dating',
      script: './dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: ['./dist'],
    },
  ],
};
