/**
 * WebSocket Client for Socket Directory System
 * Handles client-side communication with the WebSocket server
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const chalk = require('chalk');

class SocketDirectoryClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.serverUrl = options.serverUrl || 'ws://localhost:8080';
        this.reconnectInterval = options.reconnectInterval || 5000;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        this.clientId = options.clientId || null;
        
        // Client state
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.heartbeatInterval = null;
        this.currentSocket = null;
        this.joinedRooms = new Set();
        
        // Message types (must match server)
        this.messageTypes = {
            SOCKET_SWITCH: 'socket_switch',
            SOCKET_STATUS: 'socket_status',
            BUSINESS_EVENT: 'business_event',
            CLIENT_JOIN: 'client_join',
            CLIENT_LEAVE: 'client_leave',
            ROOM_JOIN: 'room_join',
            ROOM_LEAVE: 'room_leave',
            BROADCAST: 'broadcast',
            ERROR: 'error',
            HEARTBEAT: 'heartbeat'
        };
        
        console.log(chalk.blue(`🔌 Socket Directory Client initialized for ${this.serverUrl}`));
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log(chalk.yellow(`🔄 Connecting to ${this.serverUrl}...`));
                
                this.ws = new WebSocket(this.serverUrl);
                
                this.ws.on('open', () => {
                    this.handleConnectionOpen();
                    resolve();
                });
                
                this.ws.on('message', (data) => {
                    this.handleMessage(data);
                });
                
                this.ws.on('close', (code, reason) => {
                    this.handleConnectionClose(code, reason);
                });
                
                this.ws.on('error', (error) => {
                    this.handleConnectionError(error);
                    if (!this.connected) {
                        reject(error);
                    }
                });
                
                this.ws.on('ping', () => {
                    this.ws.pong();
                });
                
            } catch (error) {
                console.error(chalk.red('❌ Connection failed:', error.message));
                reject(error);
            }
        });
    }
    
    handleConnectionOpen() {
        this.connected = true;
        this.reconnectAttempts = 0;
        
        console.log(chalk.green('✅ Connected to Socket Directory Server'));
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Emit connected event
        this.emit('connected');
    }
    
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            console.log(chalk.blue(`📨 Received: ${message.type}`));
            
            // Route message based on type
            switch (message.type) {
                case this.messageTypes.SOCKET_STATUS:
                    this.handleSocketStatus(message.data);
                    break;
                    
                case this.messageTypes.SOCKET_SWITCH:
                    this.handleSocketSwitch(message.data);
                    break;
                    
                case this.messageTypes.BUSINESS_EVENT:
                    this.handleBusinessEvent(message.data);
                    break;
                    
                case this.messageTypes.CLIENT_JOIN:
                    this.handleClientJoin(message.data);
                    break;
                    
                case this.messageTypes.CLIENT_LEAVE:
                    this.handleClientLeave(message.data);
                    break;
                    
                case this.messageTypes.ROOM_JOIN:
                    this.handleRoomJoin(message.data);
                    break;
                    
                case this.messageTypes.ROOM_LEAVE:
                    this.handleRoomLeave(message.data);
                    break;
                    
                case this.messageTypes.BROADCAST:
                    this.handleBroadcast(message.data);
                    break;
                    
                case this.messageTypes.ERROR:
                    this.handleError(message.data);
                    break;
                    
                case this.messageTypes.HEARTBEAT:
                    this.handleHeartbeat(message.data);
                    break;
                    
                default:
                    console.warn(chalk.yellow(`⚠️ Unknown message type: ${message.type}`));
            }
            
            // Emit raw message event
            this.emit('message', message);
            
        } catch (error) {
            console.error(chalk.red('❌ Error parsing message:', error.message));
        }
    }
    
    handleSocketStatus(data) {
        this.currentSocket = data.currentSocket;
        this.clientId = data.clientId;
        
        console.log(chalk.cyan(`🔌 Socket status: ${this.currentSocket}`));
        console.log(chalk.gray(`🆔 Client ID: ${this.clientId}`));
        
        this.emit('socket_status', data);
    }
    
    handleSocketSwitch(data) {
        const { from, to, switchedBy, timestamp } = data;
        
        this.currentSocket = to;
        
        console.log(chalk.yellow(`🔄 Socket switched: ${from} → ${to} by ${switchedBy}`));
        
        this.emit('socket_switched', data);
    }
    
    handleBusinessEvent(data) {
        const { eventType, result, eventData } = data;
        
        console.log(chalk.cyan(`🏢 Business event: ${eventType}`));
        
        this.emit('business_event', data);
        this.emit(`business_event:${eventType}`, data);
    }
    
    handleClientJoin(data) {
        const { clientId, room } = data;
        
        console.log(chalk.green(`👋 Client ${clientId} joined room: ${room}`));
        
        this.emit('client_join', data);
    }
    
    handleClientLeave(data) {
        const { clientId, room } = data;
        
        console.log(chalk.yellow(`👋 Client ${clientId} left room: ${room}`));
        
        this.emit('client_leave', data);
    }
    
    handleRoomJoin(data) {
        const { room, members } = data;
        
        this.joinedRooms.add(room);
        
        console.log(chalk.green(`🏠 Joined room: ${room} (${members} members)`));
        
        this.emit('room_joined', data);
    }
    
    handleRoomLeave(data) {
        const { room } = data;
        
        this.joinedRooms.delete(room);
        
        console.log(chalk.yellow(`🚪 Left room: ${room}`));
        
        this.emit('room_left', data);
    }
    
    handleBroadcast(data) {
        const { message, from, timestamp } = data;
        
        console.log(chalk.blue(`📢 Broadcast from ${from}: ${message.substring(0, 50)}...`));
        
        this.emit('broadcast', data);
    }
    
    handleError(data) {
        const { error, timestamp } = data;
        
        console.error(chalk.red(`❌ Server error: ${error}`));
        
        this.emit('error', new Error(error));
    }
    
    handleHeartbeat(data) {
        // Heartbeat received from server
        this.emit('heartbeat', data);
    }
    
    handleConnectionClose(code, reason) {
        this.connected = false;
        
        // Stop heartbeat
        this.stopHeartbeat();
        
        console.log(chalk.gray(`🔌 Connection closed: ${code} - ${reason}`));
        
        this.emit('disconnected', { code, reason });
        
        // Attempt reconnection if not intentionally closed
        if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnection();
        }
    }
    
    handleConnectionError(error) {
        console.error(chalk.red('❌ Connection error:', error.message));
        
        this.emit('connection_error', error);
    }
    
    async attemptReconnection() {
        this.reconnectAttempts++;
        
        console.log(chalk.yellow(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`));
        
        setTimeout(async () => {
            try {
                await this.connect();
                
                // Rejoin rooms after reconnection
                for (const room of this.joinedRooms) {
                    await this.joinRoom(room);
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Reconnection failed:', error.message));
                
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error(chalk.red('❌ Max reconnection attempts reached'));
                    this.emit('max_reconnect_attempts_reached');
                }
            }
        }, this.reconnectInterval);
    }
    
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000); // 30 seconds
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    sendMessage(type, data = {}) {
        if (!this.connected || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(chalk.yellow('⚠️ Cannot send message: not connected'));
            return false;
        }
        
        try {
            const message = {
                type: type,
                data: data,
                timestamp: new Date().toISOString()
            };
            
            this.ws.send(JSON.stringify(message));
            console.log(chalk.blue(`📤 Sent: ${type}`));
            return true;
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to send message:', error.message));
            return false;
        }
    }
    
    // Public API methods
    
    async switchSocket(socketType, options = {}) {
        return this.sendMessage(this.messageTypes.SOCKET_SWITCH, {
            socketType: socketType,
            options: options
        });
    }
    
    async triggerBusinessEvent(eventType, eventData, options = {}) {
        return this.sendMessage(this.messageTypes.BUSINESS_EVENT, {
            eventType: eventType,
            eventData: eventData,
            targetSocket: options.targetSocket,
            broadcastToRoom: options.broadcastToRoom
        });
    }
    
    async joinRoom(roomName) {
        return this.sendMessage(this.messageTypes.ROOM_JOIN, {
            room: roomName
        });
    }
    
    async leaveRoom(roomName) {
        return this.sendMessage(this.messageTypes.ROOM_LEAVE, {
            room: roomName
        });
    }
    
    async broadcast(message, options = {}) {
        return this.sendMessage(this.messageTypes.BROADCAST, {
            message: message,
            targetRoom: options.targetRoom,
            targetSocket: options.targetSocket
        });
    }
    
    sendHeartbeat() {
        return this.sendMessage(this.messageTypes.HEARTBEAT, {
            clientId: this.clientId
        });
    }
    
    // Convenience methods for business events
    
    async bookAppointment(appointmentData) {
        return this.triggerBusinessEvent('appointment_booking', appointmentData, {
            targetSocket: 'dental'
        });
    }
    
    async placeOrder(orderData) {
        return this.triggerBusinessEvent('online_order', orderData, {
            targetSocket: 'pizza'
        });
    }
    
    async registerMember(memberData) {
        return this.triggerBusinessEvent('member_registration', memberData, {
            targetSocket: 'gym'
        });
    }
    
    async registerBusiness(businessData, businessType) {
        const eventTypeMap = {
            'dental': 'dentist_registration',
            'pizza': 'restaurant_registration',
            'gym': 'gym_registration'
        };
        
        const eventType = eventTypeMap[businessType] || 'business_registration';
        
        return this.triggerBusinessEvent(eventType, businessData, {
            targetSocket: businessType
        });
    }
    
    // Utility methods
    
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
    
    getCurrentSocket() {
        return this.currentSocket;
    }
    
    getClientId() {
        return this.clientId;
    }
    
    getJoinedRooms() {
        return Array.from(this.joinedRooms);
    }
    
    async disconnect() {
        console.log(chalk.yellow('🔌 Disconnecting from server...'));
        
        this.stopHeartbeat();
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000, 'Client disconnecting');
        }
        
        this.connected = false;
        
        console.log(chalk.gray('📴 Disconnected from server'));
    }
    
    // Event listener helpers
    
    onSocketSwitch(callback) {
        this.on('socket_switched', callback);
    }
    
    onBusinessEvent(eventType, callback) {
        if (eventType) {
            this.on(`business_event:${eventType}`, callback);
        } else {
            this.on('business_event', callback);
        }
    }
    
    onBroadcast(callback) {
        this.on('broadcast', callback);
    }
    
    onRoomJoin(callback) {
        this.on('room_joined', callback);
    }
    
    onRoomLeave(callback) {
        this.on('room_left', callback);
    }
    
    onConnect(callback) {
        this.on('connected', callback);
    }
    
    onDisconnect(callback) {
        this.on('disconnected', callback);
    }
    
    onError(callback) {
        this.on('error', callback);
    }
}

module.exports = SocketDirectoryClient;