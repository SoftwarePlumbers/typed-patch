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
function compare(a,b, options) {
    if (a === b) return 0;
    return _compareWith(a[options.key],b, options)
}

function lcsTable(a, b) {

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
            if (a[i] === b[j])
                lengths[i+1][j+1] = lengths[i][j] + 1
            else
                lengths[i+1][j+1] = Math.max(lengths[i+1][j], lengths[i][j+1])

    return lengths;
}

function diff(a, b, add, remove, skip, table = lcsTable(a,b), i = a.length-1, j = b.length-1) {
    if (i >= 0 && j >= 0 && a[i] === b[j]) {
        diff(a, b, add, remove, skip, table, i-1, j-1)
        skip(a[i]);
    } else if (j >= 0 && (i === -1 || table[i+1][j] >= table[i][j+1])) {
        diff(a, b, add, remove, skip, table, i, j-1)
        add(b[j]);
    } else if (i >= 0 && (j === -1 || table[i+1][j] < table[i][j+1])) {
        diff(a, b, add, remove, skip, table, i-1, j)
        remove(a[i]);
    }
}



/** exports */
module.exports = { map, reduce, appendString, print, compareWith, compare, lcsTable, diff };
