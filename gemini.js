import { GoogleGenAI } from "@google/genai";
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import cookieParser from 'cookie-parser';
import axios from 'axios';

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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

// Handle direct access to any HTML files (except signup.html)
app.get('*.html', (req, res) => {
    const requestedFile = req.path;
    if (requestedFile === '/signup.html') {
        res.sendFile(path.join(__dirname, 'public', 'signup.html'));
    } else if (!isAuthenticated(req)) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'public', requestedFile));
    }
});

// Then static middleware (exclude HTML files to handle them with authentication)
app.use(express.static(path.join(__dirname, 'public'), {
    index: false // Disable automatic serving of index.html
}));

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
const ai = new GoogleGenAI({ apiKey: "AIzaSyBMa2hRCbDsdqw-Vm7WhJ8xsRgEtrjrRLs" });

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

// Voice message endpoint with audio generation
app.post('/voice-message', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Initialize chat if not already done
        if (!chat) {
            await initializeChat();
        }

        // Generate text response
        const stream = await chat.sendMessageStream({
            message: message,
        });
        
        let response = "";
        for await (const chunk of stream) {
            response += chunk.text;
        }

        // Format the response
        const formattedResponse = formatResponse(response);

        // Generate audio using Gemini TTS
        try {
            const audioResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ 
                    parts: [{ 
                        text: formattedResponse 
                    }] 
                }],
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { 
                                voiceName: 'Kore' 
                            }
                        }
                    }
                }
            });

            // Extract audio data from response
            const audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;
            
            if (audioData && audioData.data) {
                res.json({ 
                    text: formattedResponse, 
                    audio: audioData.data,
                    audioType: 'audio/wav'
                });
            } else {
                // Fallback to text-only if audio generation fails
                res.json({ 
                    text: formattedResponse,
                    audio: null,
                    audioType: null
                });
            }
        } catch (audioError) {
            console.error('Audio generation error:', audioError);
            // Fallback to text-only response
            res.json({ 
                text: formattedResponse,
                audio: null,
                audioType: null
            });
        }
    } catch (error) {
        console.error('Error processing voice message:', error);
        res.status(500).json({ error: 'Failed to process voice message' });
    }
});

// Conversational audio chat endpoint
app.post('/conversational-audio', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`🤖 Processing conversational message: ${message}`);

        // Generate AI response with audio using Gemini TTS
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: message }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (data) {
            // Convert base64 audio to buffer
            const audioBuffer = Buffer.from(data, 'base64');
            
            res.json({ 
                success: true,
                message: 'Audio generated successfully',
                audio: data,
                audioType: 'audio/wav',
                audioSize: audioBuffer.length
            });
        } else {
            res.json({ 
                success: false,
                message: 'No audio generated',
                audio: null,
                audioType: null
            });
        }

    } catch (error) {
        console.error('❌ Conversational audio error:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate conversational audio',
            message: error.message
        });
    }
});

// Audio playback endpoint (for testing)
app.get('/audio-test', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Audio Test</title>
        </head>
        <body>
            <h1>Conversational Audio Test</h1>
            <input type="text" id="messageInput" placeholder="Type your message..." style="width: 300px; padding: 10px;">
            <button onclick="sendMessage()">Send</button>
            <div id="status"></div>
            <audio id="audioPlayer" controls style="margin-top: 20px;"></audio>
            
            <script>
                async function sendMessage() {
                    const message = document.getElementById('messageInput').value;
                    const status = document.getElementById('status');
                    const audioPlayer = document.getElementById('audioPlayer');
                    
                    if (!message.trim()) {
                        status.textContent = 'Please enter a message';
                        return;
                    }
                    
                    status.textContent = 'Generating audio...';
                    
                    try {
                        const response = await fetch('/conversational-audio', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success && data.audio) {
                            status.textContent = 'Audio generated! Playing...';
                            
                            // Convert base64 to blob and play
                            const audioBlob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: data.audioType });
                            const audioUrl = URL.createObjectURL(audioBlob);
                            audioPlayer.src = audioUrl;
                            audioPlayer.play();
                        } else {
                            status.textContent = 'Failed to generate audio: ' + data.message;
                        }
                    } catch (error) {
                        status.textContent = 'Error: ' + error.message;
                    }
                }
                
                // Allow Enter key to send message
                document.getElementById('messageInput').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        sendMessage();
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Voice input processing endpoint with speech-to-text
app.post('/process-voice-input', async (req, res) => {
    try {
        const { audioData, audioType } = req.body;
        
        if (!audioData) {
            return res.status(400).json({ error: 'Audio data is required' });
        }

        console.log(`🎤 Processing voice input...`);

        // For now, we'll simulate speech-to-text conversion
        // In a real implementation, you'd use a speech-to-text service like Google Speech-to-Text
        const simulatedText = "give me a small summary of machine learning and its applications in real world"; // Simulated text from audio input
        
        // Generate AI response with audio using the chat model first
        let aiResponse = "";
        try {
            // Initialize chat if not already done
            if (!chat) {
                await initializeChat();
            }

            // Generate text response using the chat model
            const stream = await chat.sendMessageStream({
                message: simulatedText,
            });
            
            for await (const chunk of stream) {
                aiResponse += chunk.text;
            }

            // Format the response
            aiResponse = formatResponse(aiResponse);
        } catch (chatError) {
            console.error('Chat error:', chatError);
            aiResponse = "Thank you for your voice message! I'm here to help you with anything you need. What would you like to know or discuss?";
        }
        
        // Generate audio using Gemini TTS
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: aiResponse }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (data) {
            res.json({ 
                success: true,
                message: 'Voice processed successfully',
                transcribedText: aiResponse,
                audio: data,
                audioType: 'audio/wav'
            });
        } else {
            res.json({ 
                success: false,
                message: 'No audio generated',
                transcribedText: aiResponse,
                audio: null,
                audioType: null
            });
        }

    } catch (error) {
        console.error('❌ Voice processing error:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to process voice input',
            message: error.message
        });
    }
});

