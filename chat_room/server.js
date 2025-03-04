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
app.post('/send-message', isAuthenticated, (req, res) => {
    const userId = req.userId;
    const { chatId, message } = req.body;

    if (!chatId || !message) {
        return res.status(400).json({ message: 'Missing chat ID or message' });
    }

    // Insert the new message into the database
    const query = 'INSERT INTO Chats (cid, uid, line_text, created_at) VALUES (?, ?, ?, NOW())';

    db.execute(query, [chatId, userId, message], (err, results) => {
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
        const userId = req.cookies.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Get all chat IDs the user is part of, using `created_at` from Chats
        const [conversations] = await db.promise().query(`
            SELECT DISTINCT ch.cid, MIN(ch.created_at) AS joined_at
            FROM Chats ch
            WHERE ch.uid = ?
            GROUP BY ch.cid
            ORDER BY joined_at DESC
        `, [userId]);

        if (conversations.length === 0) {
            return res.status(200).json([]); // No conversations found
        }

        // Fetch messages for each conversation
        const fullConversations = await Promise.all(conversations.map(async (conversation) => {
            const [messages] = await db.promise().query(`
                SELECT ch.line_text, ch.created_at, u.username AS sender_name
                FROM Chats ch
                JOIN User u ON ch.uid = u.uid
                WHERE ch.cid = ?
                ORDER BY ch.created_at ASC
            `, [conversation.cid]);

            return {
                ...conversation,
                messages
            };
        }));

        res.status(200).json(fullConversations);

    } catch (error) {
        console.error("Error fetching conversations:", error);
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
            SELECT c.cid
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
    const { otherUsername, message } = req.body;

    if (!otherUsername || !message) {
        return res.status(400).json({ message: 'Other username and message are required' });
    }

    // Get the user ID of the other user
    const userQuery = 'SELECT uid FROM Users WHERE username = ?';
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
        const chatQuery = 'INSERT INTO Chat DEFAULT VALUES';
        db.execute(chatQuery, [], (err, chatResults) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error creating chat' });
            }

            const chatId = chatResults.insertId;

            // Insert the first message
            const messageQuery = 'INSERT INTO Chats (cid, uid, line_text, created_at) VALUES (?, ?, ?, NOW())';
            db.execute(messageQuery, [chatId, userId, message], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error sending message' });
                }

                res.status(200).json({ message: 'Chat created and message sent', chatId });
            });
        });
    });
});
