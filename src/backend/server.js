const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

let latestTdsData = { tds: 0 };

// Endpoint for ESP8266 to push data
app.post('/api/tds', (req, res) => {
    const data = req.body;

    if (data && data.tds !== undefined) {
        latestTdsData = { tds: parseFloat(data.tds), timestamp: new Date().toISOString() };
        // Broadcast the updated data to all connected React clients
        io.emit('tdsUpdate', latestTdsData);

        console.log('Received TDS Data:', latestTdsData.tds);
        res.status(200).json({ success: true, message: 'Data received' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid data format. Expected { "tds": value }' });
    }
});

app.get('/api/tds', (req, res) => {
    res.status(200).json(latestTdsData);
});

io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Send the latest data immediately upon connection
    socket.emit('tdsUpdate', latestTdsData);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Node backend running on http://0.0.0.0:${PORT}`);
});
