var isPlainObject   = require('lodash.isplainobject');
var some            = require('lodash.some');


/**
 * @description 
 *
 * 
 * @param {Object} obj                  
 * @param {Boolean} deep                    
 * @param {String} separator                
 *
 * 
 * @example
 * ```
 * Dado el siguiente Object,
 *  {
 *      foo: hey
 *      bar: {
 *          yipi: kong
 *          ka: {
 *              yei: diddy
 *          },
 *      },
 *      baz:ho
 * }
 * lo transforma en 
 *  { 
 *      foo: hey
 *      bar/yipi: kong
 *      bar/ka: { 
 *          yei: diddy
 *      }, 
 *      baz: ho
 *  }
 *  y finalmente, por sucesivas iteraciones, en: 
 *  { 
 *      foo: hey,  
 *      bar/yipi: kong,  
 *      bar/ka/yei: diddy  
 *      baz: ho,  
 *  }
 * ```
 */
module.exports = function(obj, deep, separator){
    deep = deep || false;
    separator = separator || "/";
    
    var flattenedObj = {};
    var subObj;
    var subPath;
    for (var prop in obj) {
        subObj = obj[prop];
        var subProp;
        if (isPlainObject(subObj)) {
            for (subProp in subObj) {
                subPath = prop + separator + subProp;
                flattenedObj[subPath] = subObj[subProp];
            }
        } else if (subObj instanceof Error) {
            //propiedades standard
            flattenedObj[prop + separator + "name"] = subObj.name;
            flattenedObj[prop + separator + "message"] = subObj.message;
            flattenedObj[prop + separator + "stack"] = subObj.stack;
            //propiedades adhoc listables
            for (subProp in subObj) {
                subPath = prop + separator + subProp;
                flattenedObj[subPath] = subObj[subProp];
            }
        } else {
            flattenedObj[prop] = subObj;
        }
    }
    
    //Recursion
    if (!deep) { 
        return flattenedObj; 
    } else {
        if (some(flattenedObj, (path)=>isPlainObject(path))) {
            return arguments.callee(flattenedObj, true, separator);
        } else {
            return flattenedObj;
        }
    } 
};