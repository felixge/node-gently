var path = require('path')
  , sys = require('sys');

require.paths.unshift(path.dirname(__dirname)+'/lib');

global.puts = sys.puts;
global.p = sys.p;
global.assert = require('assert');