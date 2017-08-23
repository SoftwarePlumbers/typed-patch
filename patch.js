/** @module patch
 *
 */
 const utils = require('./utils');
 const ops = require('./operations');
 const Options = require('./options');
 const debug = require('debug')('typed-patch~patch');

 'use strict';


/** Patch for objects
 *
 * Functions that should allow us to compare two objects, compute a difference, send the difference over the wire, and apply a patch at the far end
 * to sync a remote object with the changes.
 *
 * For 'patch' to work properly, the patched object (and child objects) should have a static 'fromJSON' method somewhere in its inheritance tree.
 * You may also implement a static 'getAttrProps(name)' object, which may return a variety of options that are applied to
 * child properties with the given name (see {@link DEFAULT_OPTIONS}).
 *
 * Won't work with cyclic data structures.
 */
 function _compareMaps(a,b, options) {

    if (a.length === 0 && b.length === 0) return ops.NOP;
    if (a.length === 0 || b.length === 0) return new ops.Rpl(b);

    let patch = [];

    if (!options.sorted) {
        a = Array.from(a).sort((a,b) => utils.compare(a,b,options));
        b = Array.from(b).sort((a,b) => utils.compare(a,b,options));
    }

    let ai = 1, bi = 1;
    let ao = a[0], bo = b[0]
    let element_options = options.getArrayElementOptions();

    do {
        let comparison = utils.compare(ao,bo,options);
        debug("comparing items", ao, bo, comparison);
        if (comparison < 0) {
            debug('skip');
            ao = a[ai++]; 
        } else if (comparison > 0) {
            debug('insert');
            patch.push(new ops.Row(options.key(bo), 
                new ops.Ins(options.value(bo))));
            bo = b[bi++];
        } else {
            if (options.value(ao) !== options.value(bo)) {
                let element_patch = compare(options.value(ao), options.value(bo), element_options)
                if (element_patch != ops.NOP) patch.push(new ops.Row(options.key(bo), element_patch));
            }
            else debug('skip2');
            ao = a[ai++]; 
            bo = b[bi++];
        }
    } while (ai <= a.length && bi <= b.length);

    while (ai <= a.length) {
        patch.push(new ops.Row(options.key(ao), ops.DEL));
        ao=a[ai++]; 
    }

    while (bi <= b.length) {
        patch.push(
            new ops.Row(
                options.key(bo), 
                new ops.Ins(options.value(bo))
                )
            ); 
        bo=b[bi++]; 
    }

    return new ops.Map(patch);
}

function _compareArrays(a,b,options) {
    let result = [];

    utils.diff(a,b, 
        (add, index)    => { result.push(new ops.Row(index+1, new ops.Ins(add))); },
        (remove, index) => { result.push(new ops.Row(index, ops.DEL)); },
        (skip, index)   => { }
        );

    return new ops.Arr(result);
}

function _compareObjects(a,b,options) {

    let data = {};
    let akeys = Object.getOwnPropertyNames(a);
    let bkeys = Object.getOwnPropertyNames(b);

    for (let akey of akeys) {
        if (a[akey] !== b[akey]) data[akey] = compare(a[akey], b[akey], options.getChildOptions(a,akey));
    } 
    for (let bkey of bkeys) 
        if (a[bkey] === undefined) data[bkey] = compare(undefined, b[bkey], options.getChildOptions(b,bkey));

    return new ops.Mrg(data);    
}


/** Compare two object to produce a patch object.
 *
 * @param a First object for comparison
 * @param b Second object for comparison
 * @param options (optional) options to control comparison operation (see {@link DEFAULT_OPTIONS})
 */
 function compare(a,b,options) {
    options = Options.addDefaults(options);

    debug('comparing', a, b);
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
                        return _compareMaps(a,b,options);
                    } else  {
                        return _compareArrays(a,b,options);
                    }
                } else if (a instanceof Map) {
                    return _compareMaps(a,b,options);
                } else {
                    return _compareObjects(a,b,options);
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
function fromJSON(object) {
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
                return new ops.Mrg(utils.map(object.data, fromJSON));
            else if (object.op === ops.Map.name) 
                return new ops.Map(object.data.map(row => new ops.Row(row.key, fromJSON(row.op))));
            else if (object.op === ops.Arr.name) 
                return new ops.Arr(object.data.map(row => new ops.Row(row.key, fromJSON(row.op))));
            else throw new Error('unknown diff.op ' + object.op);
        } else {
            return new ops.Rpl(object);   
        }    
    }

    /** the public API of this module. */
    module.exports = { compare, fromJSON };

