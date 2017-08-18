'use strict';

const logger = { 
    //trace(...args) { console.log(...args); } 
    trace() {}
};

function _map(object, fn) {
    let result = {};
    for (let key of Object.getOwnPropertyNames(object))
        result[key] = fn(object[key]);
    return result; 
}

function _compareWith(akey, b, options) {
    let bkey = b[options.key];
    if (options.keyComparator) return options.keyComparator(akey,bkey);
    if (akey < bkey) return -1;
    if (akey > bkey) return 1;
    return 0;
}

function _compare(a,b, options) {
    if (a === b) return 0;
    return _compareWith(a[options.key],b, options)
}





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

class Options {

    constructor(props) {
        props = Object.assign(this, DEFAULT_OPTIONS, props);
    }

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

    getArrayElementOptions(obj) {
        let options = this.defaults ? new Options(this.defaults) : Object.assign(new Options(this), { defaults: this });
        options.elementType = this.arrayElementType;
        options.elementFactory = this.arrayElementFactory;
        return options;     
    }

    static addDefaults(props) {
        if (props instanceof Options) return props;
        return new Options(props);
    }
}

class ElementFactory {
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

// Object operations

class Op {
    toObject() {
        return { op: this.name };
    } 

    toString() {
        return JSON.stringify(this.toObject());
    }
}

const Nop = Object.assign(new Op(), {
    name: "Nop",
    patch(object) {
        return object;
    }
});

const Del = Object.assign(new Op(), {
    name: "Del",
    patch(object) {
        return undefined;
    }
});

class Rpl extends Op {
    get name() { return Rpl.name; }
    patch(object, options) {
        options = Options.addDefaults(options);
        return ElementFactory.createElement(this.data, options);
    }
    constructor(data) { super(); this.data = data; }
    toObject() { return this.data; }
}

class Ins extends Rpl {
}

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
    toObject() { return { op: this.name, data: _map(this.data, prop => prop.toObject() ) } }
}

class Row {
    constructor(key, operation) {
        this.key = key; this.op = operation;
    }

    toObject() {
        return { key: this.key, op: this.op.toObject() };
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

    toObject() {
        return { op: this.name, data: this.data.map( row => row.toObject() ) };
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

