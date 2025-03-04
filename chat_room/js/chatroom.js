let currentUsername = '';

function openChat(chatId) {
    window.location.href = `../html/Chat.html?cid=${chatId}`;
}

export async function loadUserChats() {
    try {
        const response = await fetch('/get-user-chats', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch chats');

        const chats = await response.json();
        const chatsContainer = document.querySelector('.list-group.chats');

        chatsContainer.innerHTML = ''; // Clear existing chats

        if (chats.length === 0) {
            chatsContainer.innerHTML = '<li class="list-group-item">No chats found.</li>';
            return;
        }

        chats.forEach(chat => {
            const chatElement = document.createElement('li');
            chatElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'chat');

            // Add a `data-chat-id` attribute and event listener instead of `onclick`
            const chatLink = document.createElement('a');
            chatLink.href = "#";
            chatLink.textContent = `Chat ${chat.cid}`;
            chatLink.dataset.chatId = chat.cid;

            chatLink.addEventListener('click', (event) => {
                event.preventDefault();
                openChat(chat.cid);
            });

            chatElement.appendChild(chatLink);
            chatsContainer.appendChild(chatElement);
        });


    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

async function getCurrentUser() {
    try {
        const response = await fetch('/get-user', { credentials: 'include' });
        if (!response.ok) throw new Error('User not found');
        const data = await response.json();
        currentUsername = data.username;
    } catch (error) {
        console.error('Error fetching user:', error);
        window.location.href = '../html/SignIn.html'; // Redirect if not authenticated
    }
}

// Function to check if the user is authenticated and get their conversations
async function loadChat() {
    await getCurrentUser();

    const response = await fetch('/get-user-conversations', {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) {
        window.location.href = '../html/SignIn.html';  // Redirect to login if user is not authenticated
        return;
    }

    const conversations = await response.json();

    if (conversations.length > 0) {
        conversations.forEach(conversation => {
            displayMessages(conversation); // Display all conversations
        });
    } else {
        document.getElementById('message-area').innerHTML = "<p>No conversations found.</p>";
    }
}

// Function to display messages in the chat area
function displayMessages(conversation) {
    const messageArea = document.getElementById('message-area');
    const conversationContainer = document.createElement('div');
    conversationContainer.classList.add('conversation-container');

    messageArea.replaceChildren();

    conversation.messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-container');

        // Check if the message was sent by the logged-in user
        if (message.sender_name === currentUsername) {
            messageElement.classList.add('darker');  // Current user's message styling
            messageElement.innerHTML = `
                <img class="avatar right" src="https://placehold.co/40" alt="avatar" style="width: 100%;">
                <span class="time-left">${message.sender_name} - ${Date(message.created_atnew)}</span>
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
let submitButton = document.getElementById('sendMessageBtn');
if (submitButton) {
    submitButton.addEventListener('click', async () => {
        const messageText = document.getElementById('messageInput').value;
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get('cid'); // Get chat ID from URL

        if (!chatId || !messageText.trim()) {
            alert("Chat ID or message missing.");
            return;
        }

        const response = await fetch('/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message: messageText })
        });

        if (response.ok) {
            loadChat();  // Reload the conversation to include the new message
            document.getElementById('messageInput').value = '';  // Clear the input field
        } else {
            const errorData = await response.json();
            console.error("Server error:", errorData);
            alert("Failed to send message: " + (errorData.error || "Unknown error"));
        }
    });
}


document.addEventListener("DOMContentLoaded", () => {
    loadChat();
});
