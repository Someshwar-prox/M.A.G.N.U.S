class MagnusApp {
    constructor() {
        this.currentUser = null;
        this.p2p = new P2PConnection();
        this.chatManager = new ChatManager(this);
        this.connectionCode = null;
        this.init();
    }

    async init() {
        this.checkAuthentication();
        await this.initializeP2P();
        this.attachEventListeners();
        this.loadUserData();
        this.setupP2PHandlers();
        this.renderConnectionCode();
    }

    checkAuthentication() {
        this.currentUser = StorageManager.getUser();
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        document.getElementById('currentUsername').textContent = this.currentUser.username;
        document.getElementById('settingsUsername').textContent = this.currentUser.username;
        document.getElementById('settingsPhone').textContent = this.currentUser.phone;
    }

    async initializeP2P() {
        const success = await this.p2p.initialize();
        if (success) {
            this.updateConnectionStatus('Ready', 'connected');
        } else {
            this.updateConnectionStatus('Failed', 'disconnected');
        }
    }

    setupP2PHandlers() {
        // Override P2P notification method
        this.p2p.showNotification = (message, type) => {
            this.showNotification(message, type);
        };

        // Handle connection state changes
        this.p2p.onConnectionChange((connected) => {
            this.updateConnectionStatus(
                connected ? 'Connected' : 'Disconnected',
                connected ? 'connected' : 'disconnected'
            );
        });

        // Handle ICE candidates (for advanced P2P connections)
        this.p2p.onICECandidate = (candidate) => {
            // In a full implementation, you'd send this to the other peer
            console.log('ICE candidate:', candidate);
        };
    }

    attachEventListeners() {
        // Connection
        document.getElementById('copyCodeBtn').addEventListener('click', () => this.copyConnectionCode());
        document.getElementById('connectBtn').addEventListener('click', () => this.connectToFriend());
        
        // Chat
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.hideSettings());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Modal backdrop
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideSettings();
            }
        });
    }

    loadUserData() {
        this.connectionCode = StorageManager.getConnectionCode();
        this.chatManager.init();
    }

    renderConnectionCode() {
        if (this.connectionCode) {
            document.getElementById('connectionCode').textContent = this.connectionCode;
            document.getElementById('settingsCode').textContent = this.connectionCode;
        }
    }

    async copyConnectionCode() {
        try {
            await navigator.clipboard.writeText(this.connectionCode);
            this.showNotification('Connection code copied!', 'success');
        } catch (error) {
            console.error('Failed to copy code:', error);
            this.showNotification('Failed to copy code', 'error');
        }
    }

    async connectToFriend() {
        const friendCode = document.getElementById('friendCodeInput').value.trim();
        if (!friendCode) {
            this.showNotification('Please enter a connection code', 'error');
            return;
        }

        try {
            this.updateConnectionStatus('Connecting...', 'connecting');
            
            // For P2P demo, we'll simulate connection
            // In real implementation, you'd exchange WebRTC offers/answers
            
            setTimeout(() => {
                this.updateConnectionStatus('Connected', 'connected');
                this.showNotification('Connected to friend!', 'success');
                
                // Simulate receiving user info
                const simulatedFriend = {
                    id: 'friend_' + Math.random().toString(36).substr(2, 8),
                    name: 'Friend',
                    phone: '0000000000'
                };
                
                this.chatManager.handleUserInfo(simulatedFriend);
                
            }, 2000);

        } catch (error) {
            console.error('Connection failed:', error);
            this.updateConnectionStatus('Failed', 'disconnected');
            this.showNotification('Connection failed', 'error');
        }
    }

    updateConnectionStatus(text, status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = text;
            statusElement.className = `connection-status ${status}`;
        }
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content) return;

        const sent = this.chatManager.sendMessage(content);
        
        if (sent) {
            messageInput.value = '';
        } else {
            this.showNotification('Failed to send message. Check connection.', 'error');
        }
    }

    showSettings() {
        document.getElementById('settingsModal').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    logout() {
        this.p2p.disconnect();
        StorageManager.clearUser();
        window.location.href = 'login.html';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MagnusApp();
});