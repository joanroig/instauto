'use strict';

const cron = require('node-cron');

const template = require('./template');

function randomMinutes(min, max) {
  // eslint-disable-next-line no-mixed-operators
  return (Math.floor(Math.random() * (max - min + 1)) + min) * 60000;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const task = cron.schedule('35 23 * * *', async () => {
  console.log('Running tasks!');
  await sleep(randomMinutes(5, 10));
  console.log('Running first task');
  await template.run('first');
  await sleep(randomMinutes(10, 20));
  console.log('Running second task');
  await template.run('second');
  //   await sleep(randomMinutes(10, 20));
  //   await template.run('third');
  console.log('All tasks done!');
});

process.on('SIGHUP', () => {
  console.log('Console closed, terminate the cron process.');
  task.destroy();
  process.exit();
});
