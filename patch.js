'use strict';



function defaultElementFactory(obj) {
    if (obj &&  obj.constructor && obj.constructor.fromObject)
        return obj.constructor.fromObject;
    else 
        return props => props;
}

function _map(object, fn) {
    result = {};
    for (key of Object.getOwnPropertyNames(object))
        result[key] = fn(object[key]); 
}

// Object operations

class Op {
    toObject() {
        return { op: this.name, data: _map(this, Patch.fromObject) };
    } 
}

const Nop = Object.assign(new Op(), {
    name: "Nop",
    patch(object) {
        return object;
    }
});

const Del = Object.assign(new Op(), {
    name: "del",
    patch(object) {
        return undefined;
    }
});

class Rpl extends Op {
    get name() { return Rpl.name; }
    patch(object, element_factory = defaultElementFactory(object)) {
        return element_factory(this.data);
    }
    constructor(data) { super(); this.data = data; }
}

class Mrg extends Op {

    get name() { return Mrg.name; }
    static _getElementFactory(object, name) {   
        //console.log('gef', object, name);
        if (object.constructor.getPropertyType) {
            let type =  object.constructor.getPropertyType(name);
            if (type) return type.fromObject;
        }
        return undefined;
    }

    patch(object, element_factory = defaultElementFactory(object)) {
        let props = Object.assign({}, object);
        for (let name of Object.getOwnPropertyNames(this.data)) {
            let prop = this.data[name].patch(props[name], Mrg._getElementFactory(object, name));
            if (prop === undefined)
                delete props[name];
            else 
                props[name] = prop; 
        }

        return element_factory(props);
    }
    constructor(data) { super(); this.data = data; }
}

class ArrayOperation {
    constructor(key, operation) {
        this.key = key; this.operation = operation;
    }
}

class Arr extends Op {

    get name() { return Arr.name; }

    static compareUid(a,b) {
        if (a === b) return 0;
        if (a.uid < b.uid) return -1;
        if (a.uid > b.uid) return 1;
        return 0;
    }

    patch(array, element_factory = defaultElementFactory(object)) {

        let result = [];
        array = Array.from(array).sort(Arr.compareUid);

        let i = 0;
        let item = object[i++];

        for (let update of this.data) {
            let update_uid = update.key;
            while (i <= object.length && item.uid < update_uid) {
                result.push(element_factory(item));
                item = object[i++];
            }
            let patch_item = update.operation.patch(item, element_factory)
            if (patch_item != undefined) result.push(patch_item);
        }

        while (i <= object.length) { result.push(item); item = object[i++]; }
        return result;
    }

    constructor(operations) {
        super();
        this.data = operations;
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

    static _compareArrays(a,b) {

        if (a.length === 0 && b.length === 0) return Nop;
        if (a.length === 0 || b.length === 0) return new Rpl(b);

        let patch = [];
        a = Array.from(a).sort(Patch.compareUid);
        b = Array.from(b).sort(Patch.compareUid);
        let ai = 1, bi = 1;
        let ao = a[0], bo = b[0]
        do {
            if (ao.uid < bo.uid) {
                ao = a[ai++]; 
            } else if (ao.uid > bo.uid) {
                patch.push(new ArrayOperation(bo.uid, new Rpl(bo)));
                bo = b[bi++];
            } else {
                if (ao !== bo) patch.push(new ArrayOperation(ao.uid, Patch.compare(ao, bo)));
                ao = a[ai++]; 
                bo = b[bi++];
            }
        } while (ai <= a.length && bi <= b.length);
                
        while (ai <= a.length) {
            patch.push(new ArrayOperation(ao.uid, Del));
            ao=a[ai++]; 
        }

        while (bi <= b.length) {
            patch.push(new ArrayOperation(bo.uid, new Rpl(bo))); 
            bo=b[bi++]; 
        }
        
        return new Arr(patch);
    }

    static _compareObjects(a,b) {

        let data = {};
        let akeys = Object.getOwnPropertyNames(a);
        let bkeys = Object.getOwnPropertyNames(b);
        
        for (let akey of akeys) {
            if (a[akey] !== b[akey]) data[akey] = Patch.compare(a[akey], b[akey]);
        } 
        for (let bkey of bkeys) 
            if (a[bkey] === undefined) data[bkey] = Patch.compare(undefined, b[bkey]);
        
        return new Mrg(data);    
    }


    static compare(a,b) {

        if (a === b)
            return Nop;
        if (b === undefined) 
            return Del;
        if (a === undefined) 
            return new Rpl(b);
        
        if (typeof a === 'object' && typeof b === 'object') {
            if (a.constructor === b.constructor) {
                if (a instanceof Array) {
                    return Patch._compareArrays(a,b);
                } else {
                    return Patch._compareObjects(a,b);
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
                return new Arr(object.data.map(Patch.fromObject));
            else throw new Error('unknown diff.op', item.op);
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

