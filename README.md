# hologger
Azure ApplicationInsights Streamer for Hologger



## Installation

```bash
$ npm install hologger-applicationinsights
```



## Environmental variables

```bash
RACK_ENV=
HOSTNAME=
PORT=
HOLOGGER_RIFS=
HOLOGGER_RBFS=
APPINSIGHTS_INSTRUMENTATIONKEY=
APPINSIGHTS_LOG_LEVEL=
```




## Log Levels

 Mirror that of syslog, but reversing ordering:
 
  - `8` `EMERGENCY`   system unusable
  - `7` `ALERT`       immediate action required
  - `6` `CRITICAL`    condition critical
  - `5` `ERROR`       condition error
  - `4` `WARNING`     condition warning
  - `3` `NOTICE`      condition normal, but significant 
  - `2` `INFO`        a purely informational message
  - `1` `DEBUG`       debugging information



## Use 

La libreria permite su invocacion de cuatro formas indistintamente:
+ `hologger(3, {foo: "bar"})`             => la mas completa
+ `hologger("some custom message")`       => para mensajes sobre la marcha
+ `hologger({foo: "bar"})`                => igualmente sobre la marcha, pero con info estructurada
+ `hologger(Error)`                       => logueo de errores  

En cualquier caso, se generara un codigo de error que, dependiendo del nivel 
de logueo tendra la siguiente apariencia. 
+ emergency;    // 8xxxxxxx
+ alert;        // 7xxxxxxx
+ critical;     // 6xxxxxxx
+ error;        // 5xxxxxxx
+ warning;      // 4xxxxxxx
+ notice;       // 3xxxxxxx
+ info;         // 2xxxxxxx
+ debug;        // 1xxxxxxx




## Caveats
A fin de facilitar la operativa interna del logger, y de ser capaz de operar de 
la forma mas abstracta posible en el mayor numero de casos posible, `hologger` 
produce la estandarizacion interna del nombre de un numero de contado de propiedades
de la informacion que se le presenta a logueo, siendo estas:
+ `error` => `err`  
+ `request` => `req`




## License

MIT (see LICENSE file)