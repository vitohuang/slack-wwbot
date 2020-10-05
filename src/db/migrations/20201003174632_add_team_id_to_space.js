
exports.up = function(knex) {
  return knex.schema.table('spaces', (table) => {
    table.string('team_id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('spaces', (table) => {
    table.dropColumn('team_id');
  });
};
