#!bin/bash

# Reset changes
git reset --hard

# Pull changes
git pull

# Install packages
npm install

 # Build project
npm run build

# Restart service
pm2 reload prod --update-env
