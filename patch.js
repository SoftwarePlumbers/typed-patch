'use strict';

const logger = { 
    //trace(...args) { console.log(...args); } 
    trace() {}
};

/** Utility function that applies a function to transform all the properties of an object 
 * @param object for which we will transform properties
 * @param fn {Function} function to apply property transformation
 */
function _map(object, fn) {
    let result = {};
    for (let key of Object.getOwnPropertyNames(object))
        result[key] = fn(object[key]);
    return result; 
}

/** Utility function that performs reduce operation on properties of an object
 *
 * @param object to reduce
 * @param res initial value for result 
 * @param fn reduction function
 * @returns the result of applying res = fn(res, <name>, <value>) over all properties of the object.
 */
function _reduce(object, res, fn) {
    for (let key of Object.getOwnPropertyNames(object))
        res = fn(res, key, object[key] );
    return res;
}

function _appendString(res, name, value) {
    if (res) res += ','; else res = "";
    res+=`${name}: $value`;
}

/** Utility function to compare key with object (that has a key property)
 *
 * options.key holds the name of the key property
 * options.keyComparator may hold an optional comparator for values of key
 *
 * @param akey key to compare with object
 * @param b object with a key value
 * 
 */
function _compareWith(akey, b, options) {
    let bkey = b[options.key];
    if (options.keyComparator) return options.keyComparator(akey,bkey);
    if (akey < bkey) return -1;
    if (akey > bkey) return 1;
    return 0;
}

/** Utility function to objects that have a key properties
 *
 * options.key holds the name of the key property
 * options.keyComparator may hold an optional comparator for values of key
 *
 * @param a object with a key value
 * @param b object with a key value
 * 
 */
function _compare(a,b, options) {
    if (a === b) return 0;
    return _compareWith(a[options.key],b, options)
}

/** Default options for diff 
 *
 *   | Option                   | Default | Description
     |--------------------------|---------|-------------------------- 
 *   | `elementFactory`         | `false` | Factory used to create new object instances 
 *   | `mergeInPlace`           | `false` | Patch will copy properties into existing object rather than creating a new one 
 *   | `key`                    | `'key'` | Name of unique key object that distinguishes items in array
 *   | `keyComparator`          | `false` | Comparator function (a,b) => (-1/0/1) that orders key values
 *   | `sorted`                 | `false` | Assume array already sorted by key
 *   | `arrayElement`           | `false` | Type of element used as a last resort to create new object instances
 *   | `arrayElementType`       | `false` | Type of element used to create new elements in an array
 *   | `arrayElementFactory`    | `false` | Factory used to create new elements in an array 
 */

const DEFAULT_OPTIONS = {
    elementFactory : false,
    mergeInPlace : false,
    key: 'key',
    keyComparator: false,
    sorted: false,
    elementType: false,
    arrayElementType: false,
    arrayElementFactory: false
}


/** Holds options which change the way compare and patch operations are run.
 *
 * An options object can be passed in to a compare or patch opertion in order to control
 * how the operation is performed. However, it is more common to simply pass in a few paramters
 * as a simple object which will then be automatically merged with the default options to create
 * a new Options object.
 *
 */
class Options {

    /** Build a new options object
     *
     * @param props Properties for diff/patch operations. Will be merged with default options.
     */
    constructor(props) {
        props = Object.assign(this, DEFAULT_OPTIONS, props);
    }

    /** Get a new set of options for diff/patch operations on the given property.
     *
     * @param object being patched or diffed.
     * @param name name of propery in object
     */
    getChildOptions(obj,name) {
        let options = this.defaults ? new Options(this.defaults) : Object.assign(new Options(this), { defaults: this });
        if (obj) {
            let child = obj[name];
            if (child && typeof child === 'object') {
                options.elementType = child.constructor;
                if (child.constructor.fromObject) {
                    options.elementFactory = child.constructor.fromObject;  
                } 
            }
            let attr_props = {};
            if (obj.constructor && obj.constructor.getAttrProps) {
                let attr_props = obj.constructor.getAttrProps(name);
                if (attr_props) Object.assign(options, attr_props);
            } 
        }
        return options;
    }
    
