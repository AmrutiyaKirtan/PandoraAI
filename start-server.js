const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting Pandora AI Assistant server...');
console.log('This script will start the server and provide instructions for accessing the chat interface.');

// Start the server
const server = spawn('node', ['gemini_Modified.js'], {
    stdio: 'inherit',
    shell: true
});

// Handle server events
server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

server.on('close', (code) => {
    if (code !== 0) {
        console.error(`Server process exited with code ${code}`);
    }
});

// Wait for the server to start and the port file to be created
const checkPortFile = () => {
    try {
        if (fs.existsSync('server_port.txt')) {
            const port = fs.readFileSync('server_port.txt', 'utf8').trim();
            console.log('\n==================================================');
            console.log(`Server is running on port ${port}`);
            console.log('To access the chat interface, open:');
            console.log(`http://localhost:${port}/index2.html`);
            console.log('==================================================\n');
            return true;
        }
    } catch (err) {
        // Ignore errors
    }
    return false;
};

// Check for the port file every second
const interval = setInterval(() => {
    if (checkPortFile()) {
        clearInterval(interval);
    }
}, 1000);

// Stop checking after 10 seconds
setTimeout(() => {
    clearInterval(interval);
    if (!checkPortFile()) {
        console.log('Server may have started on a different port.');
        console.log('Please check the console output for the correct port.');
    }
}, 10000); 