function openChat(chatId) {
    console.log("Going to chat #" + chatId);
    window.location.href = `chat.html?cid=${chatId}`;
}

document.addEventListener('DOMContentLoaded', loadUserChats);