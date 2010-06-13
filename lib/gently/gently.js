var path = require('path');

function Gently() {
  this.expectations = [];
  this.hijacked = {};

  var self = this;
  process.addListener('exit', function() {
    self.verify('process exit');
  });
};
module.exports = Gently;

Gently.prototype.stub = function(location, exportsName) {
  function Stub() {
    Stub['new'].apply(this, arguments);
  };

  Stub['new'] = function () {};

  var stubName = 'require('+JSON.stringify(location)+')';
  if (exportsName) {
    stubName += '.'+exportsName;
  }

  Stub.prototype.toString = Stub.toString = function() {
    return stubName;
  };

  var exports = this.hijacked[location] || {};
  if (exportsName) {
    exports[exportsName] = Stub;
  } else {
    exports = Stub;
  }

  this.hijacked[location] = exports;
  return Stub;
};

Gently.prototype.hijack = function(realRequire) {
  var self = this;
  return function(location) {
    return self.hijacked[location] = (self.hijacked[location])
      ? self.hijacked[location]
      : realRequire(location);
  };
};

Gently.prototype.expect = function(obj, method, count, mock) {
  if (typeof obj != 'function' && typeof obj != 'object') {
    throw new Error
      ( 'Bad 1st argument for gently.expect(), '
      + 'object or function expected, got: '+(typeof obj)
      );
  } else if (typeof obj == 'function' && (typeof method != 'string')) {
    // expect(mock) interface
    mock = obj;
    obj = null;
    method = null;
    count = 1;
  } else if (typeof method == 'function') {
    // expect(count, mock) interface
    count = obj;
    mock = method;
    obj = null;
    method = null;
  } else if (typeof count == 'function') {
    // expect(obj, method, mock) interface
    mock = count;
    count = 1;
  } else if (count === undefined) {
    // expect(obj, method) interface
    count = 1;
  }

  var name = this._name(obj, method, mock);
  while (count-- > 0) {
    this.expectations.push({obj: obj, method: method, mock: mock, name: name});
  }

  var self = this;
  function delegate() {
    return self._mock(this, obj, method, name, Array.prototype.slice.call(arguments));
  }

  if (!obj) {
    return delegate;
  }

  var original = obj[method];
  obj[method] = delegate;
  return obj[method]._original = original;
};

Gently.prototype.restore = function(obj, method) {
  if (!obj[method] || !obj[method]._original) {
    throw new Error(this._name(obj, method)+' is not gently mocked');
  }
  obj[method] = obj[method]._original;
};

Gently.prototype.verify = function(msg) {
  if (!this.expectations.length) {
    return;
  }

  var expectation = this.expectations[0];
  throw new Error
    ( 'Expected call to '+expectation.name+' did not happen'
    + ( (msg)
        ? ' ('+msg+')'
        : ''
      )
    );
};

Gently.prototype._mock = function(self, obj, method, name, args) {
  var expectation = this.expectations.shift();
  if (!expectation) {
    throw new Error('Unexpected call to '+name+', no call was expected');
  }

  if (expectation.obj !== obj || expectation.method !== method) {
    this.expectations.unshift(expectation);
    throw new Error('Unexpected call to '+name+', expected call to '+ expectation.name);
  }

  if (expectation.mock) {
    return expectation.mock.apply(self, args);
  }
};

Gently.prototype._name = function(obj, method, mock) {
  if (obj) {
    var objectName = obj.toString();
    if (objectName == '[object Object]' && obj.constructor.name) {
      objectName = '['+obj.constructor.name+']';
    }
    return (objectName)+'.'+method+'()';
  }

  if (mock.name) {
    return mock.name+'()';
  }

  return '>> '+mock.toString()+' <<';
};