const path = require('path')
const test = require('tape')
const IceCave = require('../icecave')

test('File system', function (t) {
  t.doesNotThrow(
    () => IceCave.create(path.join(__dirname, '/data')),
    "An error shouldn't be thrown if the directory exists"
  )

  t.throws(
    () => IceCave.create(path.join('non', 'existent', 'directory')),
    "An error should be thrown if the directory doesn't exist"
  )

  t.end()
})

// Force test to end
test.onFinish(() => process.exit(0))