// Murf AI Text-to-Speech endpoint
app.post('/murf-tts', async (req, res) => {
    try {
        const { text, voiceId = 'en-US-molly', style = 'Conversational' } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log(`🎤 Generating Murf AI speech for: "${text.substring(0, 50)}..."`);

        // Murf AI API configuration
        const data = JSON.stringify({
            text: text,
            voiceId: voiceId,
            style: style,
            multiNativeLocale: "en-US"
        });

        const config = {
            method: 'post',
            url: 'https://api.murf.ai/v1/speech/generate',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': process.env.MURF_API_KEY || 'ap2_a449de69-6252-44bb-b76d-0af1e84c8d39'
            },
            data: data
        };

        const response = await axios(config);
        
        if (response.data && response.data.audio) {
            res.json({
                success: true,
                message: 'Audio generated successfully',
                audio: response.data.audio,
                audioType: 'audio/mpeg',
                voiceId: voiceId,
                style: style
            });
        } else {
            res.json({
                success: false,
                message: 'No audio data received from Murf AI',
                error: 'Invalid response format'
            });
        }

    } catch (error) {
        console.error('❌ Murf AI TTS error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to generate audio with Murf AI',
            message: error.response?.data?.errorMessage || error.message
        });
    }
});

// Enhanced message endpoint with Murf AI TTS
app.post('/message-with-tts', async (req, res) => {
    try {
        const { message, useMurfTTS = true, voiceId = 'en-US-JennyNeural' } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Initialize chat if not already done
        if (!chat) {
            await initializeChat();
        }

        // Generate AI text response
        const stream = await chat.sendMessageStream({
            message: message,
        });
        
        let response = "";
        for await (const chunk of stream) {
            response += chunk.text;
        }

        // Format the response
        const formattedResponse = formatResponse(response);

        if (useMurfTTS) {
            try {
                // Generate audio using Murf AI
                const ttsResponse = await axios({
                    method: 'post',
                    url: 'https://api.murf.ai/v1/speech/generate',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'api-key': process.env.MURF_API_KEY || 'ap2_a449de69-6252-44bb-b76d-0af1e84c8d39'
                    },
                    data: {
                        text: formattedResponse,
                        voiceId: voiceId,
                        style: 'Narration',
                        multiNativeLocale: 'en-US'
                    }
                });

                if (ttsResponse.data && ttsResponse.data.audio) {
                    res.json({
                        text: formattedResponse,
                        audio: ttsResponse.data.audio,
                        audioType: 'audio/mpeg',
                        voiceId: voiceId,
                        success: true
                    });
                } else {
                    // Fallback to text-only if Murf fails
                    res.json({
                        text: formattedResponse,
                        audio: null,
                        audioType: null,
                        success: true
                    });
                }
            } catch (ttsError) {
                console.error('Murf TTS error:', ttsError.message);
                // Fallback to text-only
                res.json({
                    text: formattedResponse,
                    audio: null,
                    audioType: null,
                    success: true
                });
            }
        } else {
            // Text-only response
            res.json({
                text: formattedResponse,
                audio: null,
                audioType: null,
                success: true
            });
        }

    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Get available Murf AI voices
app.get('/murf-voices', async (req, res) => {
    try {
        console.log('🎵 Fetching available Murf AI voices...');

        const response = await axios({
            method: 'get',
            url: 'https://api.murf.ai/v1/speech/voices',
            headers: {
                'Accept': 'application/json',
                'api-key': process.env.MURF_API_KEY || 'ap2_a449de69-6252-44bb-b76d-0af1e84c8d39'
            }
        });

        res.json({
            success: true,
            voices: response.data
        });

    } catch (error) {
        console.error('❌ Error fetching Murf voices:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch voices',
            message: error.response?.data?.errorMessage || error.message
        });
    }
});

// User info endpoint for profile popup
app.get('/user-info', async (req, res) => {
    if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const email = req.cookies.user_session;
        const [rows] = await db.execute('SELECT name, email FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = rows[0];
        res.json({ name: user.name, email: user.email });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    initializeChat().catch(console.error);
});