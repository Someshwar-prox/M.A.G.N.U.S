class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkExistingUser();
        this.attachEventListeners();
    }

    checkExistingUser() {
        this.currentUser = StorageManager.getUser();
        if (this.currentUser) {
            window.location.href = 'app.html';
        }
    }

    attachEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const usernameInput = document.getElementById('username');
        const phoneInput = document.getElementById('phone');

        if (usernameInput) {
            usernameInput.addEventListener('input', Utils.debounce(() => {
                this.validateField('username', usernameInput.value);
            }, 300));
        }

        if (phoneInput) {
            phoneInput.addEventListener('input', Utils.debounce(() => {
                this.validateField('phone', phoneInput.value);
            }, 300));
        }
    }

    validateField(field, value) {
        let isValid = false;
        let message = '';

        switch (field) {
            case 'username':
                isValid = Utils.validateUsername(value);
                message = isValid ? '' : 'Username must be 2-20 characters (letters, numbers, spaces, underscores)';
                break;
            case 'phone':
                isValid = Utils.validatePhone(value);
                message = isValid ? '' : 'Please enter a valid 10-digit phone number';
                break;
        }

        this.showFieldValidation(field, isValid, message);
        return isValid;
    }

    showFieldValidation(field, isValid, message) {
        const input = document.getElementById(field);
        const existingMessage = document.getElementById(`${field}-error`);

        if (existingMessage) {
            existingMessage.remove();
        }

        if (!isValid && message) {
            const errorDiv = document.createElement('div');
            errorDiv.id = `${field}-error`;
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            input.parentNode.parentNode.appendChild(errorDiv);
        }

        input.style.borderColor = isValid ? '#4CAF50' : (input.value ? '#f44336' : '#e1e5e9');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const phone = document.getElementById('phone').value;

        const isUsernameValid = this.validateField('username', username);
        const isPhoneValid = this.validateField('phone', phone);

        if (!isUsernameValid || !isPhoneValid) {
            this.showMessage('Please fix the errors above', 'error');
            return;
        }

        try {
            const user = {
                id: Utils.generateId(),
                username: username,
                phone: Utils.formatPhoneNumber(phone),
                createdAt: new Date().toISOString(),
                connectionCode: Utils.generateConnectionCode()
            };

            StorageManager.setUser(user);
            StorageManager.setConnectionCode(user.connectionCode);

            this.showMessage('Login successful! Redirecting...', 'success');

            setTimeout(() => {
                window.location.href = 'app.html';
            }, 1000);

        } catch (error) {
            this.showMessage('Login failed. Please try again.', 'error');
            console.error('Login error:', error);
        }
    }

    showMessage(message, type) {
        const existingMessage = document.querySelector('.message-container');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message-container ${type}-message`;
        messageDiv.textContent = message;

        const form = document.getElementById('loginForm');
        form.insertBefore(messageDiv, form.firstChild);

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    logout() {
        StorageManager.clearUser();
        window.location.href = 'login.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});