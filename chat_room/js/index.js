function openChat(chatId) {
    window.location.href = `chat.html?cid=${chatId}`;
}

document.addEventListener('DOMContentLoaded', loadUserChats);