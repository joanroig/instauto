'use strict';

const puppeteer = require('puppeteer'); // eslint-disable-line import/no-extraneous-dependencies

const Instauto = require('instauto'); // eslint-disable-line import/no-unresolved

// get dotenv configuratin from parameters
// const args = process.argv.slice(2);

// require('dotenv').config({ path: `secrets/${args}.env` });
const dotenv = require('dotenv');
const fs = require('fs-extra');

const run = async function run(args, raspberryMode) {
  // Create data file structure
  fs.ensureDirSync(`data/${args}`);

  // Prepare the dotenf configuration
  dotenv.config({ path: `secrets/${args}.env` });

  // Set the options
  const options = {
    cookiesPath: `data/${args}/cookies.json`,

    username: process.env.INSTAUSER,
    password: process.env.INSTAPASS,

    // Global limit that prevents follow or unfollows (total) to exceed this number over a sliding window of one hour:
    maxFollowsPerHour: 20,
    // Global limit that prevents follow or unfollows (total) to exceed this number over a sliding window of one day:
    maxFollowsPerDay: 150,
    // (NOTE setting the above parameters too high will cause temp ban/throttle)

    maxLikesPerDay: 50,

    // Don't follow users that have a followers / following ratio less than this:
    followUserRatioMin: 0.2,
    // Don't follow users that have a followers / following ratio higher than this:
    followUserRatioMax: 4.0,
    // Don't follow users who have more followers than this:
    followUserMaxFollowers: null,
    // Don't follow users who have more people following them than this:
    followUserMaxFollowing: null,
    // Don't follow users who have less followers than this:
    followUserMinFollowers: null,
    // Don't follow users who have more people following them than this:
    followUserMinFollowing: null,

    // NOTE: The dontUnfollowUntilTimeElapsed option is ONLY for the unfollowNonMutualFollowers function
    // This specifies the time during which the bot should not touch users that it has previously followed (in milliseconds)
    // After this time has passed, it will be able to unfollow them again.
    // TODO should remove this option from here
    dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000,

    // Usernames that we should not touch, e.g. your friends and actual followings
    excludeUsers: [],

    // If true, will not do any actions (defaults to true)
    dryRun: false,
  };

  let browser;

  try {
    if (raspberryMode) {
      browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: true,
        args: ['--disable-features=VizDisplayCompositor'],
      });
    } else {
      browser = await puppeteer.launch({ headless: false });
    }

    // Create a database where state will be loaded/saved to
    const instautoDb = await Instauto.JSONDB({
      // Will store a list of all users that have been followed before, to prevent future re-following.
      followedDbPath: `data/${args}/followed.json`,
      // Will store all unfollowed users here
      unfollowedDbPath: `data/${args}/unfollowed.json`,
      // Will store all likes here
      likedPhotosDbPath: `data/${args}/liked-photos.json`,
    });

    const instauto = await Instauto(instautoDb, browser, options);

    // This can be used to unfollow people:
    // Will unfollow auto-followed AND manually followed accounts who are not following us back, after some time has passed
    // The time is specified by config option dontUnfollowUntilTimeElapsed
    // await instauto.unfollowNonMutualFollowers();
    // await instauto.sleep(10 * 60 * 1000);

    // Unfollow previously auto-followed users (regardless of whether or not they are following us back)
    // after a certain amount of days (2 weeks)
    // Leave room to do following after this too (unfollow 2/3 of maxFollowsPerDay)
    const unfollowedCount = await instauto.unfollowOldFollowed({
      ageInDays: 14,
      limit: options.maxFollowsPerDay * (2 / 3),
    });

    if (unfollowedCount > 0) await instauto.sleep(10 * 60 * 1000);

    // List of usernames that we should follow the followers of, can be celebrities etc.
    const usersToFollowFollowersOf = process.env.USERS.split(' ');

    // Now go through each of these and follow a certain amount of their followers
    await instauto.followUsersFollowers({
      usersToFollowFollowersOf,
      maxFollowsTotal: options.maxFollowsPerDay - unfollowedCount,
      skipPrivate: true,
      enableLikeImages: true,
      likeImagesMax: 3,
    });

    await instauto.sleep(10 * 60 * 1000);

    console.log('Done running');

    await instauto.sleep(30000);
  } catch (err) {
    console.error(err);
  } finally {
    console.log('Closing browser');
    if (browser) await browser.close();
  }
};

module.exports.run = run;
