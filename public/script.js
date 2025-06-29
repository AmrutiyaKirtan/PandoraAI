document.getElementById('sendMessage').addEventListener('click', async () => {
    const userMessage = document.getElementById('userMessage').value;
    const chatParagraph = document.getElementById('chat');

    if (!userMessage) {
        chatParagraph.innerText = 'Please type a message!';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        chatParagraph.innerText = `\nUser: ${userMessage}\nPandora: ${data.text}`;
    } catch (error) {
        console.error('Error:', error);
        chatParagraph.innerText = 'An error occurred while sending the message.';
    }
});
