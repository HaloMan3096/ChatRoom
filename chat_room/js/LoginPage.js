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
            // Set the cookie manually without HttpOnly (server should set HttpOnly cookie)
            document.cookie = `authToken=${data.token}; path=/; Secure`;

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

// Function to check if a user is logged in
async function getUser() {
    try {
        const response = await fetch('/profile', { method: 'GET', credentials: 'include' });
        const data = await response.json();
        if (response.ok) {
            console.log(`User logged in: ${data.username}`);
        } else {
            window.location.href = '../html/SignIn.html';  // Redirect to login if no user found
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        window.location.href = '../html/SignIn.html';
    }
}

getUser();  // Check user session on page load
