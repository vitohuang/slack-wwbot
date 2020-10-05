require('dotenv').config();
const express = require('express');

const path = require('path');
// Body parser
const bodyParser = require('body-parser');

// Get Bolt stuff
const {
  App,
  LogLevel,
} = require('@slack/bolt');

// Worker for jobs
const worker = require('./src/worker');

// Slack stuff
const events = require('./src/events');
const commands = require('./src/commands');
const routes = require('./src/routes');
const templates = require('./src/templates');

const Teams = require('./src/db/queries/teams');

if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
  throw new Error('Please provide Slack App credentials');
}

// Authorization function
const authorizeFn = async ({ teamId }) => {
  try {
    const team = await Teams.get(teamId);

    let bot = team.bot;
    if (typeof team.bot === 'string') {
      bot = JSON.parse(team.bot);
    }

    if (team) {
      return {
        botId: bot.bot_user_id,
        botToken: team.access_token,
        teamId,
      };
    }

    throw new Error('Can not find team');
  } catch (error) {
    console.error('Error while getting team', teamId, error);
    throw new Error('No matching authorizations');
  }
};

// Initializes your app with your bot token and signing secret
const app = new App({
  authorize: authorizeFn,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
  endpoints: {
    events: '/slack/events',
    command: '/slack/commands',
    interactive: '/slack/interactive',
  },
});

// Set the view engine
app.receiver.app.set('view engine', 'ejs');
app.receiver.app.set('views', path.join(__dirname, './src/views'));
app.receiver.app.use(bodyParser.json());
app.receiver.app.use(express.static(path.join(__dirname, './public')));

// Handle HTTP request
routes(app, app.receiver.app, worker);

// Handle events
events(app, templates, worker);

// Handle the slash command
commands(app, templates, worker);

// Listen to app error
app.error((error) => {
  console.error('Sorry there is an App error', error);
});

async function graceful() {
  await worker.agenda.stop();
  process.exit(0);
}

process.on('SIGTERM', graceful);
process.on('SIGINT' , graceful);

// Start the app
(async () => {
  // Start the app
  const port = process.env.PORT || 3000;
  await app.start(port);

  console.log(`Slack Bolt app is running on ${port}`);
})();
