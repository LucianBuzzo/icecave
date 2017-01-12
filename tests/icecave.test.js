const test = require('tape');
const IceCave = require('../icecave');

test('File system', function (t) {
  let pass1 = false;

  try {
   let storage = IceCave.create('/non/existent/directory');
  } catch (e) {
    pass1 = true;
  }

  t.doesNotThrow(
    () => IceCave.create(__dirname + '/data'),
    "An error shouldn't be thrown if the directory exists"
  );

  t.throws(
    () => IceCave.create('/non/existent/directory'),
    "An error should be thrown if the directory doesn't exist"
  );

  t.end();
});

// Force test to end
test.onFinish(() => process.exit(0));


