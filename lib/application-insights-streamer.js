var Streamer            = require('hologger-streamer');
var ApplicationInsights = require('applicationinsights');
var flattenObject       = require('./flatten');
var serializeObject     = require('./serialize');




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
 */
function ApplicationInsightsStreamer(){
    Streamer.call(this);
    
    this.name = "ApplicationInsightsStreamer";
    this.description = "ApplicationInsightsStreamer constructor";
    this._logLevels = ["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"];
    this.minLogLevel = process.env.APPINSIGHTS_LOG_LEVEL || process.env.HOLOGGER_LOG_LEVEL || 0;
    
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
ApplicationInsightsStreamer.prototype.constructor = ApplicationInsightsStreamer;




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
 * @param {} outlet                 
 * @param {Mixed} info              
 */
ApplicationInsightsStreamer.prototype._log = function(outlet, info){
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
    
    if (this._logLevels && this._logLevels.indexOf(info.severity) < this.minLogLevel) return;
    else {
        info = flattenObject(info, true, "_");
        info = serializeObject(info);
        return outlet(info.slug, AAI_SEVERITY_LEVEL, info); 
    }
};




////// MODULE EXPORTS 
module.exports = exports = ApplicationInsightsStreamer;