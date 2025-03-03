document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password }), // Sending `email` instead of `username`
            credentials: 'include'  // Important to send cookies!
        });

        const data = await response.json();
        console.log('Server Response:', data);

        if (response.ok) {
            alert("Login successful!");
            window.location.href = '../index.html';
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        alert('An error occurred. Try again.');
    }
});
