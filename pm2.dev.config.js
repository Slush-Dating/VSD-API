module.exports = {
    apps: [
      {
        name: 'Slush Dating App (DEV)',
        exec_mode: 'cluster',
        instances: 'max', // Or a number of instances
        script: './dist/main.js',
        args: 'start',
        env_local: {
          APP_ENV: 'local' // APP_ENV=local
        },
        env_development: {
          PORT: 3000,
          APP_ENV: 'dev' // APP_ENV=dev
        },
        env_production: {
          PORT: 3000,
          APP_ENV: 'prod' // APP_ENV=prod
        }
      }
    ]
  }