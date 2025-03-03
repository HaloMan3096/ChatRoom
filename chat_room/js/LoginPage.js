document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            document.cookie = `authToken=${data.token}; path=/; Secure; HttpOnly`;
            alert("Login successful!");
            window.location.href = '../index.html';  // Redirect to chat page
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        alert('An error occurred. Try again.');
    }
});

async function getUser() {
    const response = await fetch('/profile', { method: 'GET', credentials: 'include' });
    const data = await response.json();
    if (response.ok) {
        console.log(`User logged in: ${data.username}`);
    } else {
        window.location.href = 'login.html';  // Redirect to login if no user found
    }
}
getUser();