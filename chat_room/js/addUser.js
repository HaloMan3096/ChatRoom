document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        const requestData = { username, email, password };

        try {
            const response = await fetch("/create-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                alert("Account created successfully! Redirecting to login...");
                window.location.href = "../html/login.html";
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to create account.");
            }
        } catch (error) {
            console.error("Error creating account:", error);
            alert("An error occurred. Please try again later.");
        }
    });
});