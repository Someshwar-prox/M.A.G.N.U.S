class ChatManager {
    constructor(app) {
        this.app = app;
        this.contacts = [];
        this.chats = {};
        this.currentChat = null;
        this.typingTimers = new Map();
    }

    init() {
        this.loadData();
        this.setupMessageHandlers();
    }

    loadData() {
        this.contacts = StorageManager.getContacts();
        this.chats = StorageManager.getChats();
    }

    saveData() {
        StorageManager.setContacts(this.contacts);
        StorageManager.setChats(this.chats);
    }

    setupMessageHandlers() {
        // Handle incoming chat messages
        this.app.p2p.onMessage('chat_message', (data) => {
            this.handleIncomingMessage(data);
        });

        // Handle typing indicators
        this.app.p2p.onMessage('typing_start', (data) => {
            this.showTypingIndicator(data.userId, true);
        });

        this.app.p2p.onMessage('typing_stop', (data) => {
            this.showTypingIndicator(data.userId, false);
        });

        // Handle user info exchange
        this.app.p2p.onMessage('user_info', (data) => {
            this.handleUserInfo(data);
        });
    }

    handleIncomingMessage(data) {
        const { senderId, senderName, content, timestamp } = data;
        
        // Find or create contact
        let contact = this.contacts.find(c => c.id === senderId);
        if (!contact) {
            contact = {
                id: senderId,
                name: senderName,
                isOnline: true,
                connectedAt: new Date().toISOString()
            };
            this.contacts.push(contact);
        }

        // Find or create chat
        if (!this.chats[senderId]) {
            this.chats[senderId] = {
                contactId: senderId,
                messages: [],
                unreadCount: 0,
                lastActivity: timestamp
            };
        }

        // Add message
        const message = {
            id: Utils.generateId(),
            sender: senderId,
            content: content,
            timestamp: timestamp,
            type: 'text'
        };

        this.chats[senderId].messages.push(message);
        this.chats[senderId].lastActivity = timestamp;

        // Update UI
        if (this.currentChat && this.currentChat.contactId === senderId) {
            // If chat is open, mark as read and render
            this.chats[senderId].unreadCount = 0;
            this.renderChatMessages();
        } else {
            // Otherwise, increment unread count and show notification
            this.chats[senderId].unreadCount++;
            this.app.showNotification(`New message from ${senderName}`, 'info');
        }

        this.saveData();
        this.renderChatsList();

        // Stop typing indicator if active
        this.showTypingIndicator(senderId, false);
    }

    handleUserInfo(userInfo) {
        const existingContact = this.contacts.find(c => c.id === userInfo.id);
        if (!existingContact) {
            this.contacts.push({
                id: userInfo.id,
                name: userInfo.username,
                phone: userInfo.phone,
                isOnline: true,
                connectedAt: new Date().toISOString()
            });
            this.saveData();
            this.renderChatsList();
            this.app.showNotification(`${userInfo.username} is now connected`, 'success');
        }
    }

    sendMessage(content) {
        if (!this.currentChat || !content.trim()) return false;

        const message = {
            type: 'chat_message',
            senderId: this.app.currentUser.id,
            senderName: this.app.currentUser.username,
            content: content.trim(),
            timestamp: new Date().toISOString()
        };

        // Send via P2P
        const sent = this.app.p2p.sendMessage(message);

        if (sent) {
            // Add to local chat immediately
            if (!this.chats[this.currentChat.contactId]) {
                this.chats[this.currentChat.contactId] = {
                    contactId: this.currentChat.contactId,
                    messages: [],
                    unreadCount: 0,
                    lastActivity: new Date().toISOString()
                };
            }

            this.chats[this.currentChat.contactId].messages.push({
                id: Utils.generateId(),
                sender: this.app.currentUser.id,
                content: content.trim(),
                timestamp: new Date().toISOString(),
                type: 'text'
            });

            this.chats[this.currentChat.contactId].lastActivity = new Date().toISOString();
            this.saveData();
            this.renderChatMessages();
            this.renderChatsList();

            // Stop typing
            this.sendTypingIndicator(false);

            return true;
        }

        return false;
    }

    sendTypingIndicator(isTyping) {
        if (!this.currentChat) return;

        const message = {
            type: isTyping ? 'typing_start' : 'typing_stop',
            userId: this.app.currentUser.id
        };

        this.app.p2p.sendMessage(message);
    }

    showTypingIndicator(userId, show) {
        if (!this.currentChat || this.currentChat.contactId !== userId) return;

        const typingIndicator = document.getElementById('typingIndicator');
        
        if (show) {
            if (!typingIndicator) {
                const indicator = document.createElement('div');
                indicator.id = 'typingIndicator';
                indicator.className = 'typing-indicator';
                indicator.innerHTML = `
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span>typing...</span>
                `;
                document.getElementById('chatMessages').appendChild(indicator);
            }
            typingIndicator.style.display = 'flex';
        } else if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }

        // Auto-scroll to bottom when typing
        if (show) {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    startChat(contact) {
        this.currentChat = { contactId: contact.id, contact: contact };
        
        // Hide welcome screen, show chat interface
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('chatInterface').classList.remove('hidden');
        
        // Update chat header
        document.getElementById('partnerName').textContent = contact.name;
        document.getElementById('partnerStatus').textContent = 'Online';
        document.getElementById('partnerStatus').className = 'partner-status online';
        
        // Initialize chat if new
        if (!this.chats[contact.id]) {
            this.chats[contact.id] = {
                contactId: contact.id,
                messages: [],
                unreadCount: 0,
                lastActivity: new Date().toISOString()
            };
            this.saveData();
        }
        
        // Mark as read
        this.chats[contact.id].unreadCount = 0;
        
        this.renderChatMessages();
        this.renderChatsList();
        this.setupTypingEvents();

        // Share user info
        this.app.p2p.sendMessage({
            type: 'user_info',
            user: this.app.currentUser
        });
    }

    setupTypingEvents() {
        const messageInput = document.getElementById('messageInput');
        let typingTimer;

        const startTyping = () => {
            this.sendTypingIndicator(true);
            
            // Clear existing timer
            clearTimeout(typingTimer);
            
            // Stop typing after 2 seconds of inactivity
            typingTimer = setTimeout(() => {
                this.sendTypingIndicator(false);
            }, 2000);
        };

        messageInput.addEventListener('input', startTyping);
        messageInput.addEventListener('focus', startTyping);
        messageInput.addEventListener('blur', () => {
            this.sendTypingIndicator(false);
            clearTimeout(typingTimer);
        });
    }

    renderChatsList() {
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;

        if (this.contacts.length === 0) {
            chatsList.innerHTML = `
                <div class="no-chats">
                    <p>No conversations yet</p>
                    <p class="subtext">Connect with a friend to start chatting</p>
                </div>
            `;
            return;
        }

        chatsList.innerHTML = '';
        
        this.contacts.forEach(contact => {
            const chat = this.chats[contact.id];
            const lastMessage = chat ? chat.messages[chat.messages.length - 1] : null;
            
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${this.currentChat?.contactId === contact.id ? 'active' : ''}`;
            chatItem.innerHTML = `
                <div class="chat-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="chat-info">
                    <div class="chat-name">${Utils.escapeHtml(contact.name)}</div>
                    <div class="chat-preview">${lastMessage ? Utils.escapeHtml(lastMessage.content) : 'No messages yet'}</div>
                    <div class="chat-status online">Online</div>
                </div>
                <div class="chat-meta">
                    <div class="chat-time">${lastMessage ? Utils.formatTime(lastMessage.timestamp) : ''}</div>
                    ${chat && chat.unreadCount > 0 ? `<div class="unread-badge">${chat.unreadCount}</div>` : ''}
                </div>
            `;
            
            chatItem.addEventListener('click', () => this.startChat(contact));
            chatsList.appendChild(chatItem);
        });
    }

    renderChatMessages() {
        const chatMessages = document.getElementById('chatMessages');
        if (!this.currentChat || !chatMessages) return;

        const chat = this.chats[this.currentChat.contactId];
        
        chatMessages.innerHTML = '';
        
        if (!chat || chat.messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="no-messages">
                    <p>No messages yet</p>
                    <p class="subtext">Send a message to start the conversation</p>
                </div>
            `;
            return;
        }

        chat.messages.forEach(message => {
            const messageDiv = document.createElement('div');
            const isSent = message.sender === this.app.currentUser.id;
            
            messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
            messageDiv.innerHTML = `
                <div class="message-content">${Utils.escapeHtml(message.content)}</div>
                <div class="message-time">${Utils.formatTime(message.timestamp)}</div>
            `;
            
            chatMessages.appendChild(messageDiv);
        });

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addContact(contactInfo) {
        const newContact = {
            id: Utils.generateId(),
            name: contactInfo.name,
            phone: contactInfo.phone,
            isOnline: false,
            addedAt: new Date().toISOString()
        };

        this.contacts.push(newContact);
        this.saveData();
        this.renderChatsList();
        
        return newContact;
    }

    getChat(contactId) {
        return this.chats[contactId];
    }

    getAllChats() {
        return this.chats;
    }

    clearChatHistory(contactId) {
        if (this.chats[contactId]) {
            this.chats[contactId].messages = [];
            this.chats[contactId].unreadCount = 0;
            this.saveData();
            
            if (this.currentChat && this.currentChat.contactId === contactId) {
                this.renderChatMessages();
            }
            this.renderChatsList();
        }
    }
}