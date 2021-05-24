'use strict';

const cron = require('node-cron');

const template = require('./template');

const fs = require('fs-extra');

const path = require('path');

// Setup logs
fs.ensureDirSync('logs');
const logStream = fs.createWriteStream(`logs/log-${Date.now()}.log`, {
  flags: 'a',
});

function sleepMinutes(min, max) {
  // eslint-disable-next-line no-mixed-operators
  const ms = (Math.floor(Math.random() * (max - min + 1)) + min) * 60000;
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runAll() {
  const testFolder = './secrets/';
  const files = fs.readdirSync(testFolder);

  for (const file of files) {
    const filename = path.parse(file).name;
    const message = `${new Date().toLocaleString()} - Running task! ${filename}`;
    logStream.write(`${message}\r\n`);
    console.log(message);
    await sleepMinutes(5, 10);
    await template.run(filename);
  }

  const message = `${new Date().toLocaleString()} - All tasks done!`;
  logStream.write(`${message}\r\n`);
  console.log(message);
}

// Run the tasks every day (mm, hh)
const task = cron.schedule('30 10 * * *', async () => {
  runAll();
});

// First run
runAll();

process.on('SIGHUP', () => {
  console.log('Console closed, terminate the cron process.');
  task.destroy();
  process.exit();
});
