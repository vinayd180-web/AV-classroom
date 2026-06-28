const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(__dirname));

// ============================================================
// CLASSROOM STATE
// ============================================================
let boardHistory = [];
let isLocked = false;
let currentBg = '';
let currentZoom = 1;
let users = {};
let studentsList = {};
let studentCounter = 0;
let handRaised = {};

// ============================================================
// SOCKET EVENTS
// ============================================================
io.on('connection', (socket) => {
    console.log('🟢 Connected:', socket.id);

    // Send current state to new user
    socket.emit('history-sync', boardHistory);
    socket.emit('bg-sync', currentBg);
    socket.emit('zoom-sync', currentZoom);
    socket.emit('lock-state', isLocked);
    socket.emit('student-list', studentsList);

    // Register role
    socket.on('register-role', (role) => {
        users[socket.id] = { 
            role, 
            name: `Student ${++studentCounter}` 
        };
        console.log(`👤 ${users[socket.id].name} joined as ${role}`);

        if (role === 'student') {
            studentsList[socket.id] = {
                id: socket.id,
                name: users[socket.id].name,
                role: 'student',
                handRaised: false
            };
            io.emit('student-joined', studentsList[socket.id]);
            io.emit('student-list', studentsList);
        }
    });

    // Drawing
    socket.on('drawing', (data) => {
        boardHistory.push(data);
        socket.broadcast.emit('drawing', data);
    });

    // Clear board
    socket.on('clearBoard', () => {
        boardHistory = [];
        io.emit('clearBoard');
    });

    // Background sync
    socket.on('bg-sync', (imgData) => {
        currentBg = imgData;
        socket.broadcast.emit('bg-sync', imgData);
    });

    // Zoom sync
    socket.on('zoom-sync', (scale) => {
        currentZoom = scale;
        socket.broadcast.emit('zoom-sync', scale);
    });

    // Lock toggle (teacher only)
    socket.on('toggle-lock', (lockState) => {
        if (users[socket.id]?.role === 'teacher') {
            isLocked = lockState;
            io.emit('lock-state', isLocked);
            console.log(`🔒 Board ${isLocked ? 'LOCKED' : 'UNLOCKED'} by teacher`);
        }
    });

    // Hand raise
    socket.on('raise-hand', (data) => {
        if (users[data.id]) {
            handRaised[data.id] = true;
            io.emit('hand-raised', { id: data.id });
            console.log(`✋ ${users[data.id].name} raised hand`);
        }
    });

    // Lower all hands (teacher only)
    socket.on('lower-all-hands', () => {
        if (users[socket.id]?.role === 'teacher') {
            handRaised = {};
            io.emit('lower-all-hands');
            console.log('👋 All hands lowered by teacher');
        }
    });

    // Mute all (teacher only)
    socket.on('mute-all', () => {
        if (users[socket.id]?.role === 'teacher') {
            io.emit('mute-all');
            console.log('🔇 Teacher muted all students');
        }
    });

    // Reactions
    socket.on('reaction', (data) => {
        const name = users[data.sender]?.name || 'Someone';
        io.emit('reaction', { ...data, name });
    });

    // Math symbols
    socket.on('math-symbol', (data) => {
        socket.broadcast.emit('math-symbol', data);
    });

    // Chat
    socket.on('chat-message', (data) => {
        io.emit('chat-message', data);
        console.log(`💬 ${data.role}: ${data.text}`);
    });

    // WebRTC signaling
    socket.on('signal', (data) => {
        if (data.targetId === 'all') {
            socket.broadcast.emit('signal', { senderId: socket.id, signal: data.signal });
        } else {
            io.to(data.targetId).emit('signal', { senderId: socket.id, signal: data.signal });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('🔴 Disconnected:', socket.id);
        delete studentsList[socket.id];
        delete handRaised[socket.id];
        io.emit('student-list', studentsList);
        io.emit('user-left', socket.id);
        delete users[socket.id];
    });
});

// ============================================================
// SERVER CONFIGURATION - PORT 3001
// ============================================================
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║         🎓 AV-Classroom Server Started           ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║   🌐 URL: http://localhost:${PORT}               ║`);
    console.log(`║   📱 Network: http://0.0.0.0:${PORT}            ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║   👨‍🏫 Teacher Password: teacher123               ║');
    console.log('║   👩‍🎓 Student Password: student123               ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║   📊 Ready for 20-25 students                   ║');
    console.log('║   🟢 Server is running on port 3001             ║');
    console.log('╚══════════════════════════════════════════════════╝');
});
