/** @module options
 *
 */

/** Default options for diff 
 *
 *   | Option                    | Default    | Description
 *   |---------------------------|------------|-------------------------- 
 *   | `elementFactory`          | `false`    | Factory used to create new object instances 
 *   | `mergeInPlace`            | `false`    | Patch will copy properties into existing object rather than creating a new one
 *   | `key`                     | `e=>e[0]`  | Function to extract key from a map entry
 *   | `value`                   | `e=>e[1]`  | Function that extracts value from map entry
 *   | `entry`                   | `(k,v)=>[k,v]`| Create a map entry
 *   | `keyComparator`           | `false`    | Comparator function (a,b) => (-1/0/1) that orders key values
 *   | `sorted`                  | `false`    | Assume array already sorted by key
 *   | `arrayElement`            | `false`    | Type of element used as a last resort to create new object instances
 *   | `collectionElementType`   | `false`    | Type of element used to create new elements in an array
 *   | `collectionElementFactory`| `false`    | Factory used to create new elements in an array 
 */
const DEFAULT_OPTIONS = {
    elementFactory : false,
    mergeInPlace : false,
    key: e=>e[0],
    value: e=>e[1],
    entry: (k,v)=>[k,v],
    map: false,
    keyComparator: false,
    sorted: false,
    elementType: false,
    collectionElementType: false,
    collectionElementFactory: false
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
                if (child.constructor.fromJSON) {
                    options.elementFactory = child.constructor.fromJSON;  
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
        options.elementType = this.collectionElementType;
        options.elementFactory = this.collectionElementFactory;
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

module.exports = Options;