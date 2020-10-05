const templates = require('../src/templates/');

// Test the templates
describe('Testing templates', () => {
  test('Welcome template', () => {
    const result = templates('welcome');
    expect(typeof result).toBe('object');
  });
  test('Welcome template', () => {
    const result = templates('welcome');
		const welcome = {
			"text": "Welcome"
		};
    expect(result).toEqual(welcome);
  });
});
