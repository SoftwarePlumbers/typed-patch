/** Utility functions for typed-patch
 *
 * @module utils
 */


/** Utility function that applies a function to transform all the properties of an object 
 * @param object for which we will transform properties
 * @param fn {Function} function to apply property transformation
 */
function map(object, fn) {
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
function reduce(object, res, fn) {
    for (let key of Object.getOwnPropertyNames(object))
        res = fn(res, key, object[key] );
    return res;
}

/** Append a name/value pair to a string.
 *
 * Appends name : value to a string, prefixed with a ',' if the string is not empty.
 *
 * @param res string to append to
 * @param name name to append
 * param value value to append
 */
function appendString(res, name, value) {
    let delimeter = res ? ", " : "";
    return `${res}${delimeter}${name}: ${value}`;
}

/** Convert object to string recursively with all properties.
 *
 * @param object to convert to string
 * @returns a standard string representation.
 */
function print(object) {
    if (typeof object === 'object') {
        return '{ ' + reduce(map(object, print), "", appendString) + ' }'; 
    }
    return object;
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
function compareWith(akey, b, options) {
    let bkey = options.key(b);
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
function compare(a,b, options) {
    if (a === b) return 0;
    return compareWith(options.key(a), b, options)
}

function mapEntryToString([k,v]) {
    return `[ ${k}, ${v} ]`;
}

function lcsTable(a, b, comparison = (x,y) => x===y) {

    let la = a.length + 1;
    let lb = b.length + 1;

    lengths = Array(la);

    lengths[0] = new Array(lb).fill(0);

    for (let i = 1; i < la; i++) {
        lengths[i] = Array(lb);
        lengths[i][0] = 0;
    }

    for (let i = 0; i < a.length; i++)
        for (let j = 0; j < b.length; j++)
            if (comparison(a[i],b[j]))
                lengths[i+1][j+1] = lengths[i][j] + 1
            else
                lengths[i+1][j+1] = Math.max(lengths[i+1][j], lengths[i][j+1])

    return lengths;
}

function isArrayLike(obj) {
    return (obj.length) && ((obj.length === 0) || obj[0]);  
}

function diff(a, b, add, remove, skip, comparison = (x,y) => x===y, table = lcsTable(a,b,comparison), i = a.length-1, j = b.length-1) {

    if (!(isArrayLike(a) && isArrayLike(b))) throw new TypeError('objects to compare must support length attribute and ordered integer attribute accessors');
    if (typeof add != 'function') throw new TypeError('add must be a function');
    if (typeof remove != 'function') throw new TypeError('remove must be a function');
    if (typeof skip != 'function') throw new TypeError('skip must be a function');

    if (i >= 0 && j >= 0 && comparison(a[i],b[j])) {
        diff(a, b, add, remove, skip, comparison, table, i-1, j-1)
        skip(a[i],b[j],i);
    } else if (j >= 0 && (i === -1 || table[i+1][j] >= table[i][j+1])) {
        diff(a, b, add, remove, skip, comparison, table, i, j-1)
        add(b[j],i);
    } else if (i >= 0 && (j === -1 || table[i+1][j] < table[i][j+1])) {
        diff(a, b, add, remove, skip, comparison, table, i-1, j)
        remove(a[i],i);
    }
}



/** exports */
module.exports = { map, reduce, appendString, print, compareWith, compare, mapEntryToString, lcsTable, diff, isArrayLike };
