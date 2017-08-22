/** @module patch
 *
 */
 const utils = require('./utils');
 const ops = require('./operations');
 const Options = require('./options');

'use strict';

const logger = { 
    //trace(...args) { console.log(...args); } 
    trace() {}
};

/** Patch for objects
 *
 * Class that should allow us to compare two objects, compute a difference, send the difference over the wire, and apply a patch at the far end
 * to sync a remote object with the changes.
 *
 * At the moment, for it to work with arrays, each member of the array must have a key property which uniquely identifies it
 * and on which it can be sorted (arrays must have a stable sort order to be logically patched...).
 *
 * For 'patch' to work properly, the patched object (and child objects) should have a static 'fromJSON' method somewhere in its inheritance tree.
 * You may also implement a static 'getAttrProps(name)' object, which may return a variety of options that are applied to
 * child properties with the given name (see {@link DEFAULT_OPTIONS}).
 *
 * Won't work with cyclic data structures.
 */
class Patch {

    static _compareMaps(a,b, options) {

        if (a.length === 0 && b.length === 0) return ops.NOP;
        if (a.length === 0 || b.length === 0) return new ops.Rpl(b);

        let patch = [];

        if (!options.sorted) {
            a = Array.from(a).sort((a,b) => (a,b,options));
            b = Array.from(b).sort((a,b) => (a,b,options));
        }

        let ai = 1, bi = 1;
        let ao = a[0], bo = b[0]
        let element_options = options.getArrayElementOptions();

        do {
             let comparison = (ao,bo,options);
            logger.trace("comparing items", ao, bo, comparison);
           if (comparison < 0) {
                logger.trace('skip');
                ao = a[ai++]; 
            } else if (comparison > 0) {
                logger.trace('insert');
                patch.push(new ops.Row(bo[options.key], new ops.Ins(bo)));
                bo = b[bi++];
            } else {
                if (ao !== bo) patch.push(new ops.Row(ao[options.key], Patch.compare(ao, bo, element_options)));
                else logger.trace('skip2');
                ao = a[ai++]; 
                bo = b[bi++];
            }
        } while (ai <= a.length && bi <= b.length);
                
        while (ai <= a.length) {
            patch.push(new ops.Row(ao[options.key], ops.DEL));
            ao=a[ai++]; 
        }

        while (bi <= b.length) {
            patch.push(new ops.Row(bo[options.key], new ops.Ins(bo))); 
            bo=b[bi++]; 
        }
        
        return new ops.Map(patch);
    }

    static _compareArrays(a,b,options) {
        let result = [];

        utils.diff(a,b, 
            (add, index)    => { result.push(new ops.Row(index+1, new ops.Ins(add))); },
            (remove, index) => { result.push(new ops.Row(index, ops.DEL)); },
            (skip, index)   => { }
        );

        return new ops.Arr(result);
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
        
        return new ops.Mrg(data);    
    }


    /** Compare two object to produce a patch object.
     *
     * @param a First object for comparison
     * @param b Second object for comparison
     * @param options (optional) options to control comparison operation (see {@link DEFAULT_OPTIONS})
     */
    static compare(a,b,options) {
        options = Options.addDefaults(options);

        logger.trace('comparing', a, b);
        if (a === b)
            return ops.NOP;
        if (b === undefined) 
            return ops.DEL;
        if (a === undefined) 
            return new ops.Rpl(b);
        
        if (typeof a === 'object' && typeof b === 'object') {
            if (a.constructor === b.constructor) { // This isn't quite right, we can merge objects with a common base class
                if (a instanceof Array) {
                    if (options.map) {
                        return Patch._compareMaps(a,b,options);
                    } else  {
                        return Patch._compareArrays(a,b,options);
                    }
                } else {
                    return Patch._compareObjects(a,b,options);
                }
            } else {
                return new ops.Rpl(b);
            }
        } else {
            return new ops.Rpl(b);
        }
    }


    /** Convert over-the-wire JSON format back into typed patch object
     */
    static fromJSON(object) {
        if (object instanceof ops.Op) return object; // If already patch, return it
        if (object === undefined) return ops.NOP;
        if (object.op) {
            if (object.op === ops.Rpl.name)
                return new ops.Rpl(object.data);
            if (object.op === ops.Ins.name)
                return new ops.Ins(object.data);
            else if (object.op === ops.NOP.name)
                return ops.NOP;
            else if (object.op === ops.DEL.name)
                return ops.DEL;
            else if (object.op === ops.Mrg.name) 
                return new ops.Mrg(utils.map(object.data, Patch.fromJSON));
            else if (object.op === ops.Map.name) 
                return new ops.Map(object.data.map(row => new ops.Row(row.key, Patch.fromJSON(row.op))));
            else if (object.op === ops.Arr.name) 
                return new ops.Arr(object.data.map(row => new ops.Row(row.key, Patch.fromJSON(row.op))));
            else throw new Error('unknown diff.op ' + object.op);
        } else {
            return new ops.Rpl(object);   
        }    
    }


    /** Name of Del operationn */
    static get Del() { return ops.DEL.name; }
    /** Name of Rpl operationn */
    static get Rpl() { return ops.Rpl.name; }
    /** Name of Ins operationn */
    static get Ins() { return ops.Ins.name; }
    /** Name of Nop operationn */
    static get Nop() { return ops.NOP.name; }
    /** Name of Mrg operation */
    static get Mrg() { return ops.Mrg.name; }
    /** Name of Map operation */
    static get Map() { return ops.Map.name; }
}

/** The Patch class defines the public API of this module. */
module.exports = Patch;

