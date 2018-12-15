const ava = require('ava')
const path = require('path')
const uuid = require('uuid/v4')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const IceCave = require('..')

ava('.insert() should add an element', async (t) => {
  const directory = path.join(__dirname, 'data')
  const name = `test_${uuid()}`
  const db = new IceCave({
    directory,
    name
  })

  db.insert({
    foo: 'bar'
  })

  await db.shutdown()

  t.deepEqual(require(path.join(directory, `${name}.json`)), [
    {
      foo: 'bar'
    }
  ])
})

ava('.insert() modifying an element after insertion should not change the element', async (t) => {
  const directory = path.join(__dirname, 'data')
  const name = `test_${uuid()}`
  const db = new IceCave({
    directory,
    name
  })

  const element = {
    foo: 'bar',
    baz: 1
  }

  db.insert(element)

  element.baz = 2

  const results = db.filter({
    type: 'object',
    properties: {
      foo: {
        const: 'bar'
      }
    },
    required: [ 'foo' ]
  })

  await db.shutdown()

  t.deepEqual(results, [
    {
      foo: 'bar',
      baz: 1
    }
  ])
})

ava('.filter() should retrieve an element', async (t) => {
  const db = new IceCave({
    directory: path.join(__dirname, 'data'),
    name: `test_${uuid()}`
  })

  db.insert({
    foo: 'bar',
    baz: 'buzz'
  })

  db.insert({
    bar: 'foo',
    buzz: 'baz'
  })

  const results = db.filter({
    type: 'object',
    properties: {
      foo: {
        const: 'bar'
      }
    },
    required: [ 'foo' ]
  })

  await db.shutdown()

  t.deepEqual(results, [
    {
      foo: 'bar',
      baz: 'buzz'
    }
  ])
})

ava('.filter() modifying an element after retrieval should not change the element', async (t) => {
  const directory = path.join(__dirname, 'data')
  const name = `test_${uuid()}`
  const db = new IceCave({
    directory,
    name
  })

  db.insert({
    foo: 'bar',
    baz: 1
  })

  const [ element ] = db.filter({
    type: 'object',
    properties: {
      foo: {
        const: 'bar'
      }
    },
    required: [ 'foo' ]
  })

  element.baz = 2

  const results = db.filter({
    type: 'object',
    properties: {
      foo: {
        const: 'bar'
      }
    },
    required: [ 'foo' ]
  })

  await db.shutdown()

  t.deepEqual(results, [
    {
      foo: 'bar',
      baz: 1
    }
  ])
})

ava('.delete() should remove an element', async (t) => {
  const directory = path.join(__dirname, 'data')
  const name = `test_${uuid()}`
  const db = new IceCave({
    directory,
    name
  })

  db.insert({
    foo: 'bar',
    baz: 'buzz'
  })

  db.insert({
    bar: 'foo',
    buzz: 'baz'
  })

  db.delete({
    type: 'object',
    properties: {
      foo: {
        const: 'bar'
      }
    },
    required: [ 'foo' ]
  })

  const queryResults = db.filter({
    type: 'object',
    properties: {
      foo: {
        const: 'bar'
      }
    },
    required: [ 'foo' ]
  })

  t.deepEqual(queryResults, [])

  await db.shutdown()

  t.deepEqual(require(path.join(directory, `${name}.json`)), [
    {
      bar: 'foo',
      buzz: 'baz'
    }
  ])
})

ava('.update() should modify an element using a JSON patch', async (t) => {
  const directory = path.join(__dirname, 'data')
  const name = `test_${uuid()}`
  const db = new IceCave({
    directory,
    name
  })

  db.insert({
    foo: 'bar',
    baz: 'buzz'
  })

  db.update({
    type: 'object',
    properties: {
      baz: {
        const: 'buzz'
      }
    }
  }, [
    { op: 'replace', path: '/baz', value: 'boo' }
  ])

  const queryResults = db.filter({
    type: 'object',
    properties: {
      baz: {
        const: 'buzz'
      }
    },
    required: [ 'foo' ]
  })

  t.deepEqual(queryResults, [])

  await db.shutdown()

  t.deepEqual(require(path.join(directory, `${name}.json`)), [
    {
      foo: 'bar',
      baz: 'boo'
    }
  ])
})

ava('.dump() should write a readable JSON file when called multiple times', async (t) => {
  const directory = path.join(__dirname, 'data')
  const name = `test_${uuid()}`
  const db = new IceCave({
    directory,
    name
  })

  db.insert({
    foo: 'bar'
  })

  await db.shutdown()

  await db.dump()
  await db.dump()
  await db.dump()

  t.deepEqual(require(path.join(directory, `${name}.json`)), [
    {
      foo: 'bar'
    }
  ])
})

ava('Resulting npm package should be usable', async (t) => {
  await t.notThrowsAsync(exec('./test/npm-smoke-test.sh'))
})
