import http from 'http';
import socketio from 'socket.io';

const server: http.Server = http.createServer();
const io: socketio.Server = new socketio.Server(server);

io.on('connection', (socket: socketio.Socket) => {
  console.log('connect');

  let counter = 0;

  // Clientからメッセージを受信
  socket.on('yyy', (data: { message: string }) => {
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
