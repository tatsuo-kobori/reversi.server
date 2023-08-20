import { io } from 'socket.io-client';

const port = 5000;
const socket = io(`http://localhost:${port}`);

socket.on('connect', () => {
  console.log('connect');
});

// Serverからメッセージを受信
socket.on('xxx', (data: { message: string }) => {
  console.log(`type: ${typeof data}   data: ${data.message}`);
});

// Serverにメッセージを送信
let counter = 0;
setInterval(() => {
  socket.emit('yyy', { message: `client message ${counter++}` });
}, 1000);