    /** Get a new set of options for diff/patch operations on an array element.
     *
     */
    getArrayElementOptions() {
        let options = this.defaults ? new Options(this.defaults) : Object.assign(new Options(this), { defaults: this });
        options.elementType = this.arrayElementType;
        options.elementFactory = this.arrayElementFactory;
        return options;     
    }

    /** Create a new Options object, merging the supplied properties with the defaults.
     * @param properties to merge with defaults.
     */
    static addDefaults(props) {
        if (props instanceof Options) return props;
        return new Options(props);
    }
}

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
     */
    static createElement(props, options) {
        logger.trace('ElementFactory.createElement', props, options);
        if (options.elementFactory) return options.elementFactory(props);
        if (options.elementType) {
            let e = new options.elementType();
            Object.assign(e, props);
            return e;
        } else {
            return props;
        }
    }
 }

/** Base class for patch operations.
 *
 */
class Op {
    toJSON() {
        return { op: this.name };
    } 

    toString() {
        return this.name;
    }
}

/** Global Nop object - represents an empty patch that does nothing 
 */
const Nop = Object.assign(new Op(), {
    name: "Nop",

    /** patch operation
     * passes through object unchanged
     * @param object to patch
     */
    patch(object) {
        return object;
    }
});

/** Global Del object - represents a patch that deletes a property
 */
const Del = Object.assign(new Op(), {
    name: "Del",

    /** patch operation
     * @returns undefined
     */
    patch(object) {
        return undefined;
    }
});

/** Replace operation - represents a patch that replaces a property
 */
class Rpl extends Op {
    get name() { return Rpl.name; }

    /** Patch operation - creates a new object from the givien properties.
     *
     * @param properties of object to create
     * @param options controls how object is created {@link DEFAULT_OPTIONS}
     */
    patch(object, options) {
        options = Options.addDefaults(options);
        return ElementFactory.createElement(this.data, options);
    }
    constructor(data) { super(); this.data = data; }
    toJSON() { return this.data; }
    toString() { return this.name + " " + JSON.stringify(this.data); }
}

/** Insert operation - represents a patch that inserts an element into an array
 */
class Ins extends Rpl {
}

/** Merge operation for objects - represents a patch that merges two objects to create a third.
 */
class Mrg extends Op {

    get name() { return Mrg.name; }
 
    patch(object, options) {
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

    constructor(data) { super(); this.data = data; }
    toJSON() { return { op: this.name, data: _map(this.data, prop => prop.toJSON() ) } }
    toString() { return `${this.name} { ${_reduce("",_map(this.data, prop => toString()), _appendString)} }` }
}

class Row {
    constructor(key, operation) {
        this.key = key; this.op = operation;
    }

    toJSON() {
        return { key: this.key, op: this.op.toJSON() };
    }

    toString() {
        return `{ ${this.key}, ${this.op} }`;
    }
}

class Arr extends Op {

    get name() { return Arr.name; }

    patch(array, options) {
        options = Options.addDefaults(options);
        let result = ElementFactory.createElement([], options);

        if (!options.sorted)
            array = Array.from(array).sort((a,b) => _compare(a, b, options));

        let i = 0;
        let item = array[i++];
        let element_options = options.getArrayElementOptions(array);

        for (let row of this.data) {
            while (i <= array.length && _compareWith(row.key, item, options) > 0) {
                result.push(item);
                item = array[i++];
            }
            logger.trace('item:', item, 'row:', row);
            if (row.op instanceof Ins)
                result.push(ElementFactory.createElement(row.op.data, element_options));
            else {
                logger.trace('patching', item, row.op);
                let patch_item = row.op.patch(item, element_options);
                if (patch_item != undefined) result.push(patch_item);
                item = array[i++];
            }
        }

        while (i <= array.length) { result.push(item); item = array[i++]; }
        return result;
    }

    constructor(operations) {
        super();
        this.data = operations;
    }

    toJSON() {
        return { op: this.name, data: this.data.map( row => row.toJSON() ) };
    }

