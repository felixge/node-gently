var path = require('path')
  , util = require('util');

global.puts = console.log;
global.p = function() {
  console.error(util.inspect.apply(null, arguments));
};
global.assert = require('assert');
