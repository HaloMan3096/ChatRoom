const express = require('express');
const app = express();
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config(); // Load .env variables
const cors = require('cors');

// Middleware to parse JSON bodies
app.use(express.json());

// Use cookie-parser middleware
app.use(cookieParser());

// Serve static files from the same directory where server.js is located
app.use(express.static(__dirname));

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// Start server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});


const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL RDS.');
});


// Create Account Route
app.post('/create-account', async (req, res) => {
    const { username, password } = req.body;

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';

    db.execute(query, [username, hashedPassword], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error creating account' });
        }

        res.status(200).json({ message: 'Account created successfully!' });
    });
});

app.post('/login', async (req, res) => {
    try {
        console.log("Login request received. Body:", req.body);

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const query = 'SELECT * FROM User WHERE email = ?';

        db.execute(query, [email], async (err, results) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            if (results.length === 0) {
                return res.status(400).json({ message: "Invalid email or password" });
            }

            const user = results[0];
            console.log("User found in DB:", user);

            const isMatch = password === user.password;
            if (!isMatch) {
                return res.status(400).json({ message: "Invalid email or password" });
            }

            res.cookie('userId', user.id, { httpOnly: true, secure: true });

            res.status(200).json({ message: 'Login successful', user });
            res.cookie('testCookie', 'hello', { httpOnly: true, secure: false, sameSite: 'Lax' });
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({ message: "Server crashed" });
    }
});


// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    const userId = req.cookies.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    req.userId = userId;  // Store user ID in request for later use
    next();
}

app.get('/profile', (req, res) => {
    const token = req.cookies.authToken; // Read from cookie
    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        res.status(200).json({ username: decoded.username });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Messages

// Route to send a message
app.post('/send-message', isAuthenticated, (req, res) => {
    const userId = req.userId;
    const { message } = req.body;

    // Assuming the first conversation exists
    const conversationId = 1;  // Update this to be dynamic if needed

    // Insert the new message into the database
    const query = 'INSERT INTO chat_lines (cid, user_id, line_text, created_at) VALUES (?, ?, ?, NOW())';

    db.execute(query, [conversationId, userId, message], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error sending message' });
        }

        res.status(200).json({ message: 'Message sent successfully' });
    });
});

// Route to fetch conversations and their messages for the logged-in user
app.get('/get-user-conversations', async (req, res) => {
    try {
        // Get the user id from the cookie (you should be checking if the user is authenticated)
        const userId = req.cookies.userId;

        if (!userId) {
            return res.status(401).send('Unauthorized');
        }

        // Query to get conversations (Chats) related to this user
        const [conversations] = await db.query(`
            SELECT c.cid, c.created_at
            FROM Chat c
            INNER JOIN Chats ch ON c.cid = ch.cid
            WHERE ch.uid = ?
            GROUP BY c.cid
            ORDER BY c.created_at DESC
        `, [userId]);

        const fullConversations = await Promise.all(conversations.map(async (conversation) => {
            // For each conversation, fetch all messages, sorted by created_at
            const [messages] = await db.query(`
                SELECT ch.line_text, ch.created_at, u.UserName as sender_name
                FROM Chats ch
                INNER JOIN User u ON ch.uid = u.uid
                WHERE ch.cid = ?
                ORDER BY ch.created_at
            `, [conversation.cid]);

            conversation.messages = messages;
            return conversation;
        }));

        // Return the conversations with their messages
        res.json(fullConversations);

    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS']
}));
