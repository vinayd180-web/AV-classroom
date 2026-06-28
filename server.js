const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// टीचर का पिन और स्टूडेंट का शुरुआती पासवर्ड
const TEACHER_PIN = "1234"; 
let studentPassword = "student2026"; 

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('A user connected');

    // कनेक्ट होते ही स्टूडेंट का मौजूदा पासवर्ड फ्रंटएंड को भेजना
    socket.emit('init-password', studentPassword);

    // टीचर द्वारा पासवर्ड बदलने पर
    socket.on('update-student-password', (newPass) => {
        studentPassword = newPass;
        socket.broadcast.emit('init-password', studentPassword); // सबको नया पासवर्ड अपडेट करना
    });

    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data);
    });

    socket.on('clear-board', () => {
        socket.broadcast.emit('clear-board');
    });

    socket.on('chat-message', (msg) => {
        io.emit('chat-message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
