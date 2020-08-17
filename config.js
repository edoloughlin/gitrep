const util = require('util');
const fs = require('fs');

const readFile = util.promisify(fs.readFile);

const getConfig = async (configPath) => {
  const path = configPath || './config.json';
  try {
    let json = JSON.parse(await readFile(path, 'utf8'));
    // Add a reverse mapping for aliases
    json.unalias = Object.keys(json.aliases)
      .map(name => json.aliases[name].reduce((acc, email) => ({
        ...acc,
        [email]: name
      }), {}))
      .reduce((acc, cur) => ({...acc, ...cur}), {});
    return json;
  }
  catch(e) {
    console.error(`Problem reading config from ${path}:`, e);
    throw new error(e, `Problem reading config from ${path}:`);
  }
}

module.exports = { getConfig };
