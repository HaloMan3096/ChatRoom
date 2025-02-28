const express = require('express');
const path = require('path');

const app = express();

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
    host: 'chatroomdatabase.cxaw4yoqi11r.us-east-2.rds.amazonaws.com',
    user: 'admin',
    password: 'XrPzMsJyLral85ThImSx',
    database: 'chatroomdatabase'
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL RDS.');
});

