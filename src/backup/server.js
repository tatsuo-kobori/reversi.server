"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const server = http_1.default.createServer();
const io = new socket_io_1.default.Server(server);
io.on('connection', (socket) => {
    console.log('connect');
    let counter = 0;
    // Clientからメッセージを受信
    socket.on('yyy', (data) => {
        console.log(`type: ${typeof data}   data: ${data.message}`);
    });
    // Clientにメッセージを送信
    setInterval(() => {
        socket.emit('xxx', { message: `server message ${counter++}` });
    }, 1000);
});
const port = 5000;
server.listen(port, () => {
    console.log(`app listening on port ${port}`);
});
