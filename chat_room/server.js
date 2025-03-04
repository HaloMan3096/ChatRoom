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
    const { username, email, password } = req.body;

    const query = 'INSERT INTO User (UserName, email, password) VALUES (?, ?, ?)';

    db.execute(query, [username, email, password], (err, results) => {
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

            res.cookie('userId', user.uid, { httpOnly: true, sameSite: 'Lax' });

            res.status(200).json({ message: 'Login successful', user });
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

app.get('/get-user', async (req, res) => {
    const userId = req.cookies.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const [users] = await db.promise().query(`
            SELECT username FROM User WHERE uid = ?
        `, [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ username: users[0].username });

    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Messages

// Route to send a message
app.post('/send-message', isAuthenticated, async (req, res) => {
    try {
        const userId = req.userId;
        const { otherUsername, chatId, message } = req.body;

        if (!chatId || !message || !otherUsername) {
            return res.status(400).json({ message: 'Missing chat ID, message, or other username' });
        }

        console.log("Sending message:", userId, chatId, message);

        // Fetch the other user's ID
        const [users] = await db.promise().query(`SELECT uid FROM User WHERE username = ?`, [otherUsername]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otherUserId = users[0].uid;
        console.log("Other User ID:", otherUserId);

        // Insert the new message into the database
        const query = `INSERT INTO Chats (other_uid, cid, uid, line_text, created_at) VALUES (?, ?, ?, ?, NOW())`;

        await db.promise().execute(query, [otherUserId, chatId, userId, message]);

        res.status(200).json({ message: 'Message sent successfully' });

    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: 'Error sending message' });
    }
});

app.get('/get-chat-messages', async (req, res) => {
    try {
        const userId = req.cookies.userId;
        const chatId = req.query.cid;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!chatId) {
            return res.status(400).json({ message: 'Missing chat ID' });
        }

        // Verify if the user is part of the chat
        const [chatMembership] = await db.promise().query(`
            SELECT 1 FROM Chats WHERE cid = ? AND uid = ? LIMIT 1
        `, [chatId, userId]);

        if (chatMembership.length === 0) {
            return res.status(403).json({ message: 'Access denied to this chat' });
        }

        // Fetch messages for the specific chat
        const [messages] = await db.promise().query(`
            SELECT ch.line_text, ch.created_at, u.username AS sender_name
            FROM Chats ch
            JOIN User u ON ch.uid = u.uid
            WHERE ch.cid = ?
            ORDER BY ch.created_at ASC
        `, [chatId]);

        res.status(200).json(messages);

    } catch (error) {
        console.error("Error fetching chat messages:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


app.get('/get-user-chats', async (req, res) => {
    const userId = req.cookies.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Get all chat IDs where the user is involved
        const [chats] = await db.promise().query(`
            SELECT *
            FROM Chat c
                     INNER JOIN Chats ch ON c.cid = ch.cid
            WHERE ch.uid = ?
            GROUP BY c.cid
            ORDER BY MAX(ch.created_at) DESC;
        `, [userId]);

        res.status(200).json(chats);

    } catch (error) {
        console.error("Error fetching user chats:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS']
}));

app.post('/create-chat', isAuthenticated, (req, res) => {
    const userId = req.userId;
    const { username, otherUsername, message } = req.body;

    if (!otherUsername || !message) {
        return res.status(400).json({ message: 'Other username and message are required' });
    }

    // Get the user ID of the other user
    const userQuery = 'SELECT uid FROM User WHERE UserName = ?';
    db.execute(userQuery, [otherUsername], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otherUserId = results[0].uid;

        // Create a new chat (if not already exists)
        const chatQuery = 'INSERT INTO Chat (chat_name) VALUES(CONCAT(?, " & ", ?))';
        db.promise().execute(chatQuery, [otherUsername, username], (err, chatResults) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error creating chat' });
            }

            const chatId = chatResults.insertId;

            // Insert the first message
            const messageQuery = 'INSERT INTO Chats (cid, uid, other_uid, line_text, created_at) VALUES (?, ?, ?, ?, NOW())';
            db.execute(messageQuery, [chatId, userId, otherUserId, message], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error sending message' });
                }

                res.status(200).json({ message: 'Chat created and message sent', chatId });
            });
        });
    });
});
