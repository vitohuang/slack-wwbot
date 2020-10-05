
exports.up = function(knex) {
  return knex.schema.table('spaces', (table) => {
    table.string('unit').defaultTo('imperial');
  });
};

exports.down = function(knex) {
  return knex.schema.table('spaces', (table) => {
    table.dropColumn('unit');
  });
};
