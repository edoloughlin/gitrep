const db = require('./db');
const util = require('util');

const config = require('./config');

const main = async () => {
  console.log(await config.getConfig());
}

main();
