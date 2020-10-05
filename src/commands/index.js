const debug = require('debug')('WW:Routes');
const Spaces = require('../db/queries/spaces');
const Api = require('../api');
const Worker = require('../worker');
const WeatherJob = require('../jobs/weather');
const cron = require('cron-validator');

async function addressToLocation(address) {
  const data = await Api.geocode(address);

  if (data.results.length === 0) {
    return '';
  }

  // Get the result
  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    location: result.geometry.location,
  };
}

async function addressToTz(address) {
  const data = await Api.timezone(address);

  if (data && data.timeZoneId) {
    return data.timeZoneId;
  } else {
    return '';
  }
}

async function getHelpMessage() {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Help",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: '*Location* - Set the location of the weather report e.g `@wwbot location new york`',
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: '*Unit* - Set the unit of the weather report e.g `@wwbot unit imperial`',
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: '*Report interval* - Set report interval e.g `@wwbot report_interval`',
      }
    },
  ];

  Object.keys(WeatherJob.iconMapping).forEach((name) => {
    // Push the icon image
    /*
    blocks.push({
      type: "section",
      text: {
        type: "plain_text",
        text: name,
      },
      accessory: {
        type: "image",
        image_url: WeatherJob.iconMapping[name],
        alt_text: name,
      },
    });
    */
    blocks.push({
      type: "context",
      elements: [
        {
          type: "plain_text",
          text: name,
        },
        {
          type: "image",
          image_url: WeatherJob.iconMapping[name],
          alt_text: name,
        },
      ],
    });
  });

  return {
    blocks,
  };
}

async function handleMessage(command, parts, currentSpace) {
  debug('handle message', {
    command,
    parts,
    currentSpace,
  });

  const spaceId = currentSpace.channel_id;
  const jobName = `${currentSpace.team_id}_${spaceId}`;

  // Handle the command
  if (command === 'location') {
    const loc = parts.slice(1).join(' ');
    
    if (loc === '') {
      return `Current location: ${currentSpace.location} Timezone: ${currentSpace.tz} coordinate: ${currentSpace.lat_lon}`;
    }
    // Validate the location
    const locationData = await addressToLocation(loc);
    debug(locationData);

    const latlon = `${locationData.location.lat},${locationData.location.lng}`;

    // Get timezone info
    const tz = await addressToTz(latlon);

    debug(Spaces);
    // Save the location
    await Spaces.updateBySpaceId(spaceId, {
      location: locationData.formattedAddress,
      lat_lon: latlon,
      tz,
    });

    // 3. Stop the current job
    await Worker.removeSpaceJob({
      name: jobName,
    });

    // 4. Start a new job
    await Worker.addSpaceJob({
      name: jobName,
      report_interval: currentSpace.report_interval,
      tz: tz,
    });

    return `Location saved - ${locationData.formattedAddress} Timezone: ${tz} Coordinate: ${latlon}`;
  } else if (command === 'unit') {
    const unit = parts.slice(1).join(' ');
    
    if (unit === '') {
      return `Current unit system - ${currentSpace.unit}`;
    }

    if (['metric', 'imperial'].indexOf(unit) === -1) {
      return `Only accept *metric* or *imperial* as unit`;
    }

    // Save the location
    await Spaces.updateBySpaceId(spaceId, {
      unit,
    });

    return `Unit system saved - ${unit}`;
  } else if (command === 'report_interval') {
    const value = parts.slice(1).join(' ');

    if (!value) {
      return `Current report interval - ${currentSpace.report_interval}`;
    }

    // 1. Validate the report interval
    if (!cron.isValidCron(value)) {
      return {
        text: `${value} is invalid corn expression, <https://crontab.guru|more details about cron expression>`,
      };
    }

    // Save the report interval
    await Spaces.updateBySpaceId(spaceId, {
      report_interval: value,
    });

    // 3. Stop the current job
    await Worker.removeSpaceJob({
      name: jobName,
    });

    // 4. Start a new job
    await Worker.addSpaceJob({
      name: jobName,
      report_interval: value,
      tz: currentSpace.tz,
    });

    return `Report interval set to ${value}`;
  } else if (command === 'help') {
    return getHelpMessage();
  }

  if (!currentSpace.lat_lon) {
    return 'Sorry no location set';
  }

  const weatherInfo = await WeatherJob.getWeatherInfo(currentSpace);

  debug('weather info', weatherInfo);

  return weatherInfo;
}

module.exports = (app) => {
  app.command(`/${process.env.SLACK_BOT_COMMAND}`, async ({ context, command, ack, say }) => {
    await ack();

    debug('command', {
      context,
      command, 
    })

    const channelId = command.channel_id;
    // Get current space
    const currentSpace = await Spaces.get(channelId);

    if (!currentSpace) {
      await say('Sorry the bot is not in this channel yet, please add the bot to this channel');
      return;
    }

    // Figure out the command
    let theCommand = '';
    let parts = [];
    if (command.text) {
      const argumentText = command.text.trim();
      parts = argumentText.split(' ');
      theCommand = parts[0];
    }

    // Handle it 
    const result = await handleMessage(theCommand, parts, currentSpace);
    await say(result);

    //await say(`The command ${command.command} - ${command.text} invoked !`);
    return;
  });
};
