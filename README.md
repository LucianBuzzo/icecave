# IceCave DB

[![Build Status](https://travis-ci.org/LucianBuzzo/IceCave-DB.svg?branch=master)](https://travis-ci.org/LucianBuzzo/IceCave-DB)
[![npm version](https://badge.fury.io/js/icecave.svg)](http://badge.fury.io/js/icecave)
[![Dependency Status](https://img.shields.io/david/LucianBuzzo/IceCave-DB.svg)](https://david-dm.org/LucianBuzzo/IceCave-DB)

A lightweight flat file storage system for nodejs.

Highlights
----------

- **JSON-centric**: Query using [JSON schema](https://json-schema.org/) and update using [JSON patch](https://tools.ietf.org/html/rfc6902)
- **Lightweight**: Minimal configuration means no deployment headaches
- **Portable**: Usable everywhere a node runtime is available

Motivation
----------


IceCave is designed for use in applications where relatively small amounts of
data (less than 10000 elements) need to be stored persistently and a dedicated
external database service is impractical or overkill.
IceCave stores data in-memory and periodically dumps it's contents to
a JSON file. On startup it will read this file location and load any data found
there.

# Usage

Below is an example how to use IceCave DB:

```js
const IceCave = require('icecave');

// Create a new storage instance that will be written to the directory './data-directory'
const db = new IceCave({
  directory: __dirname + '/data-directory',
})

// Add elements to the database
db.insert({ id: 1, name: 'Abra' })
db.insert({ id: 2, name: 'Bulbasaur' })
db.insert({ id: 3, name: 'Caterpie' })

// Find an element
const user = db.query({
  type: 'object',
  properties: {
    id: {
      type: 'string',
      const: 2
    }
  }
}) // --> { id: 2, name: 'Bulbasaur' }

// Update an element
const user = db.update({
  type: 'object',
  properties: {
    id: {
      type: 'string',
      const: 2
    }
  }
}, [
  { op: 'replace', path: '/name', value: 'Beedrill' },
  { op: 'add', path: '/type', value: [ 'bug', 'poison' ] }
]) // --> { id: 2, name: 'Beedrill', type: [ 'bug', 'poison' ] }

// Delete an element
const user = db.delete({
  type: 'object',
  properties: {
    id: {
      type: 'string',
      const: 3
    }
  }
})
```

# Documentation

## IceCave instance

**Kind**: global class
**Summary**: Create an instance of IceCave
**Access**: public

* [IceCave](#IceCave)
    * [new IceCave(config)](#new_IceCave_new)
    * [.dump()](#IceCave+dump) ⇒ <code>Promise.&lt;String&gt;</code>
    * [.insert(element)](#IceCave+insert)
    * [.delete(query)](#IceCave+delete)
    * [.filter(query)](#IceCave+filter) ⇒ <code>Array</code>
    * [.update(query, patch)](#IceCave+update)
    * [.shutdown()](#IceCave+shutdown) ⇒ <code>Promise</code>

<a name="new_IceCave_new"></a>

### new IceCave(config)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| config | <code>Object</code> |  | Configuration object |
| [config.directory] | <code>String</code> | <code>./icecave-data</code> | The directory where icecave data is stored |
| [config.name] | <code>String</code> | <code>icecave</code> | The name of this instance |
| [config.memoryOnly] | <code>Boolean</code> | <code>false</code> | Set to true to stop the db from being written to the filesystem |

**Example**
```js
const db = new IceCave()
```
<a name="IceCave+dump"></a>

### iceCave.dump() ⇒ <code>Promise.&lt;String&gt;</code>
Dumps the store to a JSON file and shuts down the DB

**Kind**: instance method of [<code>IceCave</code>](#IceCave)
**Summary**: Writes the in memory storage to a JSON file.
**Returns**: <code>Promise.&lt;String&gt;</code> - The path of the stored JSON file
**Access**: public
**Example**
```js
const db = new IceCave()

await db.dump()
```
<a name="IceCave+insert"></a>

### iceCave.insert(element)
Insert an element into the database

**Kind**: instance method of [<code>IceCave</code>](#IceCave)
**Access**: public

| Param | Type | Description |
| --- | --- | --- |
| element | <code>Object</code> | The element to insert |

**Example**
```js
const db = new IceCave()

db.insert({
  foo: 'bar',
  baz: 'buzz'
})
```
<a name="IceCave+delete"></a>

### iceCave.delete(query)
Delete elements in the store the match a JSON schema.

**Kind**: instance method of [<code>IceCave</code>](#IceCave)
**Access**: public

| Param | Type | Description |
| --- | --- | --- |
| query | <code>Object</code> | The JSON schema to validate against |

**Example**
```js
const db = new IceCave()

db.insert({
  foo: 'bar',
  baz: 'buzz'
})

db.delete({
  type: 'object',
  properties: {
    foo: {
      const: 'bar'
    }
  }
})
```
<a name="IceCave+filter"></a>

### iceCave.filter(query) ⇒ <code>Array</code>
Retrieve elements in the store that match a JSON schema.

**Kind**: instance method of [<code>IceCave</code>](#IceCave)
**Returns**: <code>Array</code> - An array of elements
**Access**: public

| Param | Type | Description |
| --- | --- | --- |
| query | <code>Object</code> | The JSON schema to validate against |

**Example**
```js
const db = new IceCave()

db.insert({
  foo: 'bar',
  baz: 'buzz'
})

const results = db.filter({
  type: 'object',
  properties: {
    foo: {
      const: 'bar'
    }
  }
})

console.log(results)
```
<a name="IceCave+update"></a>

### iceCave.update(query, patch)
Select elements that match a JSON schema and update them
using a JSON patch object.

**Kind**: instance method of [<code>IceCave</code>](#IceCave)
**Summary**: Update one or more elements
**Access**: public
**See**: https://tools.ietf.org/html/rfc6902

| Param | Type | Description |
| --- | --- | --- |
| query | <code>Object</code> | The JSON schema to validate against |
| patch | <code>Object</code> | An RFC 6902 JSON patch object |

**Example**
```js
const db = new IceCave()

db.insert({
  foo: 'bar',
  baz: 'buzz'
})

db.update({
  type: 'object',
  properties: {
    foo: {
      const: 'bar'
    }
  }
},
[
  { "op": "replace", "path": "/baz", "value": "boo" }
])
```
<a name="IceCave+shutdown"></a>

### iceCave.shutdown() ⇒ <code>Promise</code>
Dumps the store to a JSON file and shuts down the DB

**Kind**: instance method of [<code>IceCave</code>](#IceCave)
**Summary**: Shutdown the database
**Access**: public
**Example**
```js
const db = new IceCave()

await db.shutdown()
```
