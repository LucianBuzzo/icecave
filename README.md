# IceCave DB

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

## Methods

### Icecave.push(*element*)

Add a new element to the IceCave collection.

#### Arguments

1. **mixed** The value to add to the collection

#### Returns

**Number**: The index of the inserted value

### Icecave.remove(*index*)

Remove an element from the IceCave collection at the given index.

#### Arguments

1. **Number** The index to remove from the collection

#### Returns

Nothing

### Icecave.set(*index*, *element*)

Overwrite an element from the IceCave collection at the given index.

#### Arguments

1. **Number** The index to insert the element at
2. **mixes** The element to insert into the collection

#### Returns

Nothing

### Icecave.get(*index*)

Retrieve an element from the IceCave collection at the given index.

#### Arguments

1. **Number** The index to retrieve the element from 

#### Returns

The element at the given index.

### Icecave.find(*predicate*)

Iterates over elements of the IceCave collection, returning the first element *predicate* 
returns truthy for. The predicate is invoked with the element currently being
evaluated.

#### Arguments

1. **Function** The function invoked per iteration 

#### Returns

The matched element, else undefined.

### Icecave.filter(*predicate*)

Iterates over elements of the IceCave collection, returning an array of all 
elements predicate returns truthy for. The predicate is invoked with the element 
currently being evaluated.

#### Arguments

1. **Function** The function invoked per iteration 

#### Returns

The new filtered array.

### Icecave.first()

Gets the first element in the IceCave collection.

#### Arguments

None

#### Returns

Returns the first element in the IceCave collection.

### Icecave.last()

Gets the last element in the IceCave collection.

#### Arguments

None

#### Returns

Returns the last element in the IceCave collection.

