const jwt = require('jsonwebtoken');

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

// Convert case etc
function camelToSnake(s) {
  s = s.replace(/([A-Z])/g, "_$1");
  return s.toLowerCase();
}

function snakeToCamel(s) {
  return s.replace(/(\_\w)/g, function(m){return m[1].toUpperCase();});
}

function keysConvertor(fn) {
  return (input) => {
    const output = {};
    Object.keys(input).map(key => {
      const camelKey = fn(key);
      output[camelKey] = input[key];
    });

    return output;
  };
}

const keysSnakeToCamel = keysConvertor(snakeToCamel);
const keysCamelToSnake = keysConvertor(camelToSnake);

function cleanUp(input) {
  if (Array.isArray(input)) {
    // Transform item - e.g snake case to camelcase
    return input.map(item => {
      return keysSnakeToCamel(item);
    });
  } else if (input) {
    return keysSnakeToCamel(input);
  } else {
    return input;
  }
}

function generateLoginLink(teamId, userId) {
  return new Promise((resolve, reject) => {
    // Sign a jwt token
		const token = jwt.sign({
			data: {
        teamId,
        userId,
      },
		}, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Resolve the token
    const loginUrl = `${process.env.SITE_URL}/settings?token=${token}`;

    // Result the login url
    resolve(loginUrl);
  });
}

module.exports = {
  slugify,
  camelToSnake,
  snakeToCamel,
  keysSnakeToCamel,
  keysCamelToSnake,
  cleanUp,
  generateLoginLink,
};
