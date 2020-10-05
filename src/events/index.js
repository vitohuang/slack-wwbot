const debug = require('debug')('Faye:events');
const Teams = require('../db/queries/teams');
const Api = require('../api');
const Utils = require('../utils');
const Spaces = require('../db/queries/spaces');

async function handleBotAdded(data) {
  const currentSpace = {
    channel_id: data.id,
    name: data.name,
    display_name: data.displayName,
    type: data.type,
    team_id: data.teamId,
    report_interval: '0 9 * * *',
  };

  // Add to space
  await Spaces.add(currentSpace)
  debug('created space');
}

async function handleBotRemoved(data) {
  // Add to space
  await Spaces.deleteBySpaceId(data.spaceId);
  debug('deleted space');

  // Job name
  const jobName = `${data.teamId}_${data.spaceId}`;
  await Worker.removeSpaceJob({
    name: jobName,
  });
}

module.exports = (app, templates, worker) => {
  // Handle the app home open
  app.event('app_home_opened', async ({ context, event, say }) => {
    // if there's no prior interaction saved to our store,
    // check message history if there was any interaction in App Home previously
    // check if the user already had any previous interaction in App Home
    const history = await app.client.im.history({
      token: context.botToken,
      channel: event.channel,
      count: 1, // we only need to check if >=1 messages exist
    });

    // User doesn't exist in our store and there was no prior interaction,
    // in this case it's save to send a welcome message
    if (!history.messages.length) {
      await say(templates('help'));
    } else {
      // otherwise just send the help message
      // await say('Hi');
    }
  });

  // Handle app uninstalled
  app.event('app_uninstalled', async ({ context, event }) => {
    const teamId = context.teamId;

    // Delete it from the database
    await Teams.deleteByTeamId(teamId);

    // Delete the spaces as well
    await Spaces.deleteByTeamId(teamId);

    // await worker.removeJobsByTeamId(teamId);
  });

  app.event('message', async ({ context, event, say }) => {
    // Only care about the message in specific channel
    debug('there is an emssage', event);
  });

  app.event('member_joined_channel', async ({ context, event, client, say }) => {
    // Only care about the message in specific channel
    debug('there is an emssage', {
      event,
      context,
    });

    // Make sure its a bot
    if (context.botId !== event.user) {
      debug('Its not our bot, do nothing');
      return;
    }

    // GEt channel info
    const result = await client.conversations.info({
      channel: event.channel,
    });

    debug('channle info', result);
    if (!result.ok) {
      say('Sorry can not fetch channel info');
      return;
    }

    await handleBotAdded({
      id: event.channel,
      teamId: event.team,
      name: result.channel.name,
      displayName: result.channel.name,
      type: event.channel_type,
    });

    await client.chat.postMessage({
      channel: event.channel,
      text: 'Thanks for adding me, please set location with Slash command e.g: /wwbot location Austin, TX',
    });
  });

  app.event('member_left_channel', async ({ context, event, say }) => {
    // Only care about the message in specific channel
    debug('there is an emssage', {
      event,
      context,
    });

    // Make sure its a bot
    if (context.botId !== event.user) {
      debug('Its not our bot, do nothing');
      return;
    }

    // Delete the channel/space
    await handleBotRemoved({
      spaceId: event.channel,
      teamId: event.team,
    });

    debug('Delete the bot from the channel', event);
  });
};
