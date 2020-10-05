const debug = require('debug')('WW:job');
const path = require('path');
const captureWebsite = require('capture-website');
const Api = require('../api');
const Spaces = require('../db/queries/spaces');
const Teams = require('../db/queries/teams');
const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz');

function getRadarMapUrl(lat, lon, zoom) {
  return `http://rain-radar-map.s3-website-eu-west-1.amazonaws.com/index.html?latlon=${lat},${lon}&zoom=${zoom}`;
}

async function generateRadarMap(lat, lon, zoom) {
  try {
    const url = getRadarMapUrl(lat, lon, zoom);
    const fileName = `${lat}-${lon}-${zoom}-${Date.now()}.png`;
    const outputPath = path.resolve(__dirname, `../../public/images/${fileName}`);

    // Going to do the capture
    await captureWebsite.file(url, outputPath, {
			launchOptions: {
					args: [
						'--no-sandbox',
						'--disable-setuid-sandbox'
					],
				},
    });

    // Return the path
    return `${process.env.SITE_URL}/images/${fileName}`;
  } catch (error) {
    console.error('There is an error', error);
    return '';
  }
}

const iconMapping = {
	temp: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f321.png',
	wind_speed: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f390.png',
	visibility: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f440.png',
	cloud_cover: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u2601.png',
	sunrise: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f307.png',
	sunset: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f306.png',
  wind_direction: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u2197.png',
}

function getFieldContent(name, value, url, tz) {
  debug({
    name,
    value, 
    url,
  })
  let text = `${value.value} ${value.units ? value.units : ''}`;
  if (['sunrise', 'sunset'].indexOf(name) !== -1) {
    debug('the time from vaue', {
      name,
      value,
      tz,
    });
    const d = new Date(value.value);
  const zonedDate = utcToZonedTime(d, tz);
    text = format(zonedDate, 'HH:mm', {
      timeZone: tz,
    });
  }

  return [
    {
      type: "image",
      image_url: iconMapping[name],
      alt_text: text,
    },
    {
      type: "plain_text",
      text,
    },
  ];
}

function formatWeatherInfo(info, url, tz) {
  const blocks = [];
  let elements = [];

  debug('info', info, info['wind_speed']);
  elements = elements.concat(getFieldContent('temp', info['temp'], url));
  elements = elements.concat(getFieldContent('wind_speed', info['wind_speed'], url));
  elements = elements.concat(getFieldContent('visibility', info['visibility'], url));
  elements = elements.concat(getFieldContent('wind_direction', info['wind_direction'], url));
  elements = elements.concat(getFieldContent('cloud_cover', info['cloud_cover'], url));

  blocks.push({
    type: "context",
    elements,
  });
  elements = [];

  elements = elements.concat(getFieldContent('sunrise', info['sunrise'], url, tz));
  elements = elements.concat(getFieldContent('sunset', info['sunset'], url, tz));

  let weatherCode = info['weather_code'].value;
  if (['clear', 'mostly_clear', 'partly_cloudy'].indexOf(weatherCode) !== -1) {
    weatherCode += '_day';
  }

  elements = elements.concat([
    {
      type: "image",
      image_url: `https://rain-radar-map.s3-eu-west-1.amazonaws.com/weather_codes/${weatherCode}.png`,
      alt_text: weatherCode,
    },
    {
      type: "plain_text",
      text: "Current Weather",
    },
  ]);

  console.log('elements', {
    elements,
  })

  blocks.push({
    type: "context",
    elements,
  });

  return blocks;
}

async function getWeatherInfo(currentSpace) {
  let [lat, lon] = currentSpace.lat_lon.split(',');
  lat = parseFloat(lat);
  lon = parseFloat(lon);
  const zoom = 6;

  const info = await Api.getWeather(lat, lon, currentSpace.unit);
  const radarImage = await generateRadarMap(lat, lon, zoom);


  const currentDate = new Date();
  const zonedDate = utcToZonedTime(currentDate, currentSpace.tz);
  const pattern = 'd.M.yyyy HH:mm:ss.SSS'
  const dt = format(zonedDate, pattern, { timeZone: currentSpace.tz });

  let blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `Weather for ${currentSpace.location} at ${dt}`,
        },
      },
  ];
  
  // Add on the weather info
  blocks = blocks.concat(formatWeatherInfo(info));

  if (radarImage) {
    blocks.push({
      type: 'image',
      title: {
        type: "plain_text",
        text: "Radar iamge",
      },
      image_url: radarImage,
      alt_text: 'radar image',
    });
  }

  return {
    blocks,
  };
}

async function sendWeatherNotification(job) {
  try {
    const {
      spaceName,
    } = job.attrs.data;

    debug('Send weather notification for', {
      spaceName,
    });

    const currentSpace = await Spaces.get(spaceName);

    if (!currentSpace) {
      debug('Space does not exist', spaceName);
      return;
    }

    const team = await Teams.get(currentSpace.team_id);

    // Get the weather info
    const weatherInfo = await getWeatherInfo(currentSpace);

    debug('Got the weather info', weatherInfo);
    // Send it

    return await Api.sendMessage(team.access_token, currentSpace.channel_id, weatherInfo);
  } catch (error) {
    console.error('Error while processing send weather notification', error);
  }
}

module.exports = {
  iconMapping,
  getWeatherInfo,
  sendWeatherNotification,
};
