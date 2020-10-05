const debug = require('debug')('Faye:DBTeams');
const knex = require('../connection');

function cleanUp(team) {
  if (team && typeof team.bot === 'string') {
    team.bot = JSON.parse(team.bot);
  }

  if (team && typeof team.data === 'string') {
    team.data = JSON.parse(team.data);
  }

  return team;
}

async function add(data) {
  // Clean up the data first

  // Insert it
  const result = await knex('teams').insert({
    team_id: data.team_id,
    team_name: data.team_name,
    access_token: data.access_token,
    /*
    bot: data.bot,
    data: data,
    */
    bot: JSON.stringify(data.bot),
    data: JSON.stringify(data),
  });

  debug('result after insert into database', result);
  return result;
}

async function get(teamId) {
  const result = await knex('teams')
    .select('*')
    .where({
      team_id: teamId,
    })
    .first();

  debug('after getting team id info', teamId, result);

  return cleanUp(result);
}

async function getAll() {
  const results = await knex('teams')
    .select('*');

  return results.map((team) => cleanUp(team));
}
async function deleteByTeamId(teamId) {
  debug('going to delete by teamid', teamId);
  const result = await knex('teams')
    .del()
    .where({
      team_id: teamId,
    });

  debug('deleted team id from team', teamId);
  return result;
}

module.exports = {
  add,
  get,
  getAll,
  deleteByTeamId,
};
