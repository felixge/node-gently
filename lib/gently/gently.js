var Gently = exports.Gently = function() {
  this.expectations = [];

  var self = this;
  process.addListener('exit', function() {
    self.verify();
  });
};

Gently.prototype.expect = function(obj, method, count, mock) {
  if (typeof count == 'function') {
    mock = count;
    count = 1;
  } else if (count === undefined) {
    count = 1;
  }

  while (count-- > 0) {
    this.expectations.push({obj: obj, method: method, mock: mock});
  }

  var self = this, original = obj[method];
  obj[method] = function() {
    self._mock(this, obj, method, Array.prototype.slice.call(arguments));
  };
  obj[method]._original = original;
};

Gently.prototype.restore = function(obj, method) {
  if (!obj[method] || !obj[method]._original) {
    throw new Error(obj.toString()+'.'+method+'() is not gently mocked');
  }
  obj[method] = obj[method]._original;
};

Gently.prototype.verify = function() {
  if (!this.expectations.length) {
    return;
  }

  var expectation = this.expectations[0];
  throw new Error
    ( 'Expected call to '+expectation.obj.toString()+'.'+expectation.method
    + ' did not happen'
    );
};

Gently.prototype._mock = function(self, obj, method, args) {
  var expectation = this.expectations.shift();
  if (!expectation) {
    throw new Error
      ( 'Unexpected call to '+obj.toString()+'.'+method+'(),'
      +' no call was expected'
      );
  }

  if (expectation.obj !== obj || expectation.method !== method) {
    this.expectations.unshift(expectation);
    throw new Error
      ( 'Unexpected call to '+obj.toString()+'.'+method+'(), expected call to '
      +expectation.obj.toString()+'.'+expectation.method+'()'
      );
  }

  if (expectation.mock) {
    return expectation.mock.apply(self, args);
  }
};