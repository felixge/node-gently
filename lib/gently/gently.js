var path = require('path');

function Gently() {
  this.expectations = [];
  this.hijacked     = {};

  var self = this;
  process.addListener('exit', function() {
    self.verify('process exit');
  });
}
module.exports = Gently;

Gently.prototype.stub = function(location, exportsName) {
  function Stub() {
    return Stub['new'].apply(this, arguments);
  }

  Stub['new'] = function() {};

  var stubName = 'require(' + JSON.stringify(location) + ')';
  if (exportsName) {
    stubName += '.' + exportsName;
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
    if (!self.hijacked[location]) {
      self.hijacked[location] = realRequire(location);
    }

    return self.hijacked[location];
  };
};

Gently.prototype.expect = function(obj, method, count, stubFn) {
  var stackError = new Error();
  var caller     = stackError.stack.split('\n')[2].trim();

  if (typeof obj != 'function' && typeof obj != 'object' && typeof obj != 'number') {
    var eMsg = '';

    eMsg += 'Bad 1st argument for gently.expect(), ';
    eMsg += 'object, function, or number expected, got: ';
    eMsg += (typeof obj);

    throw new Error(eMsg);
  } else if (typeof obj == 'function' && (typeof method != 'string')) {
    // expect(stubFn) interface
    stubFn = obj;
    obj    = null;
    method = null;
    count  = 1;
  } else if (typeof method == 'function') {
    // expect(count, stubFn) interface
    count  = obj;
    stubFn = method;
    obj    = null;
    method = null;
  } else if (typeof count == 'function') {
    // expect(obj, method, stubFn) interface
    stubFn = count;
    count  = 1;
  } else if (count === undefined) {
    // expect(obj, method) interface
    count = 1;
  }

  var name = this._name(obj, method, stubFn);
  this.expectations.push({
    obj    : obj,
    method : method,
    stubFn : stubFn,
    name   : name,
    count  : count,
    caller : caller
  });

  var self = this;

  function delegate() {
    return self._stubFn(this, obj, method, name, Array.prototype.slice.call(arguments));
  }

  if (!obj) {
    return delegate;
  }

  var original = (obj[method]) ? obj[method]._original || obj[method] : undefined;

  obj[method] = delegate;
  return (obj[method]._original = original);
};

Gently.prototype.restore = function(obj, method) {
  if (!obj[method] || !obj[method]._original) {
    throw new Error(this._name(obj, method) + ' is not gently stubbed');
  }
  obj[method] = obj[method]._original;
};

Gently.prototype.verify = function(msg) {
  if (!this.expectations.length) {
    return;
  }

  var validExpectations = [];
  for (var i = 0, l = this.expectations.length; i < l; i++) {
    var expectation = this.expectations[i];

    if (expectation.count > 0) {
      validExpectations.push(expectation);
    }
  }

  this.expectations = []; // reset so that no duplicate verification attempts are made

  if (!validExpectations.length) {
    return;
  }

  var firstExpectation = validExpectations[0];

  var eMsg = '';
  eMsg += 'Expected call to ' + firstExpectation.name + ' did not happen';
  if (firstExpectation.caller) {
    eMsg += ' ' + firstExpectation.caller;
  }
  if (msg) {
    eMsg += ' (' + msg + ')';
  }
  throw new Error(eMsg);
};

Gently.prototype._stubFn = function(self, obj, method, name, args) {
  var expectation = this.expectations[0];

  if (!expectation) {
    throw new Error('Unexpected call to ' + name + ', no call was expected');
  }

  if (expectation.obj !== obj || expectation.method !== method) {
    throw new Error('Unexpected call to ' + name + ', expected call to ' + expectation.name);
  }

  expectation.count -= 1;
  if (expectation.count === 0) {
    this.expectations.shift();

    // autorestore original if its not a closure
    // and no more expectations on that object
    var has_more_expectations = this.expectations.reduce(function(memo, expectation) {
      return memo || (expectation.obj === obj && expectation.method === method);
    }, false);
    if (obj !== null && method !== null && !has_more_expectations) {
      if (typeof obj[method]._original !== 'undefined') {
        obj[method] = obj[method]._original;
        delete obj[method]._original;
      } else {
        delete obj[method];
      }
    }
  }

  if (expectation.stubFn) {
    return expectation.stubFn.apply(self, args);
  }
};

Gently.prototype._name = function(obj, method, stubFn) {
  if (obj) {
    let objectName
    if (typeof obj === 'function' && obj.name) {
      objectName = obj.name;
    } else {
      objectName = obj.toString();
    }
    return objectName + '.' + method + '()';
  }

  if (stubFn.name) {
    return stubFn.name + '()';
  }

  return '>> ' + stubFn.toString() + ' <<';
};
