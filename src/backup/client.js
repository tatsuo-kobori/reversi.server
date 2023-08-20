"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const port = 5000;
const socket = (0, socket_io_client_1.io)(`http://localhost:${port}`);
socket.on('connect', () => {
    console.log('connect');
});
// Serverからメッセージを受信
socket.on('xxx', (data) => {
    console.log(`type: ${typeof data}   data: ${data.message}`);
});
// Serverにメッセージを送信
let counter = 0;
setInterval(() => {
    socket.emit('yyy', { message: `client message ${counter++}` });
}, 1000);
