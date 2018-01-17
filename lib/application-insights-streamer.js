var Streamer            = require('hologger-streamer');
var AI                  = require('applicationinsights');
var clone               = require('lodash.clone');
var flattenObject       = require('./flatten');
var serializeObject     = require('./serialize');




/**
 * @description
 * ApplicationInsightsStreamer constructor
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
 * @param {String} ikey             Application Insights' intrumentation key. It 
 * is used for authenticating with the service
 */
function ApplicationInsightsStreamer(ikey){
    Streamer.call(this);
    
    this.name = "ApplicationInsightsStreamer";
    this.description = "ApplicationInsightsStreamer constructor";
    this._logLevels = ["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"];
    this._minLogLevel = process.env.HOLOGGER_APPLICATIONINSIGHTS_LOG_LEVEL || this._minLogLevel || 0;
    
    AI.setup(ikey)
        .setAutoDependencyCorrelation(false)
        .setAutoCollectRequests(false)
        .setAutoCollectPerformance(false)
        .setAutoCollectExceptions(false)
        .setAutoCollectDependencies(false)
        .setAutoCollectConsole(false)
        .setUseDiskRetryCaching(false)
        .start();
    
    for (var envar in process.env) {
        if (envar.split("_")[0] !== "APPINSIGHTS") continue;
        if (envar !== "APPINSIGHTS_INSTRUMENTATIONKEY") {
            let attribute = envar.split("_").slice(1).join("_");
            AI.defaultClient.commonProperties[attribute] = process.env[envar];
        }
    }
    
    this._debugDrain = AI.defaultClient.track.bind(AI.defaultClient);
    this._infoDrain = AI.defaultClient.track.bind(AI.defaultClient);
    this._noticeDrain = AI.defaultClient.track.bind(AI.defaultClient);
    this._warningDrain = AI.defaultClient.track.bind(AI.defaultClient);
    this._errorDrain = AI.defaultClient.track.bind(AI.defaultClient);
    this._criticalDrain = AI.defaultClient.track.bind(AI.defaultClient);
    this._alertDrain = AI.defaultClient.track.bind(AI.defaultClient);
    this._emergencyDrain = AI.defaultClient.track.bind(AI.defaultClient);
}




////// INHERITS FROM STREAMER 
ApplicationInsightsStreamer.prototype = Object.create(Streamer.prototype);
ApplicationInsightsStreamer.prototype.constructor = ApplicationInsightsStreamer;




/**
 * @description
 * Sobreescribe el metodo homonimo de la clase `Streamer`.
 * Envia la informacion como Object aplanado, ya que Azure Application Insights 
 * no permite el procesamiento de Objects anidados.
 * 
 * Ademas, adapta el envio a la particular signatura de Application Insights.
 * De modo general, la (API de Application Insights)[https://docs.microsoft.com/en-us/azure/application-insights/app-insights-api-custom-events-metrics] 
 * admite los siguientes formatos de invocacion:
 * 
 * + AI.defaultClient.trackPageView() 
 * + AI.defaultClient.trackRequest()
 * + AI.defaultClient.trackEvent();
 * + AI.defaultClient.trackTrace();
 * + AI.defaultClient.trackMetric();
 * + AI.defaultClient.trackDependency();
 * + AI.defaultClient.trackException();
 *
 * Cada modo de invocacion admite un contenido diferente en la telemetria 
 * enviada, ademas de ciertas (propiedades comunes)[https://github.com/Microsoft/ApplicationInsights-node.js/blob/develop/Declarations/Contracts/TelemetryTypes/Telemetry.ts]
 * En concreto, segun la (doc)[https://github.com/Microsoft/ApplicationInsights-node.js/tree/develop/Declarations/Contracts/TelemetryTypes]:
 * 
 * + Pageview: ???
 * + Request: name, url, duration, resultCode, success, source?
 * + Event: name, measurements?
 * + Trace: message, severity?
 * + Metric: name, value, count?, min?, max?, stdDev?
 * + Dependency: dependencyTypeName, name, data, duration, resultCode, success, target?, 
 * + Exception: exception, measurements?
 * 
 * donde 
 * 
 * + properties es un {Object} de pares clave-valor de tipo String
 * + measurements es un {Object} de pares clave-valor de tipo Number 
 * 
 * Igualmente, ajusta el nivel de severidad del evento a los reconocidos por 
 * [Application Insights](https://github.com/Microsoft/ApplicationInsights-node.js/blob/develop/Declarations/Contracts/Generated/SeverityLevel.ts)
 *
 * 
 * @param {} outlet                 
 * @param {Mixed} info              
 */
ApplicationInsightsStreamer.prototype._log = function(outlet, info){
    if (this._logLevels && this._logLevels.indexOf(info.severity) < this._minLogLevel) return;
   
    var AI_TELEMETRY_TYPE;
    if (info.err) AI_TELEMETRY_TYPE = AI.Contracts.TelemetryType.Exception;
    else if (info.req) AI_TELEMETRY_TYPE = AI.Contracts.TelemetryType.Request;
    else AI_TELEMETRY_TYPE = AI.Contracts.TelemetryType.Trace;
    
    var AI_SEVERITY_LEVEL;
    switch (info.severity) {
        case "debug": AI_SEVERITY_LEVEL = AI.Contracts.SeverityLevel.Verbose; break;
        case "info": AI_SEVERITY_LEVEL = AI.Contracts.SeverityLevel.Information; break;
        case "notice": AI_SEVERITY_LEVEL = AI.Contracts.SeverityLevel.Information; break;
        case "warning": AI_SEVERITY_LEVEL = AI.Contracts.SeverityLevel.Warning; break;
        case "error": AI_SEVERITY_LEVEL = AI.Contracts.SeverityLevel.Error; break;
        case "critical": AI_SEVERITY_LEVEL = AI.Contracts.SeverityLevel.Critical; break;
        case "alert": AI_SEVERITY_LEVEL = AI.Contracts.SeverityLevel.Critical; break;
        case "emergency": AI_SEVERITY_LEVEL = AI.Contracts.SeverityLevel.Critical; break;
        default: AI_SEVERITY_LEVEL = AI.Contracts.SeverityLevel.Verbose; break;
    }

    var AI_INFO;
    if (AI_TELEMETRY_TYPE === AI.Contracts.TelemetryType.Request) {
        AI_INFO = {
            name: info.name,
            url: info.url,
            duration: info.duration,
            resultCode: info.resultCode,
            success: info.success,
            properties: info
        };
    } else if (AI_TELEMETRY_TYPE === AI.Contracts.TelemetryType.Exception) {
        AI_INFO = {
            exception: clone(info.err), //evita que se lo zumbe el flattenObject posterior
            properties: info
        };
    } else {
        AI_INFO = {
            message: info.slug,
            severity: AI_SEVERITY_LEVEL,
            properties: info
        };
    } 

    AI_INFO.properties = flattenObject(AI_INFO.properties, true, "_");
    AI_INFO.properties = serializeObject(AI_INFO.properties);
    return outlet(AI_INFO, AI_TELEMETRY_TYPE); 
};




////// MODULE EXPORTS 
module.exports = exports = ApplicationInsightsStreamer;