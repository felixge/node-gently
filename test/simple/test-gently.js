require('../common');
var Gently = require('gently').Gently;

(function testConstructor() {
  var gently = new Gently();
  assert.deepEqual(gently.expectations, []);
})();

(function testExpect() {
  var gently = new Gently()
    , OBJ = {};

  OBJ.foo = function(x) {
    return x;
  };

  var original = OBJ.foo
    , mock = function() {};

  (function testAddOne() {
    gently.expect(OBJ, 'foo', mock);

    assert.equal(gently.expectations.length, 1);
    var expectation = gently.expectations[0];
    assert.strictEqual(expectation.obj, OBJ);
    assert.strictEqual(expectation.method, 'foo');
    assert.strictEqual(expectation.mock, mock);
    assert.strictEqual(OBJ.foo._original, original);
  })();

  (function testAddTwo() {
    gently.expect(OBJ, 'foo', 2, mock);
    assert.equal(gently.expectations.length, 3);
  })();

  (function testAddOneWithoutMock() {
    gently.expect(OBJ, 'foo');
    assert.equal(gently.expectations.length, 4);
  })();

  var mockCalled = 0, SELF = {};
  gently._mock = function(self, obj, method, args) {
    mockCalled++;
    assert.strictEqual(self, SELF);
    assert.strictEqual(obj, OBJ);
    assert.strictEqual(method, 'foo');
    assert.deepEqual(args, [1, 2]);
  };
  OBJ.foo.apply(SELF, [1, 2]);
  assert.equal(mockCalled, 1);
})();

(function testRestore() {
  var gently = new Gently()
    , OBJ = {};

  OBJ.foo = function(x) {
    return x;
  };

  OBJ.toString = function() {
    return '[my object]';
  };

  var original = OBJ.foo;
  gently.expect(OBJ, 'foo');
  gently.restore(OBJ, 'foo');
  assert.strictEqual(OBJ.foo, original);

  (function testError() {
    try {
      gently.restore(OBJ, 'foo');
      assert.ok(false, 'throw needs to happen');
    } catch (e) {
      assert.equal(e.message, '[my object].foo() is not gently mocked');
    }
  })();
})();

(function testMock() {
  var gently = new Gently()
    , OBJ1 = {toString: function() {return '[OBJ 1]'}}
    , OBJ2 = {toString: function() {return '[OBJ 2]'}}
    , SELF = {};

  gently.expect(OBJ1, 'foo', function(x) {
    assert.strictEqual(this, SELF);
    return x * 2;
  });

  assert.equal(gently._mock(SELF, OBJ1, 'foo', [5]), 10);

  (function testNoMoreCallExpected() {
    try {
      gently._mock(SELF, OBJ1, 'foo', [5]);
      assert.ok(false, 'throw needs to happen');
    } catch (e) {
      assert.equal(e.message, 'Unexpected call to [OBJ 1].foo(), no call was expected');
    }
  })();

  (function testDifferentCallExpected() {
    gently.expect(OBJ2, 'bar');
    try {
      gently._mock(SELF, OBJ1, 'foo', [5]);
      assert.ok(false, 'throw needs to happen');
    } catch (e) {
      assert.equal(e.message, 'Unexpected call to [OBJ 1].foo(), expected call to [OBJ 2].bar()');
    }

    assert.equal(gently.expectations.length, 1);
  })();

  (function testNoMockCallback() {
    OBJ2.bar();
    assert.equal(gently.expectations.length, 0);
  })();
})();

(function testVerify() {
  var gently = new Gently()
    , OBJ = {toString: function() {return '[OBJ]'}};

  gently.verify();

  gently.expect(OBJ, 'foo');
  try {
    gently.verify();
    assert.ok(false, 'throw needs to happen');
  } catch (e) {
    assert.equal(e.message, 'Expected call to [OBJ].foo did not happen');
  }
})();

(function testProcessExit() {
  process.removeAllListeners('exit');

  var gently = new Gently()
    , verifyCalled = 0;

  gently.verify = function() {
    verifyCalled++;
  };

  process.emit('exit');
  assert.equal(verifyCalled, 1);
})();