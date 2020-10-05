const debug = require('debug')('Faye:worker');
const Agenda = require('agenda');

// Start the connection
const mongoConnectionString = process.env.MONGO_CONNECTION_STRING;
const agenda = new Agenda({
  processEvery: '5 minutes',
  db: {
    address: mongoConnectionString,
    collection: 'slack-wwbot',
    options: {
      ssl: true,
      useUnifiedTopology: true,
    },
  },
});

agenda.on('start', job => {
  debug('Job %s starting', job.attrs.name);
});

agenda.on('complete', job => {
  debug(`Job ${job.attrs.name} finished`);
});

agenda.on('success', job => {
  debug(`Job ${job.attrs.name} success`);
});

agenda.on('fail', (error, job) => {
  debug(`Job ${job.attrs.name} failed - ${error.message}`);
});

module.exports = agenda;
