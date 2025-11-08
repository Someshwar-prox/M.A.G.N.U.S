class P2PConnection {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.connectedUsers = new Map();
        this.isConnected = false;
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.messageHandlers = new Map();
        this.connectionCallbacks = [];
    }

    async initialize() {
        try {
            this.peerConnection = new RTCPeerConnection(this.iceServers);
            
            // Handle incoming data channels
            this.peerConnection.ondatachannel = (event) => {
                console.log('Incoming data channel');
                this.setupDataChannel(event.channel);
            };

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('New ICE candidate');
                    this.onICECandidate(event.candidate);
                }
            };

            // Handle connection state changes
            this.peerConnection.onconnectionstatechange = () => {
                const state = this.peerConnection.connectionState;
                console.log('Connection state:', state);
                
                this.isConnected = state === 'connected';
                this.notifyConnectionState(this.isConnected);
                
                if (state === 'connected') {
                    this.showNotification('Connected to friend!', 'success');
                } else if (state === 'disconnected' || state === 'failed') {
                    this.showNotification('Connection lost', 'error');
                }
            };

            // Handle signaling state
            this.peerConnection.onsignalingstatechange = () => {
                console.log('Signaling state:', this.peerConnection.signalingState);
            };

            console.log('P2P connection initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize P2P:', error);
            this.showNotification('Failed to initialize connection', 'error');
            return false;
        }
    }

    setupDataChannel(channel) {
        this.dataChannel = channel;
        
        channel.onopen = () => {
            console.log('Data channel opened');
            this.isConnected = true;
            this.notifyConnectionState(true);
            this.showNotification('Data channel ready!', 'success');
        };

        channel.onclose = () => {
            console.log('Data channel closed');
            this.isConnected = false;
            this.notifyConnectionState(false);
        };

        channel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('Received message:', message);
                this.handleIncomingMessage(message);
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        };

        channel.onerror = (error) => {
            console.error('Data channel error:', error);
        };
    }

    async createOffer() {
        try {
            // Create data channel for sending messages
            this.dataChannel = this.peerConnection.createDataChannel('messaging', {
                ordered: true,
                reliable: true
            });
            
            this.setupDataChannel(this.dataChannel);

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            console.log('Offer created');
            return offer;
        } catch (error) {
            console.error('Failed to create offer:', error);
            throw error;
        }
    }

    async handleOffer(offer) {
        try {
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            console.log('Answer created');
            return answer;
        } catch (error) {
            console.error('Failed to handle offer:', error);
            throw error;
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(answer);
            console.log('Answer handled successfully');
        } catch (error) {
            console.error('Failed to handle answer:', error);
            throw error;
        }
    }

    async handleICECandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
            console.log('ICE candidate added');
        } catch (error) {
            console.error('Failed to handle ICE candidate:', error);
        }
    }

    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try {
                this.dataChannel.send(JSON.stringify(message));
                console.log('Message sent:', message);
                return true;
            } catch (error) {
                console.error('Failed to send message:', error);
                return false;
            }
        } else {
            console.warn('Data channel not ready');
            return false;
        }
    }

    handleIncomingMessage(message) {
        const { type, data } = message;
        
        // Call registered handlers for this message type
        if (this.messageHandlers.has(type)) {
            this.messageHandlers.get(type).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Error in message handler:', error);
                }
            });
        }
    }

    onMessage(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type).push(handler);
    }

    onConnectionChange(callback) {
        this.connectionCallbacks.push(callback);
    }

    notifyConnectionState(connected) {
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(connected);
            } catch (error) {
                console.error('Error in connection callback:', error);
            }
        });
    }

    onICECandidate(candidate) {
        // Override this in main app to handle ICE candidates
        console.log('ICE candidate generated:', candidate);
    }

    showNotification(message, type) {
        // Override this in main app
        console.log(`Notification [${type}]:`, message);
    }

    disconnect() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.isConnected = false;
        this.notifyConnectionState(false);
        console.log('P2P connection disconnected');
    }

    // Helper method to convert between connection codes and offers/answers
    static encodeConnectionData(data) {
        return btoa(JSON.stringify(data));
    }

    static decodeConnectionData(encodedData) {
        try {
            return JSON.parse(atob(encodedData));
        } catch (error) {
            throw new Error('Invalid connection data');
        }
    }
}