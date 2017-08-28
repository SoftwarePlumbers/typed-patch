/** @module operations
 *
 */
 'use strict';

const utils = require('./utils');
const Options = require('./options');

const debug = require('debug')('typed-patch~operations');

/** Utility for creating patched data elements, controlled by options object.
 */
class ElementFactory {

    /** Create an merged object of the correct type.
     *
     * If options.elementFactory exists, use that (i.e. call options.elementFactory(props))
     * If options.elementType exists, use that as a no-arg constructor, then assign props 
     * Otherwise, return props.
     * 
     * @param props Merged properties
     * @param options {Options} controls how new merged object is created from merged properties
     * @param type_hint for when result type info needs to be inferred from input objects (i.e. a dirty hack)
     */
    static createElement(props, options, type_hint) {
        debug('ElementFactory.createElement', props, options);
        if (options.elementFactory) return options.elementFactory(props);
        if (options.elementType) {
            let et = options.elementType;
            if (et.fromJSON) return et.fromJSON(props); // use a fromJSON if we have one
            if (et.length > 0) return new et(props); // if constructor has arguments, assume it takes props
            // Fallback to creating an empty object and using object.assign to assign properties
            let e = new et();
            Object.assign(e, props);
            return e;
        } else {
            if (type_hint) {
                debug('type hint', type_hint, props);
                if (type_hint === Array)  {
                    return Array.from(props);
                }
                else
                    return new type_hint(props);

            } else {
                return props;
            }
        }
    }
 }


/** Base class for patch operations.
 *
 * Patch operations should support the following operations:
 *
 * * patch(to_patch, options) recursively apply patch to change to_patch
 * * toJSON() convert a patch into JSON for over-the-wire operations
 * * toString() convert a patch into a succincy human-readable string format
 *
 * Patch operations should also have a read-only property 'name' which represents the name of the operation.
 */
class Op {

    /** Convert to JSON format
     *
     * JSON format looks like `{ op: <operation name> data: <data> }`. As a special case, `Rpl` operations
     * (which simply replace existing data) are elided in JSON format (so the above example would just read
     * `<data>`).
     *
     * The patch operation as an untyped JSON object tree.
     */
    toJSON() {
        return { op: this.name };
    } 

    /** Convert to String format
     *
     * String format looks like `<operation name> { <data> }`
     */
    toString() {
        return this.name;
    }

    /** Defauly implementation of name property returns the name of the constructor 
     */
    get name() { 
        return this.constructor.name; 
    }
}

/** Global Nop object - represents an empty patch that does nothing 
 */
const NOP = new class Nop extends Op {

    /** patch operation
     * passes through object unchanged
     * @param object to patch
     */
    patch(object) {
        return object;
    }
};

/** Global Del object - represents a patch that deletes a property
 */
const DEL = new class Del extends Op {
    /** patch operation
     * @returns undefined
     */
    patch(object) {
        return undefined;
    }
};

/** Replace operation - represents a patch that replaces a property or row in an array
 */
class Rpl extends Op {


    /** Patch operation - creates a new object from the givien properties.
     *
     * @param properties of object to create
     * @param options controls how object is created {@link DEFAULT_OPTIONS}
     */
    patch(object, options) {
        debug('Rpl', object, options);
        options = Options.addDefaults(options);
        return ElementFactory.createElement(this.data, options);
    }

    /** Constructor
     *
     * @param data Data to replace property value
     */
    constructor(data) { super(); this.data = data; }

    /** Convert to JSON representation.
     *
     * The JSON representation of a Replace operation is the JSON representation of the data value passed in the constructor.
     */
    toJSON() { return this.data; }

    /** Convert to String representation
     *
     * The String representation of a Replace operation looks like `Rpl <data>` 
     */
    toString() { return `${this.name} ${utils.print(this.data)}`; }
}

/** Insert operation - represents a patch that inserts an element into an array
 */
class Ins extends Rpl {

    /** Convert to JSON representation.
     *
     * The JSON representation of an Insert operation looks like `{ op: 'Ins' data: '<data>' }`
     */
    toJSON() { return { op: this.name, data: this.data}; }

   /** Convert to String representation
     *
     * The String representation of a Replace operation looks like `inserts` <data>` 
     */
    toString() { return `${this.name} ${utils.print(this.data)}`; }    
}

/** Merge operation for objects - represents a patch that merges two objects to create a third.
 */
class Mrg extends Op {

    /** Recursively merge an object with the patch data.
     *
     * Properties of the data object passed into the constructor will be merged with the properties
     * of the object supplied as an argument to this function.
     *
     * @param object Object to be merged
     * @param options Options controlling how merge will occur. See {@link  DEFAULT_OPTIONS}.
     */
    patch(object, options) {
        debug('patch', object, options);
        options = Options.addDefaults(options);
        let props = options.mergeInPlace ? object : Object.assign({}, object);
        for (let name of Object.getOwnPropertyNames(this.data)) {
            let prop = this.data[name].patch(props[name], options.getChildOptions(object, name));
            if (prop === undefined)
                delete props[name];
            else 
                props[name] = prop; 
        }

        return ElementFactory.createElement(props, options);
    }

