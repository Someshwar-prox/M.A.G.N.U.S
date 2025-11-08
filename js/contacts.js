class ContactsManager {
    constructor(app) {
        this.app = app;
        this.contacts = [];
        this.init();
    }

    init() {
        this.loadContacts();
    }

    loadContacts() {
        this.contacts = StorageManager.getContacts();
    }

    saveContacts() {
        StorageManager.setContacts(this.contacts);
    }

    addContact(name, phone) {
        const existingContact = this.contacts.find(contact => 
            contact.phone === Utils.formatPhoneNumber(phone)
        );

        if (existingContact) {
            throw new Error('Contact with this phone number already exists');
        }

        const newContact = {
            id: Utils.generateId(),
            name: name.trim(),
            phone: Utils.formatPhoneNumber(phone),
            addedAt: new Date().toISOString(),
            isOnline: false,
            lastSeen: new Date().toISOString()
        };

        this.contacts.push(newContact);
        this.saveContacts();
        return newContact;
    }

    removeContact(contactId) {
        this.contacts = this.contacts.filter(contact => contact.id !== contactId);
        this.saveContacts();
    }

    getContact(contactId) {
        return this.contacts.find(contact => contact.id === contactId);
    }

    searchContacts(searchTerm) {
        return this.contacts.filter(contact =>
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.phone.includes(searchTerm)
        );
    }

    updateContactStatus(contactId, isOnline) {
        const contact = this.getContact(contactId);
        if (contact) {
            contact.isOnline = isOnline;
            contact.lastSeen = new Date().toISOString();
            this.saveContacts();
        }
    }
}