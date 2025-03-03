const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config(); // Load .env variables

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

const mysql = require('mysql2');

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

// Route to handle Sign In (POST request)
app.post('/login', async (req, res) => {
    console.log("OWOWOWOWOOWOWOWOOWOWOW");
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.execute(query, [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        // Create a JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.SECRET_KEY, {
            expiresIn: '1h',
        });

        // Set an HttpOnly cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: true, // Ensure HTTPS is used
            sameSite: 'Strict', // Protect against CSRF
            maxAge: 3600000, // 1 hour
        });

        res.status(200).json({ message: 'Login successful' });
    });
});



app.post('/login', async (req, res) => {
    console.log('Login request received:', req.body);

    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ?';

    db.execute(query, [username], async (err, results) => {
        if (err || results.length === 0) {
            console.log('User not found or error:', err);
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch');
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        console.log('User authenticated:', user.username);

        // Generate JWT Token
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.SECRET_KEY, {
            expiresIn: '1h',
        });

        // Set the HTTP-only cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: false, // Set to true in production (HTTPS required)
            sameSite: 'Strict',
            maxAge: 3600000, // 1 hour
        });

        console.log('Cookie set successfully');
        res.status(200).json({ message: 'Login successful' });
    });
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

const cors = require('cors');

app.use(cors({
    origin: 'http://localhost:3000',  // Frontend URL (adjust as needed)
    credentials: true  // Allow cookies to be sent
}));
