# IceCave DB

[![Build Status](https://travis-ci.org/LucianBuzzo/IceCave-DB.svg?branch=master)](https://travis-ci.org/LucianBuzzo/IceCave-DB)
[![npm version](https://badge.fury.io/js/icecave.svg)](http://badge.fury.io/js/icecave)
[![Dependency Status](https://img.shields.io/david/LucianBuzzo/IceCave-DB.svg)](https://david-dm.org/LucianBuzzo/IceCave-DB)

A super lightweight flat file storage system for nodejs.

IceCave is designed for use in applications where relatively small amounts of
data need to be permanently stored and a dedicated external database service is
impractical or overkill.
IceCave stores data in-memory and periodically dumps it's contents to
a JSON file. On startup it will read this file location and load any data found
there.

IceCave stores data in an array-like collection and its API methods reflect that.
IceCave intentionally offers a very limited set of methods and leaves it up to you,
the developer, to build integrations that suit your application.

# Usage

Below is a quick example how to use IceCave DB:

```js
const IceCave = require('icecave');

// Create a new storage instance that will be written to the directory './data-directory'
const storage = require('icecave').create(__dirname + '/data-directory');

// Add items to the database
storage.push({ id: 1, name: 'Adam' });
storage.push({ id: 2, name: 'Ben' });
storage.push({ id: 3, name: 'Chris' });

// Find an item in the database
const user = storage.find(item => item.id === 2); // --> { id: 2, name: 'Ben' }
```

# Documentation

## Module interface

<a name="module_icecave.create"></a>

### icecave.create(dir, [name]) ⇒ [<code>IceCave</code>](#IceCave)
Creates and returns a new IceCave instance. The instance will write
data to the directory specified by the `dir` parameter. You can optionally
specify a name for the instance, If a name is not provided then the name will
default to 'icecave'. The name is used to generate the storage flat file and
should be unique. For example if your IceCave DB has the name 'friends' then
it will write to a file named 'friends.json'.

**Kind**: static method of [<code>icecave</code>](#module_icecave)  
**Summary**: Creates a new IceCave instance  
**Returns**: [<code>IceCave</code>](#IceCave) - - An instance of an IceCave DB  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| dir | <code>String</code> |  | Path to the directory where the DB data will be written. |
| [name] | <code>String</code> | <code>&#x27;icecave&#x27;</code> | (Optional) The name of the DB, defaults to "icecave". |

**Example**  
```js
const IceCave = require('icecave');

const storage = require('icecave').create(__dirname + '/data-directory');

storage.push({ id: 1, name: 'Adam' });
```

<a name="IceCave"></a>

## IceCave instance

**Kind**: global class  
**Summary**: Create an instance of IceCave  
**Access**: public  

* [IceCave](#IceCave)
    * [new IceCave(dir, name)](#new_IceCave_new)
    * [.push(val)](#IceCave.push) ⇒ <code>Number</code>
    * [.remove(index)](#IceCave.remove) ⇒ <code>void</code>
    * [.set(index, val)](#IceCave.set) ⇒ <code>Void</code>
    * [.get(index)](#IceCave.get) ⇒ <code>\*</code>
    * [.find(fn)](#IceCave.find) ⇒ <code>\*</code>
    * [.findIndex(fn)](#IceCave.findIndex) ⇒ <code>Number</code>
    * [.filter(fn)](#IceCave.filter) ⇒ <code>Array</code>
    * [.first()](#IceCave.first) ⇒ <code>\*</code>
    * [.last()](#IceCave.last) ⇒ <code>\*</code>

<a name="new_IceCave_new"></a>

### new IceCave(dir, name)
IceCave stores data in memory in an Immutable JS "list" structure
(similar to an array). This data is then periodically written to a flat file as JSON.
When a DB is created it will try to load the a JSON file from the location
specified by the 'dir' and 'name' parameters, otherwise it will start a new
"list" structure.
This class can only be Instantiated through the 'create' method exposed by
this module.

**Returns**: [<code>IceCave</code>](#IceCave) - - Instance of IceCave  

| Param | Type | Description |
| --- | --- | --- |
| dir | <code>String</code> | Path to the directory where the DB data will be written. |
| name | <code>String</code> | The name of the DB |

**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');
```
<a name="IceCave.push"></a>

### IceCave.push(val) ⇒ <code>Number</code>
**Kind**: static method of [<code>IceCave</code>](#IceCave)  
**Summary**: Adds a value as the last item in the DB  
**Returns**: <code>Number</code> - - The index of the new value  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| val | <code>\*</code> | The value to store. |

**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');

let index = storage.push({ foo: 'bar' });
```
<a name="IceCave.remove"></a>

### IceCave.remove(index) ⇒ <code>void</code>
**Kind**: static method of [<code>IceCave</code>](#IceCave)  
**Summary**: Deletes the value at 'index'.  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| index | <code>Number</code> | The index of the item to delete |

**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');

let index = storage.push({ foo: 'bar' });

// ...

storage.remove(index);
```
<a name="IceCave.set"></a>

### IceCave.set(index, val) ⇒ <code>Void</code>
**Kind**: static method of [<code>IceCave</code>](#IceCave)  
**Summary**: Sets a new value at 'index'.  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| index | <code>Number</code> | The index to set the new value at. |
| val | <code>\*</code> | The val to set |

**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');

let index = storage.push({ foo: 'bar' });

// ...

storage.set(index, { hello: 'world' });
```
<a name="IceCave.get"></a>

### IceCave.get(index) ⇒ <code>\*</code>
**Kind**: static method of [<code>IceCave</code>](#IceCave)  
**Summary**: Retrieves the value at 'index'.  
**Returns**: <code>\*</code> - - The value at the specified index  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| index | <code>Number</code> | The index that should be retrieved. |

**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');

let index = storage.push({ foo: 'bar' });

// ...

storage.get(index); // --> { foo: 'bar' }
```
<a name="IceCave.find"></a>

### IceCave.find(fn) ⇒ <code>\*</code>
**Kind**: static method of [<code>IceCave</code>](#IceCave)  
**Summary**: Returns the first value for which the predicate 'fn' returns true.  
**Returns**: <code>\*</code> - - The first value that matches the predicate.  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | fn(item): Predicate function that is provided with the current item and should return a boolean value |

**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');

storage.push({ id: 1, name: 'Adam' });
storage.push({ id: 2, name: 'Ben' });
storage.push({ id: 3, name: 'Chris' });

// ...

const user = storage.find(item => item.id === 2); // --> { id: 2, name: 'Ben' }
```
<a name="IceCave.findIndex"></a>

### IceCave.findIndex(fn) ⇒ <code>Number</code>
**Kind**: static method of [<code>IceCave</code>](#IceCave)  
**Summary**: Returns the first index where a value satisfies the provided predicate 'fn'  
**Returns**: <code>Number</code> - - The index of the first value that matches the predicate. If an item is not found -1 is returned  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | fn(item): Predicate function that is provided with the current item and should return a boolean value |

**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');

storage.push({ id: 1, name: 'Adam' });
storage.push({ id: 2, name: 'Ben' });
storage.push({ id: 3, name: 'Chris' });

// ...

const user = storage.findIndex(item => item.id === 2); // --> 1
```
<a name="IceCave.filter"></a>

### IceCave.filter(fn) ⇒ <code>Array</code>
**Kind**: static method of [<code>IceCave</code>](#IceCave)  
**Summary**: Returns all values for which the predicate 'fn' returns true.  
**Returns**: <code>Array</code> - - The values that match the predicate.  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | fn(item): Predicate function that is provided with the current item and should return a boolean value |

**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');

storage.push({ id: 1, name: 'Adam' });
storage.push({ id: 2, name: 'Ben' });
storage.push({ id: 3, name: 'Chris' });

// ...

const users = storage.filter(item => item.id > 1); // --> [{ id: 2, name: 'Ben' }, { id: 3, name: 'Chris' }]
```
<a name="IceCave.first"></a>

### IceCave.first() ⇒ <code>\*</code>
**Kind**: static method of [<code>IceCave</code>](#IceCave)  
**Summary**: Returns the first value in storage  
**Returns**: <code>\*</code> - - The first value in storage  
**Access**: public  
**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');

storage.push({ id: 1, name: 'Adam' });
storage.push({ id: 2, name: 'Ben' });
storage.push({ id: 3, name: 'Chris' });

// ...

const users = storage.first(); // --> { id: 1, name: 'Adam' }
```
<a name="IceCave.last"></a>

### IceCave.last() ⇒ <code>\*</code>
**Kind**: static method of [<code>IceCave</code>](#IceCave)  
**Summary**: Returns the last value in storage  
**Returns**: <code>\*</code> - - The last value in storage  
**Access**: public  
**Example**  
```js
const storage = require('icecave').create(__dirname + '/data-directory');

storage.push({ id: 1, name: 'Adam' });
storage.push({ id: 2, name: 'Ben' });
storage.push({ id: 3, name: 'Chris' });

// ...

const users = storage.last(); // --> { id: 3, name: 'Chris' }
```

