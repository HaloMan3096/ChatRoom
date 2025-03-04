document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const otherUser = document.getElementById("otherUser").value.trim();
        const message = document.getElementById("message").value.trim();

        if (!otherUser || !message) {
            alert("Both fields are required.");
            return;
        }

        try {
            const response = await fetch("/create-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otherUsername: otherUser, message })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Chat created! Redirecting...");
                window.location.href = `/chat.html?cid=${data.chatId}`;
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("Error:", error);
        }
    });
});