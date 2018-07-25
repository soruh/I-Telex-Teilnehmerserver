"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("../../SHARED/config.js");
const app_1 = require("../../WEBSERVER/app");
const http = require("http");
var port = normalizePort(config_js_1.default.webServerPort.toString());
app_1.default.set('port', port);
var server = http.createServer(app_1.default);
server.on('error', onError);
server.listen(port, onListening);
function normalizePort(val) {
    var port = parseInt(val, 10);
    if (isNaN(port))
        return val;
    if (port >= 0)
        return port;
    return false;
}
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    var bind = typeof port === 'string' ?
        'Pipe ' + port :
        'Port ' + port;
    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}
function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string' ?
        'pipe ' + addr :
        'port ' + addr.port;
    console.log('Listening on ' + bind);
}
