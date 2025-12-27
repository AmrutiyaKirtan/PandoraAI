import { GoogleGenAI } from "@google/genai";
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Database connection
const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root', // change as needed
    password: 'Kirtan95109', // change as needed
    database: 'user_info',
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Simple session check
function isAuthenticated(req) {
    return req.cookies && req.cookies.user_session;
}

// Custom root route first
app.get('/', (req, res) => {
    if (!isAuthenticated(req)) {
        res.sendFile(path.join(__dirname, 'public', 'signup.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Then static middleware
app.use(express.static(path.join(__dirname, 'public')));

// Signup endpoint
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        // Check if user exists
        const [rows] = await db.execute('SELECT email FROM users WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        // Insert user
        await db.execute('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
        // Set cookie
        res.cookie('user_session', email, { httpOnly: true });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const [rows] = await db.execute('SELECT email FROM users WHERE email = ? AND password = ?', [email, password]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        res.cookie('user_session', email, { httpOnly: true });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error.' });
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    res.clearCookie('user_session');
    res.json({ success: true });
});

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: "your_api_key_here" });

let chat = null;

// Format the response text
function formatResponse(text) {
    // Add line breaks between sentences for better readability
    text = text.replace(/([.!?])\s+/g, '$1\n\n');
    
    // Format code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)\n```/g, (match, lang, code) => {
        return `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n`;
    });
    
    // Format inline code
    text = text.replace(/`([^`]+)`/g, (match, code) => {
        return `\`${code.trim()}\``;
    });
    
    // Format lists
    text = text.replace(/^(\d+\.|-)(?=\s)/gm, '\n$1');
    
    // Remove excessive newlines
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text.trim();
}

// Initialize chat on server start
async function initializeChat() {
    chat = ai.chats.create({
        model: "gemini-2.0-flash",
        history: [
            {
                role: "user",
                parts: [{ text: "Hello" }],
            },
            {
                role: "model",
                parts: [{ text: "Hi, I'm Pandora. How can I help you today?" }],
            },
            
        ],
    });
}

// Routes
app.post('/message', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Initialize chat if not already done
        if (!chat) {
            await initializeChat();
        }

        const stream = await chat.sendMessageStream({
            message: message,
        });
        
        let response = "";
        for await (const chunk of stream) {
            response += chunk.text;
        }

        // Format the response before sending
        const formattedResponse = formatResponse(response);
        res.json({ text: formattedResponse });
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});


// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    initializeChat().catch(console.error);
});
