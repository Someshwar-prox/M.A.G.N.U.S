class Utils {
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    static formatPhoneNumber(phone) {
        return phone.replace(/\D/g, '');
    }

    static validatePhone(phone) {
        const cleaned = this.formatPhoneNumber(phone);
        return cleaned.length === 10 && /^\d+$/.test(cleaned);
    }

    static validateUsername(username) {
        return username.length >= 2 && username.length <= 20 && /^[a-zA-Z0-9_ ]+$/.test(username);
    }

    static formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static generateConnectionCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

class StorageManager {
    static setUser(user) {
        localStorage.setItem('magnus_user', JSON.stringify(user));
    }

    static getUser() {
        const user = localStorage.getItem('magnus_user');
        return user ? JSON.parse(user) : null;
    }

    static clearUser() {
        localStorage.removeItem('magnus_user');
    }

    static setContacts(contacts) {
        localStorage.setItem('magnus_contacts', JSON.stringify(contacts));
    }

    static getContacts() {
        const contacts = localStorage.getItem('magnus_contacts');
        return contacts ? JSON.parse(contacts) : [];
    }

    static setChats(chats) {
        localStorage.setItem('magnus_chats', JSON.stringify(chats));
    }

    static getChats() {
        const chats = localStorage.getItem('magnus_chats');
        return chats ? JSON.parse(chats) : {};
    }

    static setConnectionCode(code) {
        localStorage.setItem('magnus_connection_code', code);
    }

    static getConnectionCode() {
        return localStorage.getItem('magnus_connection_code');
    }
}