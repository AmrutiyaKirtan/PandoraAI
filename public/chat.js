let isProcessing = false;

// Ignore WebSocket errors from development tools
window.addEventListener('error', (event) => {
    if (event.message.includes('WebSocket')) {
        event.preventDefault();
        console.log('Ignoring WebSocket connection error from development tools');
    }
}, true);

async function getServerPort() {
    try {
        const response = await fetch('/server_port.txt');
        if (!response.ok) {
            throw new Error('Failed to fetch port file');
        }
        const port = await response.text();
        return port.trim();
    } catch (error) {
        console.error('Error getting server port:', error);
        // Try common ports as fallback
        const commonPorts = [3000, 3001, 3002, 3003];
        for (const port of commonPorts) {
            try {
                const testResponse = await fetch(`http://localhost:${port}/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'test' })
                });
                if (testResponse.ok) {
                    console.log(`Found working port: ${port}`);
                    return port.toString();
                }
            } catch (e) {
                continue;
            }
        }
        throw new Error('Could not find active server port');
    }
}

async function handleSubmit() {
    if (isProcessing) return;

    const userMessageInput = document.getElementById('userMessage');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');

    const message = userMessageInput.value.trim();
    if (!message) return;

    isProcessing = true;
    sendButton.disabled = true;

    // Add user message to chat
    addMessage(message, true);

    // Clear input and reset height
    userMessageInput.value = '';
    userMessageInput.style.height = '55px';

    // Show loading indicator
    addLoadingIndicator();

    try {
        // Get the current server port
        const port = await getServerPort();
        console.log(`Sending message to port ${port}...`);

        const response = await fetch(`http://localhost:${port}/message`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ message: message }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Remove loading indicator before adding the response
        removeLoadingIndicator();

        // Add bot response
        addMessage(data.text, false);
    } catch (error) {
        console.error('Error:', error);
        removeLoadingIndicator();
        
        // Provide more specific error messages
        let errorMessage = 'I apologize, but I encountered an error. Please try again.';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Unable to connect to the server. Please make sure the server is running.';
        } else if (error.message.includes('Server error')) {
            errorMessage = 'The server encountered an error. Please try again later.';
        }
        
        addMessage(errorMessage, false);
    } finally {
        isProcessing = false;
        sendButton.disabled = false;
    }
}

function addMessage(message, isUser) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLoadingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.className = 'message bot-message loading';
    loadingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

// Auto-resize textarea
document.getElementById('userMessage').addEventListener('input', function() {
    this.style.height = '55px';
    this.style.height = (this.scrollHeight) + 'px';
});

// Handle Enter key
document.getElementById('userMessage').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
}); 