    toString() {
        return `[ ${this.data.join(',')}]`;
    }
}
    

/** Patch for objects
 *
 * Class that should allow us to compare two objects, compute a difference, send the difference over the wire, and apply a patch at the far end
 * to sync a remote object with the changes.
 *
 * At the moment, for it to work with arrays, each member of the array must have an explicit 'uid' on which it can be sorted (arrays must have
 * a stable sort order to be logically patched...).
 *
 * For 'patch' to work properly, the patched object (and child objects) should have a static 'fromObject' method somewhere in its inheritance tree.
 * You may also implement a static 'getPropertType(name)' object, which may return a constructor for values of the named property. For array 
 * properties, the named constructor will be used for array elements.
 */
class Patch {

    static _compareArrays(a,b, options) {

        if (a.length === 0 && b.length === 0) return Nop;
        if (a.length === 0 || b.length === 0) return new Rpl(b);

        let patch = [];

        if (!options.sorted) {
            a = Array.from(a).sort((a,b) => _compare(a,b,options));
            b = Array.from(b).sort((a,b) => _compare(a,b,options));
        }

        let ai = 1, bi = 1;
        let ao = a[0], bo = b[0]
        let element_options = options.getArrayElementOptions();

        do {
             let comparison = _compare(ao,bo,options);
            logger.trace("comparing items", ao, bo, comparison);
           if (comparison < 0) {
                logger.trace('skip');
                ao = a[ai++]; 
            } else if (comparison > 0) {
                logger.trace('insert');
                patch.push(new Row(bo[options.key], new Ins(bo)));
                bo = b[bi++];
            } else {
                if (ao !== bo) patch.push(new Row(ao[options.key], Patch.compare(ao, bo, element_options)));
                else logger.trace('skip');
                ao = a[ai++]; 
                bo = b[bi++];
            }
        } while (ai <= a.length && bi <= b.length);
                
        while (ai <= a.length) {
            patch.push(new Row(ao[options.key], Del));
            ao=a[ai++]; 
        }

        while (bi <= b.length) {
            patch.push(new Row(bo[options.key], new Rpl(bo))); 
            bo=b[bi++]; 
        }
        
        return new Arr(patch);
    }

    static _compareObjects(a,b,options) {

        let data = {};
        let akeys = Object.getOwnPropertyNames(a);
        let bkeys = Object.getOwnPropertyNames(b);
        
        for (let akey of akeys) {
            if (a[akey] !== b[akey]) data[akey] = Patch.compare(a[akey], b[akey], options.getChildOptions(a,akey));
        } 
        for (let bkey of bkeys) 
            if (a[bkey] === undefined) data[bkey] = Patch.compare(undefined, b[bkey], options.getChildOptions(b,bkey));
        
        return new Mrg(data);    
    }


    static compare(a,b,options) {
        options = Options.addDefaults(options);

        logger.trace('comparing', a, b);
        if (a === b)
            return Nop;
        if (b === undefined) 
            return Del;
        if (a === undefined) 
            return new Rpl(b);
        
        if (typeof a === 'object' && typeof b === 'object') {
            if (a.constructor === b.constructor) {
                if (a instanceof Array) {
                    return Patch._compareArrays(a,b,options);
                } else {
                    return Patch._compareObjects(a,b,options);
                }
            } else {
                return new Rpl(b);
            }
        } else {
            return new Rpl(b);
        }
    }


    static fromObject(object) {
        if (object instanceof Op) return object; // If already patch, return it
        if (object === undefined) return Nop;
        if (object.op) {
            if (object.op === Rpl.name)
                return new Rpl(object.data);
            else if (object.op === Nop.name)
                return Nop;
            else if (object.op === Del.name)
                return Del;
            else if (object.op === Mrg.name) 
                return new Mrg(_map(object.data, Patch.fromObject));
            else if (object.op === Arr.name) 
                return new Arr(object.data.map(row => new Row(row.key, Patch.fromObject(row.op))));
            else throw new Error('unknown diff.op', object.op);
        } else {
            return new Rpl(object);   
        }    
    }


    static get Del() { return Del.name; }
    static get Rpl() { return Rpl.name; }
    static get Nop() { return Nop.name; }
    static get Mrg() { return Mrg.name; }
    static get Arr() { return Arr.name; }
}

module.exports = Patch;

