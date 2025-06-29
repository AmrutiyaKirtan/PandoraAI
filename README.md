TTS Api key = ap2_a449de69-6252-44bb-b76d-0af1e84c8d39

# Pandora AI Chatbot

A web-based chatbot with voice and text capabilities using Google Gemini AI and Murf AI for high-quality text-to-speech.

## Features

- 🤖 **AI Chat**: Powered by Google Gemini AI
- 🎤 **Voice Input**: Real-time speech-to-text using Web Speech API
- 🔊 **High-Quality TTS**: Murf AI text-to-speech with multiple voices
- 👤 **User Authentication**: MySQL-based user system
- 🎨 **Modern UI**: Beautiful, responsive design

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
Create a MySQL database named `user_info` and run:
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. API Keys Configuration

#### Google Gemini AI
Update the API key in `gemini.js`:
```javascript
const ai = new GoogleGenAI({ apiKey: "YOUR_GEMINI_API_KEY" });
```

#### Murf AI (Optional but Recommended)
For high-quality text-to-speech, set your Murf AI API key:

**Option A: Environment Variable**
```bash
export MURF_API_KEY="your_murf_api_key_here"
```

**Option B: Direct in Code**
Update in `gemini.js`:
```javascript
'api-key': 'YOUR_MURF_API_KEY' // Replace with your actual API key
```

### 4. Start the Server
```bash
node gemini.js
```

The server will start on `http://localhost:3000`

## Usage

### Main Chat
- Visit `http://localhost:3000` (redirects to signup if not logged in)
- Text-based chat with AI responses spoken aloud

### Voice Chat
- Visit `http://localhost:3000/voice-chat.html`
- Click microphone to speak
- AI responds with high-quality audio

### Test Pages
- **Speech Recognition Test**: `http://localhost:3000/speech-recognition-test.html`
- **Text-to-Speech Test**: `http://localhost:3000/speech-test.html`
- **Murf AI TTS Test**: `http://localhost:3000/murf-test.html`

## Voice Features

### Available Voices (Murf AI)
- **US English**: Jenny, Guy
- **UK English**: Sonia, Ryan
- **Australian**: Natasha, William
- **Italian**: Giorgio
- **Spanish**: Elvira
- **French**: Denise
- **German**: Katja

### Speaking Styles
- Narration
- Conversation
- News
- Story
- Poetry

## API Endpoints

- `POST /signup` - User registration
- `POST /login` - User authentication
- `POST /logout` - User logout
- `POST /message` - Text chat with AI
- `POST /message-with-tts` - Chat with Murf AI TTS
- `POST /murf-tts` - Direct Murf AI text-to-speech
- `POST /process-voice-input` - Voice input processing

## Troubleshooting

### Microphone Issues
1. Check browser permissions (click lock icon in address bar)
2. Ensure microphone access is allowed in Windows settings
3. Try the speech recognition test page first

### Murf AI Issues
1. Verify API key is correct
2. Check API key permissions in Murf dashboard
3. Test with the Murf TTS test page

### Server Issues
1. Ensure MySQL is running
2. Check database connection settings
3. Verify all dependencies are installed

## Technologies Used

- **Backend**: Node.js, Express, MySQL
- **AI**: Google Gemini AI
- **TTS**: Murf AI, Web Speech API
- **STT**: Web Speech API
- **Frontend**: HTML, CSS, JavaScript

## License

This project is for educational purposes. 