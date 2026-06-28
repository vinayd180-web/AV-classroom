const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// आपकी नई रेंडर लाइव लिंक के साथ Socket.io कॉन्फ़िगरेशन
const io = socketIo(server, {
    cors: {
        origin: ["https://av-classroom-ye0v.onrender.com", "http://localhost:3000"],
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

let currentPassword = "123"; // डिफॉल्ट गेटवे पासवर्ड
let whiteboardHistory = [];   // व्हाइटबोर्ड लाइन्स का बैकअप

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('एक नया यूजर कनेक्ट हुआ:', socket.id);

    socket.emit('whiteboard-history', whiteboardHistory);

    socket.on('verify-password', (inputPass, callback) => {
        if (inputPass === currentPassword) {
            callback({ success: true });
        } else {
            callback({ success: false, message: "गलत पासवर्ड! कृपया सही पासवर्ड डालें।" });
        }
    });

    socket.on('change-password', (newPass) => {
        currentPassword = newPass;
    });

    socket.on('signal', (data) => {
        socket.broadcast.emit('signal', {
            sender: socket.id,
            signal: data.signal
        });
    });

    socket.on('chat-message', (data) => {
        io.emit('chat-message', data);
    });

    socket.on('draw', (drawData) => {
        whiteboardHistory.push(drawData);
        socket.broadcast.emit('draw', drawData);
    });

    socket.on('clear-board', () => {
        whiteboardHistory = [];
        io.emit('clear-board');
    });

    socket.on('disconnect', () => {
        console.log('यूजर डिस्कनेक्ट हुआ:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`सर्वर पोर्ट ${PORT} पर लाइव है...`);
});
