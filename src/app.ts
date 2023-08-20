import express = require("express");
import * as http from "http";
import * as socketio from "socket.io";
import socket from "./socket";
import config = require("config");

const port = config.get<number>("port");
const host = config.get<string>("host");
const corsOrigin = config.get<string>("corsOrigin");

const app = express();

const server = http.createServer(app);

const io = new socketio.Server(server, {
    cors: {
        origin: corsOrigin,
        credentials: true
    },
});

app.get('/', (_ : express.Request, res : express.Response) => {
    res.status(200).send(`Realtime server for 'Reversi' by team Pocket`)
});

server.listen(port, host, () =>{
    console.log(`The Realtime server for 'Reversi' has started`)
    console.log(`[http://${host}/${port}]`);   

    socket({ io }); 
});
