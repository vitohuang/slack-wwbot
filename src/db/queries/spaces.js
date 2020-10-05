const debug = require('debug')('DB:Spaces');
const knex = require('../connection');

function cleanUp(rawData) {
  return rawData;
}

async function add(data) {
  // Clean up the data first

  // Insert it
  const result = await knex('spaces').insert(data);

  debug('result after insert into database', result);
  return result;
}

async function get(channelId) {
  const result = await knex('spaces')
    .select('*')
    .where({
      channel_id: channelId,
    })
    .first();

  debug('after getting channel info', channelId, result);

  return cleanUp(result);
}

async function getAll() {
  const results = await knex('spaces')
    .select('*');

  return results.map((channel) => cleanUp(channel));
}

async function updateBySpaceId(channelId, updates) {
  const result = await knex('spaces')
    .update(updates)
    .where({
      channel_id: channelId,
    });

  return result;
}

async function deleteBySpaceId(channelId) {
  const result = await knex('spaces')
    .del()
    .where({
      channel_id: channelId,
    });

  debug('deleted channel from name', channelId);
  return result;
}

async function deleteByTeamId(teamId) {
  const result = await knex('spaces')
    .del()
    .where({
      team_id: teamId,
    });

  debug('deleted channel from name', channelId);
  return result;
}

module.exports = {
  add,
  get,
  getAll,
  updateBySpaceId,
  deleteBySpaceId,
  deleteByTeamId,
};
