/**
 * Main Server Entry Point
 * 
 * This file sets up the Express application, connects to the MongoDB database,
 * configures Socket.io for real-time communication, and defines the API routes.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const http = require('http');
const { Server } = require("socket.io");
const Message = require('./models/Message');
const User = require('./models/User'); // Moved up to valid scope
const multer = require('multer');
const Filter = require('bad-words');
const filter = new Filter();

const app = express();
const server = http.createServer(app);

// --- Socket.io Configuration ---
// Configures real-time bidirectional event-based communication.
// Allowing CORS for the frontend application.
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["my-custom-header"],
  }
});

const PORT = process.env.PORT || 5000;

// --- Middleware ---
// CORS allows requests from the frontend domain.
// express.json() parses incoming JSON requests.
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));
app.use(express.json());

// --- Database Connection ---
// Connects to the MongoDB instance using Mongoose.
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/community-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Socket.io Real-time Logic ---
// Handles real-time events like joining groups, sending messages, and polling.

// Store anonymous chat users in memory (not in DB)
const chatUsers = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Group/Event Specific Chat Logic
  socket.on('join_group', (data) => {
    let groupId, username;
    if (typeof data === 'string') {
      groupId = data;
    } else {
      groupId = data.groupId;
      username = data.username;
    }

    // Join a specific room based on Group ID
    socket.join(groupId);
    console.log(`User ${socket.id} joined group ${groupId}`);

    if (username) {
      // Notify others in the room
      io.to(groupId).emit('receive_message', {
        type: 'system',
        content: `${username} joined the chat`,
        _id: Date.now() + Math.random()
      });
    }
  });

  // Handle Sending Messages to Groups
  socket.on('send_message', async (data) => {
    // data: { groupId, senderId, type, content, pollQuestion, pollOptions }
    try {
      const Group = require('./models/Group');
      const group = await Group.findById(data.groupId);

      if (group && group.isRestricted) {
        // You might want to emit an error back to the specific client here
        return;
      }

      const newMessage = new Message({
        group: data.groupId,
        sender: data.senderId,
        type: data.type,
        content: filter.clean(data.content),
        pollQuestion: data.pollQuestion,
        pollOptions: data.pollOptions
      });
      await newMessage.save();

      // Populate sender details for the frontend
      await newMessage.populate('sender', ['username', 'profilePicture']);

      const messageToSend = newMessage.toObject();
      io.to(data.groupId).emit('receive_message', messageToSend);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  // Handle Poll Voting
  socket.on('vote_poll', async ({ messageId, optionIndex, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && message.type === 'poll') {
        // Simple logic to toggle vote
        const hasVoted = message.pollOptions.some(opt => opt.votes.includes(userId));
        const option = message.pollOptions[optionIndex];
        const voteIdx = option.votes.indexOf(userId);

        if (voteIdx === -1) {
          option.votes.push(userId);
        } else {
          option.votes.splice(voteIdx, 1);
        }
        await message.save();
        await message.populate('sender', ['username', 'profilePicture']);
        io.to(message.group.toString()).emit('poll_updated', message);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Admin Restrict Message
  socket.on('restrict_message', async ({ messageId, adminId }) => {
    try {
      // Verify admin
      const admin = await User.findById(adminId);
      if (admin && admin.role === 'admin') {
        const message = await Message.findById(messageId);
        if (message && !message.isRestricted) {
          message.originalContent = message.content;
          message.content = '***';
          message.isRestricted = true;
          await message.save();
          await message.populate('sender', ['username', 'profilePicture']);
          io.to(message.group.toString()).emit('message_updated', message);
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Admin Unrestrict Message
  socket.on('unrestrict_message', async ({ messageId, adminId }) => {
    try {
      // Verify admin
      const admin = await User.findById(adminId);
      if (admin && admin.role === 'admin') {
        const message = await Message.findById(messageId);
        if (message && message.isRestricted) {
          message.content = message.originalContent;
          message.isRestricted = false;
          await message.save();
          await message.populate('sender', ['username', 'profilePicture']);
          io.to(message.group.toString()).emit('message_updated', message);
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Global / Anonymous Chat Logic
  // Global / Anonymous Chat Logic
  socket.on('send', async (data) => {
    try {
      let content = filter.clean(data.message);
      // Use provided name/pic or fallback to session memory
      const senderName = data.name || (chatUsers[socket.id] ? chatUsers[socket.id].name : 'Anonymous');
      const senderPic = data.profilePicture || (chatUsers[socket.id] ? chatUsers[socket.id].profilePicture : null);

      // Check content moderation (blocking logic)
      if (senderName !== 'Anonymous') {
        const user = await User.findOne({ username: senderName });
        if (user && user.isChatBlocked) {
          content = '****'; // Mask content if user is blocked
        }
      }

      // Broadcast to all connected clients (Global Chat)
      io.emit('receive', {
        id: Date.now() + Math.random().toString(36).substr(2, 9), // Generate unique ID
        message: content,
        name: senderName,
        profilePicture: senderPic
      });
    } catch (err) {
      console.error(err);
    }
  });

  // Global Chat Restriction (Runtime only for ephemeral chat)
  socket.on('restrict_global_message', async ({ messageId, adminId }) => {
    try {
      const admin = await User.findById(adminId);
      if (admin && admin.role === 'admin') {
        io.emit('global_message_restricted', { messageId });
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('unrestrict_global_message', async ({ messageId, adminId }) => {
    try {
      const admin = await User.findById(adminId);
      if (admin && admin.role === 'admin') {
        io.emit('global_message_unrestricted', { messageId });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Handle New User in Anonymous Chat
  socket.on('new-user-joined', (data) => {
    const name = typeof data === 'object' ? data.name : data;
    const profilePicture = typeof data === 'object' ? data.profilePicture : null;

    chatUsers[socket.id] = { name, profilePicture };
    socket.broadcast.emit('user-joined', { name, profilePicture });
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (chatUsers[socket.id]) {
      socket.broadcast.emit('left', chatUsers[socket.id]);
      delete chatUsers[socket.id];
    }
  });
});


// --- API Routes ---
// Basic health check
app.get('/', (req, res) => {
  res.send('Community Platform API is running');
});

// Register API endpoints
app.use('/api/auth', require('./routes/auth'));       // Authentication
app.use('/api/groups', require('./routes/groups'));   // Group management
app.use('/api/posts', require('./routes/posts'));     // Feed posts
app.use('/uploads', express.static('uploads'));       // Static file serving for uploads
app.use('/api/events', require('./routes/events'));   // Event management
app.use('/api/messages', require('./routes/messages')); // Chat history
app.use('/api/contests', require('./routes/contests')); // Content/Event registration
app.use('/api/reports', require('./routes/reports'));   // Moderation Reports
app.use('/api/users', require('./routes/users'));     // User management (Admin)

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ msg: 'File Upload Error', error: err.message });
  }
  if (err) {
    if (typeof err === 'string') {
      return res.status(400).json({ msg: err });
    }
    return res.status(500).json({ msg: 'Server Error', error: err.message || err });
  }
  next();
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
