

# ![Software Plumbers](http://docs.softwareplumbers.com/common/img/SquareIdent-160.png) Typed Patch

The type-aware object patch utility.

## Tl;DR

```javascript
let patch = Patch.compare(object1, object2);

let object3 = patch.apply(object2)
```

and object3 should equal object1.

If any of the properties and sub-properties of object1 are themselves classes, and have a static method `fromJSON` somewhere in their prototype chain, then this `fromJSON` method will be applied to the result of merging properties betweem the appropriate sub-trees in order to create an object of the correct class.

Arrays are merged with an LCS diff algorithm, preserving sort order. ES6 Map objects are merged using an ordered join which
may result in a different order of elements in the resulting maps (the result will always be sorted by key).

The utility has more subtle and feature-rich ways of specifying types, and doing things like deciding the type of array elements and specifying how arrays are merged. If interested, read on.

For the latest API documentation see [The Software Plumbers Site](http://docs.softwareplumbers.com/typed-patch/master)

## Project Status

Alpha. It seems functional, and the unit tests pass. The basic API is settling down.  

## Why another diff/patch utility?

This one is aware of object types and potential polymorphism in the patch. That is to say, that the object tree that results from applying a patch to an object may contain objects of different classes to those which were in the patch object or indeed to those in the original patched object.

Many other diff/patch utilities also create rather verbose patches; the JSON pointer specification (RFC6901) is admirable but its use as a basis for a patch format is questionable. If each leaf that differs in the tree must be identified by its full path from the root (per JSONP) then in deeply nested object trees the property names nearer the root appear many times in the resulting diff. This diff creates a hierarchical diff format that is concise and reasonably easy to read.

## Type Awareness

When merging properties between the patched object and the patch, the resulting property can either be a straight object (in which case, no problem) or an instance of a class. To create an instance of the class, the patch algorithm needs to know what kind of object to create.

Encoding types in the diff format is an option which we have rejected due to the implications of allowing data transmitted over the wire to specify a class name that the data will be converted into.

This problem is closely related to the issue of re-creating object trees from JSON delivered across the wire or from document stores like Mongo. This may be why there are so many diff utilities - they are usually bound to a particular way of doing things.

By default, typed-patch therefore derives type information entirely from the object to be patched. This can be achieved most simply by putting a static method `fromJSON` in the base class of any typed property. This method is used to covert untyped properties into an instance of the required object class.

This works in many cases, but not when the patch contains properties that do not exist in the patched object. In this case, we need to implement a getAttrProps static method which takes a name argument and returns an object containing a factory method (`elementFactory`) or an object type `elementType` suitable for populating the property of that name.

## Array and Map properties

In the case of array and map properties, getAttrProps may also return the following metadata:


* `collectionElementType` the type of elements in the array
* `collectionElementFactory` a factor object for creating new array elements
* `sorted` defines if a map can be assumed to be sorted by its key (avoiding a re-sort)
* `map` determines if an array can be treated as a map. If so, the additional properties below are needed
* `key` a function that can extract a unique ID from the array element (e.g. `e=>e.id`)
* `value` a function that can extract a value from the array element (e.g. to `e=>e`) 
* `entry` a function that can construct a array element from a key/value pair (e.g. `(k,v)=>v`)
* `keyComparator` a comparator object for comparing keys, required if key values cannot be compared with >,<,===

Maps are diffed and merged by comparing a sorted lists of key values; the order of maps may not be preserved in the merge 
operation. Arrays are diffed using an LCS algorithm, unless the 'map' option is true in which case they are diffed as Maps
using the values extracted by the key and value functions.










