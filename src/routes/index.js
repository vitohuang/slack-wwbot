const fs = require('fs');
const path = require('path');
const debug = require('debug')('DS:Routes');

const Teams = require('../db/queries/teams');

// Sleep for await functions
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Get channels
async function getChannels(client, teamData) {
  // List all channels
  const result = await client.conversations.list({
    token: teamData.bot.bot_access_token,
    types: 'public_channel',
  });

  if (result.ok) {
    return result.channels
  }

  return [];
}

module.exports = (app, express, tokenGenerator) => {
  express.get('/', async (req, res) => {
    res.json('Hello world');
  });

  // Redirect to install
  express.get('/slack/install', async (req, res) => {
    const clientId = process.env.SLACK_CLIENT_ID;
    const scopes = 'bot,channels:read,channels:history,chat:write:bot,users:read,im:history,groups:history,files:read,commands';
    const url = `https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scopes}`;

    res.redirect(url);
  });

  // Slack Oauth
  express.get('/slack/oauth', async (req, res) => {
    debug('req query', req.query);

    try {
      const result = await app.client.oauth.access({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code: req.query.code,
      });

      // the result - save it to database
      await Teams.add(result);
      debug('result from exchange the access token', result);

      // res.redirect(`https://slack.com/app_redirect?app=${appId}`);
      res.send('Installation complete! you can close this tab and go back to work!');
      return;
    } catch (error) {
      console.error('Something is wrong during oauth', error);
      res.redirect('/slack/install');
    }
  });
};
