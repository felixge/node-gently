var Gently = exports.Gently = function() {
  this.expectations = [];

  var self = this;
  process.addListener('exit', function() {
    self.verify('process exit');
  });
};

Gently.prototype.toString = function() {
  return '[Gently]';
};

Gently.prototype.expect = function(obj, method, count, mock) {
  var name;
  if (typeof obj == 'function') {
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

  if (obj) {
    name = obj.toString()+'.'+method+'()';
  } else {
    if (mock.name) {
      name = mock.name+'()';
    } else {
      name = '>> '+mock.toString()+' <<';
    }
  }

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
    throw new Error(obj.toString()+'.'+method+'() is not gently mocked');
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