"use strict";
exports.__esModule = true;
var express = require("express");
var http = require("http");
var socketio = require("socket.io");
var socket_1 = require("./socket");
var config = require("config");
var port = config.get("port");
var host = config.get("host");
var corsOrigin = config.get("corsOrigin");
var app = express();
var server = http.createServer(app);
var io = new socketio.Server(server, {
    cors: {
        origin: corsOrigin,
        credentials: true
    }
});
app.get('/', function (_, res) {
    res.status(200).send("Realtime server for 'Reversi' by team Pocket");
});
server.listen(port, host, function () {
    console.log("The Realtime server for 'Reversi' has started");
    console.log("[http://".concat(host, "/").concat(port, "]"));
    (0, socket_1["default"])({ io: io });
});
