var _                   = require('lodash')
,   Streamer            = require("hologger-streamer")
,   ApplicationInsights = require('applicationinsights')
;




/**
 * @description
 * ApplicationInsightsStreamer constructor
 *
 * De modo general, la API de Azure Application Insights admite los siguientes 
 * cuatro formatos de invocacion: 
 * + appInsights.client.trackRequest()
 * + appInsights.client.trackEvent("ServerStarted", {foo: "bar"}, {score: 1234});
 * + appInsights.client.trackDependency("CustomDependency", "TriggeringCommand", 2700, true);
 * + appInsights.client.trackMetric("StartupTime", 3400);
 * + appInsights.client.trackTrace("Successfully tracing", "info", {foo: "bar"}});
 * + appInsights.client.trackException(new RangeError("RangeErrorTest"), properties, measurements);
 * donde 
 * + properties es un Object de pares clave-valor de tipo String
 * + measurements es un Object de pares clave-valor de tipo Number 
 * 
 * De acuero con la [documentacion](http://dl.windowsazure.com/applicationinsights/javadoc/com/microsoft/applicationinsights/telemetry/SeverityLevel.html)
 * los severity level reconocidos son Verbose, Information, Warning, Error y 
 * Critical 
 * @vid http://dl.windowsazure.com/applicationinsights/javadoc/com/microsoft/applicationinsights/TelemetryClient.html
 * 
 * Durante la configuracion del cliente, se define tantas propiedades globales
 * del mismo como variables de entorno existan de la forma APPINSIGHTS_* (por 
 * ejemplo APPINSIGHTS_INSTRUMENTATIONKEY), nombrandolas con la substring que 
 * sigue a APPINSIGHTS_ (aqui, INSTRUMENTATIONKEY)
 *
 * 
 * @api private
 * @inherits Streamer
 *
 * 
 * @param {Object} library: libreria de codigos empleada
 * @param {Nomber} isil: identificador numerico de la libreria de codigos empleada
 */
function ApplicationInsightsStreamer(library, isil){
    Streamer.call(this, library, isil);
    
    this._name = "ApplicationInsightsStreamer";
    this._description = "ApplicationInsightsStreamer constructor";
    this._logLevels = ["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"];
    this._minLogLevel = process.env.APPINSIGHTS_LOG_LEVEL || process.env.HOLOGGER_LOG_LEVEL || 0;
    
    ApplicationInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
        .setAutoCollectRequests(false)
        .setAutoCollectPerformance(false)
        .setAutoCollectExceptions(false)
        .start();
    
    for (var envar in process.env) {
        if ( envar.split("_")[0]==="APPINSIGHTS" && envar!=="APPINSIGHTS_INSTRUMENTATIONKEY") {
            const attribute = envar.split("_").slice(1).join("_");
            ApplicationInsights.client.commonProperties[attribute] = process.env[envar];
        }
    }
    
    this._debugDrain = ApplicationInsights.client.trackTrace.bind(ApplicationInsights.client);
    this._infoDrain = ApplicationInsights.client.trackTrace.bind(ApplicationInsights.client);
    this._noticeDrain = ApplicationInsights.client.trackTrace.bind(ApplicationInsights.client);
    this._warningDrain = ApplicationInsights.client.trackTrace.bind(ApplicationInsights.client);
    this._errorDrain = ApplicationInsights.client.trackTrace.bind(ApplicationInsights.client);
    this._criticalDrain = ApplicationInsights.client.trackTrace.bind(ApplicationInsights.client);
    this._alertDrain = ApplicationInsights.client.trackTrace.bind(ApplicationInsights.client);
    this._emergencyDrain = ApplicationInsights.client.trackTrace.bind(ApplicationInsights.client);
}




////// INHERITS FROM STREAMER 
ApplicationInsightsStreamer.prototype = Object.create(Streamer.prototype);
ApplicationInsightsStreamer.prototype.constructor = Streamer;




/**
 * @description 
 *
 * 
 * @param {Object} obj:
 * @param {Boolean} deep: 
 * @param {String} separator: 
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
ApplicationInsightsStreamer.prototype._flattenObject = function(obj, deep, separator){
    deep = deep || false;
    separator = separator || "/";
    
    var flattenedObj = {};
    var subObj;
    var subPath;
    for (var prop in obj) {
        subObj = obj[prop];
        var subProp;
        if (_.isPlainObject(subObj)) {
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
        if (_.some(flattenedObj, (path)=>_.isPlainObject(path))) {
            return this._flattenObject(flattenedObj, true, separator);
        } else {
            return flattenedObj;
        }
    } 
};




/**
 * @description  
 * Convierte en string los valores.
 * 
 */
ApplicationInsightsStreamer.prototype._serializeObject = function(obj){
    var serializedObject = {};
    for (var prop in obj) {
        //{Boolean}
        if (typeof obj[prop] === "boolean") {
            serializedObject[prop] = obj[prop]? true: false;
        //null, undefined
        } else if (!prop) {
            if (typeof prop === "undefined") serializedObject[prop] = "undefined";
            else serializedObject[prop] = "null";
        //{String}
        } else if (_.isString(obj[prop])){
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




/**
 * @description
 * Sobreescribe el metodo homonimo de la clase `Streamer`.
 * Envia la informacion como Object aplanado, ya que Azure Application Insights 
 * no permite el procesamiento de Objects anidados.
 * 
 * Ademas, adapta el envio a la particular signatura de Application Insights: 
 * appInsights.client.trackTrace("Successfully tracing", "info", {foo: "bar"});
 * 
 * Igualmente, ajusta el nivel de severidad del evento a los reconocidos por 
 * [Azure Application Insights](http://dl.windowsazure.com/applicationinsights/javadoc/com/microsoft/applicationinsights/telemetry/SeverityLevel.html)
 *
 * 
 * @param {} gate:
 * @param {Mixed} info:
 */
ApplicationInsightsStreamer.prototype._log = function(gate, info){
    var AAI_SEVERITY_LEVEL;
    switch (info.severity) {
        case "debug": AAI_SEVERITY_LEVEL = "Verbose"; break;
        case "info": AAI_SEVERITY_LEVEL = "Information"; break;
        case "notice": AAI_SEVERITY_LEVEL = "Information"; break;
        case "warning": AAI_SEVERITY_LEVEL = "Warning"; break;
        case "error": AAI_SEVERITY_LEVEL = "Error"; break;
        case "critical": AAI_SEVERITY_LEVEL = "Critical"; break;
        case "alert": AAI_SEVERITY_LEVEL = "Critical"; break;
        case "emergency": AAI_SEVERITY_LEVEL = "Critical"; break;
        default: AAI_SEVERITY_LEVEL = "Verbose"; break;
    }
    
    if ( this._logLevels.indexOf(info.severity) < this._minLogLevel ) return;
    else {
        info = this._flattenObject(info, true, "_");
        info = this._serializeObject(info);
        return gate(info.slug, AAI_SEVERITY_LEVEL, info); 
    }
};




////// MODULE EXPORTS 
module.exports = exports = ApplicationInsightsStreamer;