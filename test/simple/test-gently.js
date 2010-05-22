require('../common');
var Gently = require('gently').Gently
  , gently;

function test(test) {
  process.removeAllListeners('exit');
  gently = new Gently();
  test();
}

test(function constructor() {
  assert.deepEqual(gently.expectations, []);
});

test(function toString() {
  assert.deepEqual(gently.toString(), '[Gently]');
});

test(function expectObjMethod() {
  var OBJ = {};
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
    assert.strictEqual(expectation.name, OBJ.toString()+'.foo()');
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
  gently._mock = function(self, obj, method, name, args) {
    mockCalled++;
    assert.strictEqual(self, SELF);
    assert.strictEqual(obj, OBJ);
    assert.strictEqual(method, 'foo');
    assert.strictEqual(name, gently.expectations[0].name);
    assert.deepEqual(args, [1, 2]);
    return 23;
  };
  assert.equal(OBJ.foo.apply(SELF, [1, 2]), 23);
  assert.equal(mockCalled, 1);
});

test(function expectClosure() {
  function closureFn() {}

  var fn = gently.expect(closureFn);
  assert.equal(gently.expectations.length, 1);
  var expectation = gently.expectations[0];
  assert.strictEqual(expectation.obj, null);
  assert.strictEqual(expectation.method, null);
  assert.strictEqual(expectation.mock, closureFn);
  assert.strictEqual(expectation.name, 'closureFn()');

  var mockCalled = 0, SELF = {};
  gently._mock = function(self, obj, method, name, args) {
    mockCalled++;
    assert.strictEqual(self, SELF);
    assert.strictEqual(obj, null);
    assert.strictEqual(method, null);
    assert.strictEqual(name, 'closureFn()');
    assert.deepEqual(args, [1, 2]);
    return 23;
  };
  assert.equal(fn.apply(SELF, [1, 2]), 23);
  assert.equal(mockCalled, 1);

  var noName = function() {return a+a};
  gently.expect(2, noName);
  assert.equal(gently.expectations.length, 3);
  assert.equal(gently.expectations[1].name, '>> '+noName.toString()+' <<');
});

test(function restore() {
  var OBJ = {};
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
});

test(function mock() {
  var OBJ1 = {toString: function() {return '[OBJ 1]'}}
    , OBJ2 = {toString: function() {return '[OBJ 2]'}}
    , SELF = {};

  gently.expect(OBJ1, 'foo', function(x) {
    assert.strictEqual(this, SELF);
    return x * 2;
  });

  assert.equal(gently._mock(SELF, OBJ1, 'foo', 'dummy_name', [5]), 10);

  (function testNoMoreCallExpected() {
    try {
      gently._mock(SELF, OBJ1, 'foo', 'dummy_name', [5]);
      assert.ok(false, 'throw needs to happen');
    } catch (e) {
      assert.equal(e.message, 'Unexpected call to dummy_name, no call was expected');
    }
  })();

  (function testDifferentCallExpected() {
    gently.expect(OBJ2, 'bar');
    try {
      gently._mock(SELF, OBJ1, 'foo', 'dummy_name', [5]);
      assert.ok(false, 'throw needs to happen');
    } catch (e) {
      assert.equal(e.message, 'Unexpected call to dummy_name, expected call to [OBJ 2].bar()');
    }

    assert.equal(gently.expectations.length, 1);
  })();

  (function testNoMockCallback() {
    OBJ2.bar();
    assert.equal(gently.expectations.length, 0);
  })();
});

test(function verify() {
  var OBJ = {toString: function() {return '[OBJ]'}};
  gently.verify();

  gently.expect(OBJ, 'foo');
  try {
    gently.verify();
    assert.ok(false, 'throw needs to happen');
  } catch (e) {
    assert.equal(e.message, 'Expected call to [OBJ].foo() did not happen');
  }

  try {
    gently.verify('foo');
    assert.ok(false, 'throw needs to happen');
  } catch (e) {
    assert.equal(e.message, 'Expected call to [OBJ].foo() did not happen (foo)');
  }
});

test(function processExit() {
  var verifyCalled = 0;
  gently.verify = function(msg) {
    verifyCalled++;
    assert.equal(msg, 'process exit');
  };

  process.emit('exit');
  assert.equal(verifyCalled, 1);
});