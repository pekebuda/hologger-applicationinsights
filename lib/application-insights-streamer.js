var Streamer            = require('hologger-streamer');
var AI                  = require('applicationinsights');
var flattenObject       = require('./flatten');
var serializeObject     = require('./serialize');




/**
 * @description
 * ApplicationInsightsStreamer constructor
 *
 * De modo general, la (API de Azure Application Insights)[https://docs.microsoft.com/en-us/azure/application-insights/app-insights-api-custom-events-metrics] 
 * admite los siguientes formatos de invocacion:
 * + AI.defaultClient.trackPageView() 
 * + AI.defaultClient.trackRequest()
 * + AI.defaultClient.trackEvent("ServerStarted", {foo: "bar"}, {score: 1234});
 * + AI.defaultClient.trackDependency("CustomDependency", "TriggeringCommand", 2700, true);
 * + AI.defaultClient.trackMetric("StartupTime", 3400);
 * + AI.defaultClient.trackTrace("Successfully tracing", "info", {foo: "bar"}});
 * + AI.defaultClient.trackException(new RangeError("RangeErrorTest"), properties, measurements);
 * donde 
 * + properties es un Object de pares clave-valor de tipo String
 * + measurements es un Object de pares clave-valor de tipo Number 
 *
 * Cada modo de invocacion admite un contenido diferente en la (telemetria 
 * enviada)[https://github.com/Microsoft/ApplicationInsights-node.js/tree/develop/Declarations/Contracts/TelemetryTypes]
 * ademas de las (propiedades comunes)[https://github.com/Microsoft/ApplicationInsights-node.js/blob/develop/Declarations/Contracts/TelemetryTypes/Telemetry.ts]
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
    
    this._debugDrain = AI.defaultClient.trackTrace.bind(AI.defaultClient);
    this._infoDrain = AI.defaultClient.trackTrace.bind(AI.defaultClient);
    this._noticeDrain = AI.defaultClient.trackTrace.bind(AI.defaultClient);
    this._warningDrain = AI.defaultClient.trackTrace.bind(AI.defaultClient);
    this._errorDrain = AI.defaultClient.trackTrace.bind(AI.defaultClient);
    this._criticalDrain = AI.defaultClient.trackTrace.bind(AI.defaultClient);
    this._alertDrain = AI.defaultClient.trackTrace.bind(AI.defaultClient);
    this._emergencyDrain = AI.defaultClient.trackTrace.bind(AI.defaultClient);
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
 * Ademas, adapta el envio a la particular signatura de Application Insights: 
 * 
 * Igualmente, ajusta el nivel de severidad del evento a los reconocidos por 
 * [Application Insights](https://github.com/Microsoft/ApplicationInsights-node.js/blob/develop/Declarations/Contracts/Generated/SeverityLevel.ts)
 *
 * 
 * @param {} outlet                 
 * @param {Mixed} info              
 */
ApplicationInsightsStreamer.prototype._log = function(outlet, info){
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
    
    if (this._logLevels && this._logLevels.indexOf(info.severity) < this._minLogLevel) return;
    //else
    info = flattenObject(info, true, "_");
    info = serializeObject(info);
    return outlet({message:info.slug, severity:AI_SEVERITY_LEVEL, properties:info}); 
};




////// MODULE EXPORTS 
module.exports = exports = ApplicationInsightsStreamer;