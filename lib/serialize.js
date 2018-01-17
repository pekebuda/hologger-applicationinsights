var isString    = require('lodash.isstring');


/**
 * @description  
 * Convierte en string los valores.
 * 
 */
module.exports = function(obj){
    var serializedObject = {};
    for (var prop in obj) {
        //{Boolean}
        if (typeof obj[prop] === "boolean") {
            serializedObject[prop] = obj[prop]? true: false;
        //null, undefined
        } else if (!obj[prop]) {
            if (typeof prop === "undefined") serializedObject[prop] = "undefined";
            else serializedObject[prop] = "null";
        //{String}
        } else if (isString(obj[prop])){
            serializedObject[prop] = obj[prop];
        //{Object}
        } else if (obj[prop] && obj[prop].toString) {
            serializedObject[prop] = obj[prop].toString();
        } else {
            serializedObject[prop] = "non-serializable value";
        }
    }

    return serializedObject;
};