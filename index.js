const express = require('express');
const cors = require('cors');
const ws = require('ws');

const docxRouter = require('./routes/docx.js');
const authRouter = require('./routes/auth.js');
const { handleDisconnect } = require('./routes/op.js');
const handleMessage = require('./routes/op.js');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/docx', docxRouter);
app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.send('Hello World');
});

const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

const wss = new ws.WebSocketServer({ server });

wss.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('message', (data) => {
    handleMessage(socket, data);
  });
  
  socket.on('close', () => {
    console.log('Client disconnected');
    handleDisconnect(socket);  // Clean up on disconnect
  });
});
