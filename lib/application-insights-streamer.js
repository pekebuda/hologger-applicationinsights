var Streamer            = require('hologger-streamer');
var AI                  = require('applicationinsights');
var log                 = require('./log');




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
 * Sobreescribe el metodo homonimo de la clase {Streamer}.
 */
ApplicationInsightsStreamer.prototype._log = log;




////// MODULE EXPORTS 
module.exports = exports = ApplicationInsightsStreamer;