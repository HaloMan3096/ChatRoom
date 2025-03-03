// Function to check if the user is authenticated and get their conversations
async function loadChat() {
    const response = await fetch('/get-user-conversations', {
        method: 'GET',
        credentials: 'same-origin' // This ensures cookies are sent with the request
    });

    if (!response.ok) {
        window.location.href = '/login';  // Redirect to login if user is not authenticated
        return;
    }

    const conversations = await response.json();

    if (conversations.length > 0) {
        conversations.forEach(conversation => {
            displayMessages(conversation); // Display all conversations
        });
    } else {
        document.getElementById('messageArea').innerHTML = "<p>No conversations found.</p>";
    }
}

// Function to display messages in the chat area
function displayMessages(conversation) {
    const messageArea = document.getElementById('messageArea');
    const conversationContainer = document.createElement('div');
    conversationContainer.classList.add('conversation-container');
    conversationContainer.innerHTML = `<h4>Conversation ID: ${conversation.cid}</h4>`;

    conversation.messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-container');

        // Check if the message was sent by the logged-in user
        if (message.sender_name === 'CurrentUserName') {
            messageElement.classList.add('darker');  // Current user's message styling
            messageElement.innerHTML = `
                <img class="avatar right" src="https://placehold.co/40" alt="avatar" style="width: 100%;">
                <span class="time-left">${message.sender_name} - ${message.created_at}</span>
                <span class="bubble6 time-left msg-right">${message.line_text}</span>
            `;
        } else {
            messageElement.innerHTML = `
                <img class="avatar" src="https://placehold.co/40" alt="avatar" style="width: 100%;">
                <span class="time-right">${message.sender_name} - ${message.created_at}</span>
                <span class="bubble6 time-left msg-left">${message.line_text}</span>
            `;
        }

        conversationContainer.appendChild(messageElement);
    });

    messageArea.appendChild(conversationContainer);  // Append each conversation's messages
}

// Send a new message
document.getElementById('sendMessageBtn').addEventListener('click', async () => {
    const messageText = document.getElementById('messageInput').value;
    const response = await fetch('/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
    });

    if (response.ok) {
        loadChat();  // Reload the conversation to include the new message
        document.getElementById('messageInput').value = '';  // Clear the input field
    } else {
        alert("Failed to send message.");
    }
});

// Load the user's chat when the page loads
loadChat();