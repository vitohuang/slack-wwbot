
exports.up = function(knex) {
  return createTeams()

  function createTeams() {
    return knex.schema.createTable('teams', (table) => {
      table.increments('id').primary();
      table.string('team_name');
      table.string('team_id');
      table.string('access_token');
      table.json('bot');
      table.json('setting');
      table.json('data');
      table.timestamps(false, true);
    });
  }
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTable('teams'),
  ]);
};
