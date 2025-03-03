document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    // Send login data to the server
    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        alert("Login successful!");
        window.location.href = '../index.html';  // Redirect to chat page
    } else {
        const errorData = await response.json();
        alert(errorData.message || 'Login failed');
    }
});