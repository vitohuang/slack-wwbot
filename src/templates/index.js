const _ = require('lodash');

const templates = {
  welcome: `{
    "text": "Welcome"
  }`,
  help: `{
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "Settings",
          "emoji": true
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Setup the feeds by typing *setup* here"
        }
      }
    ]
  }`,
};

module.exports = (name, data = {}) => {
  // Compile the template string
  const compiled = _.template(templates[name]);
  const compiledStr = compiled(data);

  // Make it into object again
  return JSON.parse(compiledStr);
};
