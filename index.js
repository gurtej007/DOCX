const express = require('express');
const ws = require('ws');
const router=require('./routes/docx.js');
const handleMessage = require('./routes/op.js');

const app = express();
app.use(express.json());
app.use('/docx', router);

app.get('/', (req, res) => {
  res.send('Hello World');
});

const server=app.listen(3000, () => {
  console.log('Server is running on port 3000');
  
});


const wss = new ws.WebSocketServer({ server });

wss.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('message', (data) => {
    handleMessage(socket, data);  // Pass to op.js
  });
  
  socket.on('close', () => {
    console.log('Client disconnected');
  });
});


