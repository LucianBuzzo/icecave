const Benchmark = require('benchmark')
const element = require('./fixtures/ditto.json')
const uuid = require('uuid/v4')
const IceCave = require('..')

const suite = new Benchmark.Suite()

const insertDB = new IceCave({
  directory: './test/data',
  name: `test_${uuid()}`,
  memoryOnly: true
})
const filterDB = new IceCave({
  directory: './test/data',
  name: `test_${uuid()}`,
  memoryOnly: true
})

filterDB.insert(element)
let count = 99
while (count--) {
  filterDB.insert({ foo: 'bar', id: uuid() })
}

// add tests
suite
  .add('.insert()', () => {
    return insertDB.insert(element)
  })
  .add('.filter() 100 records', () => {
    return filterDB.filter({
      type: 'object',
      properties: {
        name: {
          const: 'ditto'
        }
      },
      required: [ 'name' ]
    })
  })
  // add listeners
  .on('cycle', (event) => {
    console.log(String(event.target))
  })
  .on('complete', () => {
    insertDB.shutdown()
    filterDB.shutdown()
  })
  // run async
  .run({
    async: true,
    minSamples: 10000,
    minTime: 10 * 1000
  })
