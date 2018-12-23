const Ajv = require('ajv')
const clone = require('deep-copy')
const fs = require('fs')
const jsonpatch = require('jsonpatch')
const path = require('path')
const memoize = require('fast-memoize')

const ajv = new Ajv()

const compile = memoize((query) => {
  return ajv.compile(query)
})

const patchDocument = (patch, element) => {
  return jsonpatch.apply_patch(element, patch)
}

module.exports = class IceCave {
  /**
   * @summary Create an instance of IceCave
   * @name IceCave
   * @class
   * @public
   *
   * @param {Object} config - Configuration object
   * @param {String} [config.directory=./icecave-data] - The directory where icecave data is stored
   * @param {String} [config.name=icecave] - The name of this instance
   * @param {Boolean} [config.memoryOnly=false] - Set to true to stop the db
   * from being written to the filesystem
   *
   * @example
   * const db = new IceCave()
   */
  constructor (config = {}) {
    const options = Object.assign({
      directory: './icecave-data',
      name: 'icecave',
      memoryOnly: false
    }, config)

    if (!fs.existsSync(options.directory)) {
      throw new Error(`Whoops! The directory "${options.directory}" doesn't exist. Please create it and try again.`)
    }

    const writeInterval = 5000
    let running = true
    let loopTimeout

    /**
     * @desc The source data used to seed this DB instance. If the data file is not
     * available this will be an empty array.
     * @type {Array}
     * @const
     * @private
     */
    let data = (() => {
      try {
        let flatFileData = fs.readFileSync(path.join(options.directory, `${options.name}.json`), 'utf8')
        let parsed = JSON.parse(flatFileData)
        return parsed
      } catch (e) {
        return []
      }
    })()

    /**
     * @summary Writes the in memory storage to a JSON file.
     *
     * @public
     *
     * @description Dumps the store to a JSON file and shuts down the DB
     *
     * @memberOf IceCave#
     *
     * @async
     * @return {Promise<String>} The path of the stored JSON file
     *
     * @public
     *
     * @example
     * const db = new IceCave()
     *
     * await db.dump()
     */
    const dump = () => {
      if (options.memoryOnly) {
        return Promise.resolve(null)
      }

      return new Promise((resolve, reject) => {
        const dbPath = path.join(options.directory, `${options.name}.json`)

        if (data.length === 0) {
          return fs.writeFile(dbPath, '[]', (err) => {
            if (err) {
              reject(err)
            } else {
              resolve(dbPath)
            }
          })
        }

        const record = clone(data)

        try {
          const wstream = fs.createWriteStream(dbPath)
          wstream.on('finish', () => resolve(dbPath))

          const length = record.length - 1

          wstream.write('[\n')
          for (let index = 0; index < length; index++) {
            wstream.write(JSON.stringify(record[index]))
            wstream.write(',\n')
          }
          wstream.write(JSON.stringify(record[length]))
          wstream.write('\n]')
          wstream.end()
        } catch (err) {
          reject(err)
        }
      })
    }

    const loop = () => {
      dump()

      if (!running) {
        return
      }
      loopTimeout = setTimeout(loop, writeInterval)
    }

    loop()

    return {
      dump,

      /**
       * @desc Insert an element into the database
       *
       * @param {Object} element - The element to insert
       *
       * @memberOf IceCave#
       *
       * @public
       *
       * @example
       * const db = new IceCave()
       *
       * db.insert({
       *   foo: 'bar',
       *   baz: 'buzz'
       * })
       */
      insert (element) {
        data.push(clone(element))
      },

      /**
       * @desc Delete elements in the store the match a JSON schema.
       *
       * @param {Object} query - The JSON schema to validate against
       *
       * @memberOf IceCave#
       *
       * @public
       *
       * @example
       * const db = new IceCave()
       *
       * db.insert({
       *   foo: 'bar',
       *   baz: 'buzz'
       * })
       *
       * db.delete({
       *   type: 'object',
       *   properties: {
       *     foo: {
       *       const: 'bar'
       *     }
       *   }
       * })
       */
      delete (query) {
        const results = []

        const isValid = compile(query)

        for (const element of data) {
          if (!isValid(element)) {
            results.push(clone(element))
          }
        }

        data = results
      },

      /**
       * @desc Retrieve elements in the store that match a JSON schema.
       *
       * @memberOf IceCave#
       *
       * @param {Object} query - The JSON schema to validate against
       *
       * @returns {Array} An array of elements
       *
       * @public
       *
       * @example
       * const db = new IceCave()
       *
       * db.insert({
       *   foo: 'bar',
       *   baz: 'buzz'
       * })
       *
       * const results = db.filter({
       *   type: 'object',
       *   properties: {
       *     foo: {
       *       const: 'bar'
       *     }
       *   }
       * })
       *
       * console.log(results)
       */
      filter (query) {
        const results = []

        const isValid = compile(query)

        for (const element of data) {
          if (isValid(element)) {
            results.push(clone(element))
          }
        }

        return results
      },

      /**
       * @summary Update one or more elements
       *
       * @description Select elements that match a JSON schema and update them
       * using a JSON patch object.
       *
       * @memberOf IceCave#
       *
       * @param {Object} query - The JSON schema to validate against
       * @param {Object} patch - An RFC 6902 JSON patch object
       * @see https://tools.ietf.org/html/rfc6902
       *
       * @public
       *
       * @example
       * const db = new IceCave()
       *
       * db.insert({
       *   foo: 'bar',
       *   baz: 'buzz'
       * })
       *
       * db.update({
       *   type: 'object',
       *   properties: {
       *     foo: {
       *       const: 'bar'
       *     }
       *   }
       * },
       * [
       *   { "op": "replace", "path": "/baz", "value": "boo" }
       * ])
       */
      update (query, patch) {
        const isValid = compile(query)

        for (let index = 0; index < data.length; index++) {
          if (isValid(data[index])) {
            data[index] = patchDocument(patch, data[index])

            return data[index]
          }
        }
      },

      /**
       * @summary Shutdown the database
       *
       * @description Dumps the store to a JSON file and shuts down the DB
       *
       * @memberOf IceCave#
       *
       * @async
       * @return {Promise}
       *
       * @public
       *
       * @example
       * const db = new IceCave()
       *
       * await db.shutdown()
       */
      async shutdown () {
        running = false
        clearTimeout(loopTimeout)
        await dump()
      }
    }
  }
}