    /** Constructor
     *
     * @param data to merge with target object. Each property of `data` will generally be a patch operation which
     * affects the named property of the object targeted by patch().
     */
    constructor(data) { super(); this.data = data; }


    toJSON() { return { op: this.name, data: utils.map(this.data, prop => prop.toJSON() ) } }
    toString() { return `${this.name} { ${utils.reduce(utils.map(this.data, prop => prop.toString()), "", utils.appendString)} }` }
}

/** Merge operation for Maps (Map == iterable with a unique key)
 *
 *
 */
class Map extends Op {

    /** Merge map data with data from the patch.
    *
    * @param map to merge with patch data.
    * @param options options affecting how merge is performed. See {@link DEFAULT_OPTIONS}
    */
    patch(map, options) {
        debug("Map.patch", map, options);
        options = Options.addDefaults(options);
        let result = [];

        let type_hint = map.constructor; // So we can return an array or map as appropriate

        if (!options.sorted) {
            debug("sorting")
            map = Array.from(map).sort((a,b) => utils.compare(a, b, options));
        }


        let element_options = options.getArrayElementOptions(map);
        let i = 0;

        let [key,op] = this.data[i++] || [];
        for (let item of map) {
            debug('loop', i, item, key, op);

            let comparison = key ? utils.compareWith(key,item,options) : 1;
            debug('c', comparison);

            while (comparison < 0) {
                debug('ins',key,op);
                let value = ElementFactory.createElement(op.data, element_options);
                result.push(options.entry(key, value));
                [key,op] = this.data[i++] || [undefined,undefined];
                comparison = key ? utils.compareWith(key,item,options) : 1;
            }

            if (comparison === 0) {
                debug("merge", element_options);
                let value = op.patch(options.value(item), element_options);
                debug("merged", value);
                if (value) result.push(options.entry(key, value));                
                [key,op] = this.data[i++] || [];
            } else {
                debug("copy");
                result.push(item);
            }

        }

        while (i <= this.data.length) {
            let value = ElementFactory.createElement(op.data, element_options);
            result.push(options.entry(key, value));
            [key,op] = this.data[i++] || [];
        }

        return ElementFactory.createElement(result, options, type_hint);
    }

    /** Create an array merge operation 
     *
     * @param operations {Array} An array of row merge operations, must be sorted by a suitable key
     */
    constructor(operations) {
        super();
        this.data = operations;
    }

    /** Convert to JSON representation.
     *
     * The JSON representation of an Map operation looks like `{ op: 'Map' data: [ <rows> ] }`
     */
    toJSON() {
        return { op: this.name, data: this.data.map( ([key,op]) => [key, op.toJSON()] ) };
    }

    /** Convert to String representation.
    *
    * The String representation of an Map operation looks like `Map [ <rows> ]`
    */
   toString() {
        return `Map [ ${this.data.map(utils.mapEntryToString).join(',')} ]`;
    }
}

/** Merge operation for arrays.
 *
 *
 */
class Arr extends Op {

    /** Merge array data with data from the patch.
    *
    * @param array {Array} to merge with patch data.
    * @param options options affecting how merge is performed. See {@link DEFAULT_OPTIONS}
    */
    patch(array, options) {
        options = Options.addDefaults(options);
        let result = ElementFactory.createElement([], options);

        let i = 0;
        let element_options = options.getArrayElementOptions(array);

        for (let [key,op] of this.data) {

            while (i < key) result.push(array[i++]);

            if (op instanceof Ins) {
                result.push(ElementFactory.createElement(op.data, element_options));
            } else if (op instanceof Mrg) {
                // This shouldn't occur, for now, as identity and equality are same thing.
                debug('patching', op);
                let patch_item = op.patch(array[i++], element_options);
                if (patch_item != undefined) result.push(patch_item);
            } else if (op === DEL) {
                i++;
            }
        }

        while (i < array.length) result.push(array[i++]);
        return result;
    }

    /** Create an array merge operation 
     *
     * @param operations {Array} An array of row merge operations, must be sorted by a suitable key
     */
    constructor(operations) {
        super();
        this.data = operations;
    }

    /** Convert to JSON representation.
     *
     * The JSON representation of an Map operation looks like `{ op: 'Map' data: [ <rows> ] }`
     */
    toJSON() {
        return { op: this.name, data: this.data.map( ([k,v]) => [k,v.toJSON()] ) };
    }

    /** Convert to String representation.
    *
    * The String representation of an Map operation looks like `Map [ <rows> ]`
    */
   toString() {
        return `Arr [ ${this.data.map(utils.mapEntryToString).join(',')} ]`;
    }
}

module.exports = { NOP, DEL, Ins, Rpl, Mrg, Map, Arr, Op };
