let currentUsername = '';
let otherUsername = '';

function getQueryParam(param) {
    return new URLSearchParams(window.location.search).get(param);
}

// Open a chat by navigating to its page with cid
function openChat(chatId) {
    window.location.href = `../html/Chat.html?cid=${chatId}`;
}

// Load user chats and display them
export async function loadUserChats() {
    try {
        const response = await fetch('/get-user-chats', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch chats');

        const chats = await response.json();
        const chatsContainer = document.querySelector('.list-group.chats');

        console.log(chats);

        if (chats.length === 0) {
            chatsContainer.innerHTML = '<li class="list-group-item">No chats found.</li>';
            return;
        }

        chats.forEach(chat => {
            const chatElement = document.createElement('li');
            chatElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'chat');

            const chatLink = document.createElement('a');
            chatLink.href = "#";
            chatLink.textContent = `${chat.chat_name} ${chat.cid}`;
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

// Get the currently logged-in user
export async function getCurrentUser() {
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

// Load a specific chat when the page loads
async function loadChat() {
    await getCurrentUser(); // Ensure we know the logged-in user

    const chatId = getQueryParam('cid');
    if (!chatId) {
        return;
    }

    try {
        const response = await fetch(`/get-chat-messages?cid=${chatId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            window.location.href = '../html/SignIn.html';  // Redirect if user is not authenticated
            return;
        }

        const conversation = await response.json();
        if (conversation.length > 0) {
            displayMessages(conversation);
        } else {
            document.getElementById('message-area').innerHTML = "<p>No messages yet. Say hi!</p>";
        }
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

// Format timestamps nicely
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const formatter = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    return formatter.format(date);
}

// Display messages in the chat area
function displayMessages(conversation) {
    const messageArea = document.getElementById('message-area');
    messageArea.innerHTML = ''; // Clear existing messages

    // Get otherUsername only once (assuming all messages are between two users)
    const firstMessage = conversation[0];
    if (firstMessage.sender_name !== currentUsername) {
        otherUsername = firstMessage.sender_name;
    }

    conversation.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-container');

        if (message.sender_name === currentUsername) {
            messageElement.classList.add('darker');
            messageElement.innerHTML = `
                <img class="avatar right" src="https://placehold.co/40" alt="avatar" style="width: 100%;">
                <span class="time-left">${message.sender_name} - ${formatTimestamp(message.created_at)}</span>
                <span class="bubble6 time-left msg-right">${message.line_text}</span>
            `;
        } else {
            messageElement.innerHTML = `
                <img class="avatar" src="https://placehold.co/40" alt="avatar" style="width: 100%;">
                <span class="time-right">${message.sender_name} - ${formatTimestamp(message.created_at)}</span>
                <span class="bubble6 time-left msg-left">${message.line_text}</span>
            `;
        }

        messageArea.appendChild(messageElement);
    });
}

// Send a new message
document.addEventListener("DOMContentLoaded", () => {
    loadChat();

    let submitButton = document.getElementById('sendMessageBtn');
    if (submitButton) {
        submitButton.addEventListener('click', async () => {
            const chatId = getQueryParam('cid');
            const messageText = document.getElementById('messageInput').value.trim();

            if (!messageText) {
                alert("Message cannot be empty.");
                return;
            }

            if (!chatId) {
                alert("Missing chat ID.");
                return;
            }

            try {
                const response = await fetch('http://18.224.123.254:3000/send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ otherUsername, chatId, message: messageText })
                });

                if (response.ok) {
                    loadChat();  // Refresh chat messages
                    document.getElementById('messageInput').value = '';  // Clear input field
                } else {
                    console.error("Failed to send message.");
                }
            } catch (error) {
                console.error("Error:", error);
            }
        });
    }
});
