/**
 * WebSocket Server for Socket Directory System
 * Handles real-time communication between clients, socket switching, and business events
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;

class SocketDirectoryServer extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.port = options.port || 8080;
        this.host = options.host || 'localhost';
        
        // Server state
        this.wss = null;
        this.clients = new Map();
        this.rooms = new Map();
        this.sockets = new Map();
        this.currentSocket = 'dental';
        
        // Message types
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
        
        // Load socket configurations
        this.loadSocketConfigurations();
        
        console.log(chalk.blue('🚀 Socket Directory Server initializing...'));
    }
    
    async start() {
        try {
            // Create WebSocket server
            this.wss = new WebSocket.Server({
                port: this.port,
                host: this.host
            });
            
            // Setup server event handlers
            this.setupServerHandlers();
            
            console.log(chalk.green(`✅ WebSocket server started on ws://${this.host}:${this.port}`));
            console.log(chalk.yellow(`🔌 Current socket: ${this.currentSocket}`));
            
            // Emit server started event
            this.emit('server_started', {
                host: this.host,
                port: this.port,
                currentSocket: this.currentSocket
            });
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to start WebSocket server:', error.message));
            throw error;
        }
    }
    
    setupServerHandlers() {
        this.wss.on('connection', (ws, request) => {
            this.handleClientConnection(ws, request);
        });
        
        this.wss.on('error', (error) => {
            console.error(chalk.red('❌ WebSocket server error:', error.message));
            this.emit('server_error', error);
        });
        
        // Heartbeat interval to keep connections alive
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000); // 30 seconds
    }
    
    handleClientConnection(ws, request) {
        const clientId = this.generateClientId();
        const clientInfo = {
            id: clientId,
            ws: ws,
            ip: request.socket.remoteAddress,
            userAgent: request.headers['user-agent'],
            connectedAt: new Date(),
            lastHeartbeat: new Date(),
            rooms: new Set(),
            socketType: this.currentSocket
        };
        
        // Store client
        this.clients.set(clientId, clientInfo);
        
        console.log(chalk.cyan(`🔗 Client connected: ${clientId} from ${clientInfo.ip}`));
        
        // Send welcome message with current socket status
        this.sendToClient(clientId, {
            type: this.messageTypes.SOCKET_STATUS,
            data: {
                currentSocket: this.currentSocket,
                availableSockets: Array.from(this.sockets.keys()),
                clientId: clientId,
                serverTime: new Date().toISOString()
            }
        });
        
        // Setup client event handlers
        this.setupClientHandlers(ws, clientId);
        
        // Emit client connected event
        this.emit('client_connected', clientInfo);
    }
    
    setupClientHandlers(ws, clientId) {
        ws.on('message', (data) => {
            this.handleClientMessage(clientId, data);
        });
        
        ws.on('close', (code, reason) => {
            this.handleClientDisconnection(clientId, code, reason);
        });
        
        ws.on('error', (error) => {
            console.error(chalk.red(`❌ Client ${clientId} error:`, error.message));
            this.handleClientError(clientId, error);
        });
        
        ws.on('pong', () => {
            // Update heartbeat timestamp
            const client = this.clients.get(clientId);
            if (client) {
                client.lastHeartbeat = new Date();
            }
        });
    }
    
    handleClientMessage(clientId, data) {
        try {
            const message = JSON.parse(data);
            const client = this.clients.get(clientId);
            
            if (!client) {
                console.warn(chalk.yellow(`⚠️ Message from unknown client: ${clientId}`));
                return;
            }
            
            console.log(chalk.blue(`📨 Message from ${clientId}: ${message.type}`));
            
            // Route message based on type
            switch (message.type) {
                case this.messageTypes.SOCKET_SWITCH:
                    this.handleSocketSwitch(clientId, message.data);
                    break;
                    
                case this.messageTypes.BUSINESS_EVENT:
                    this.handleBusinessEvent(clientId, message.data);
                    break;
                    
                case this.messageTypes.ROOM_JOIN:
                    this.handleRoomJoin(clientId, message.data.room);
                    break;
                    
                case this.messageTypes.ROOM_LEAVE:
                    this.handleRoomLeave(clientId, message.data.room);
                    break;
                    
                case this.messageTypes.BROADCAST:
                    this.handleBroadcast(clientId, message.data);
                    break;
                    
                case this.messageTypes.HEARTBEAT:
                    this.handleHeartbeat(clientId);
                    break;
                    
                default:
                    console.warn(chalk.yellow(`⚠️ Unknown message type: ${message.type}`));
                    this.sendError(clientId, `Unknown message type: ${message.type}`);
            }
            
        } catch (error) {
            console.error(chalk.red(`❌ Error parsing message from ${clientId}:`, error.message));
            this.sendError(clientId, 'Invalid message format');
        }
    }
    
    async handleSocketSwitch(clientId, data) {
        const { socketType, options = {} } = data;
        
        console.log(chalk.yellow(`🔄 Socket switch request from ${clientId}: ${this.currentSocket} → ${socketType}`));
        
        // Validate socket type
        if (!this.sockets.has(socketType)) {
            this.sendError(clientId, `Invalid socket type: ${socketType}`);
            return;
        }
        
        // Check if already on this socket
        if (this.currentSocket === socketType) {
            this.sendToClient(clientId, {
                type: this.messageTypes.SOCKET_STATUS,
                data: {
                    message: `Already on ${socketType} socket`,
                    currentSocket: this.currentSocket
                }
            });
            return;
        }
        
        try {
            // Perform socket switch
            const oldSocket = this.currentSocket;
            await this.switchSocket(socketType, options);
            
            // Notify all clients about the switch
            this.broadcastToAll({
                type: this.messageTypes.SOCKET_SWITCH,
                data: {
                    from: oldSocket,
                    to: socketType,
                    switchedBy: clientId,
                    timestamp: new Date().toISOString(),
                    options: options
                }
            });
            
            console.log(chalk.green(`✅ Socket switched: ${oldSocket} → ${socketType}`));
            
        } catch (error) {
            console.error(chalk.red(`❌ Socket switch failed:`, error.message));
            this.sendError(clientId, `Socket switch failed: ${error.message}`);
        }
    }
    
    async switchSocket(socketType, options = {}) {
        // Load the socket if not already loaded
        if (!this.sockets.has(socketType)) {
            await this.loadSocket(socketType);
        }
        
        // Get socket instances
        const oldSocket = this.sockets.get(this.currentSocket);
        const newSocket = this.sockets.get(socketType);
        
        // Deactivate current socket
        if (oldSocket && typeof oldSocket.deactivate === 'function') {
            await oldSocket.deactivate();
        }
        
        // Switch to new socket
        this.currentSocket = socketType;
        
        // Activate new socket
        if (newSocket && typeof newSocket.activate === 'function') {
            await newSocket.activate(options);
        }
        
        // Update all client socket types
        this.clients.forEach(client => {
            client.socketType = socketType;
        });
        
        // Emit socket switched event
        this.emit('socket_switched', {
            from: oldSocket?.businessType,
            to: newSocket?.businessType,
            options: options
        });
    }
    
    handleBusinessEvent(clientId, data) {
        const { eventType, eventData, targetSocket } = data;
        
        console.log(chalk.cyan(`🏢 Business event from ${clientId}: ${eventType}`));
        
        // Validate target socket
        const socket = targetSocket ? this.sockets.get(targetSocket) : this.sockets.get(this.currentSocket);
        
        if (!socket) {
            this.sendError(clientId, `Socket not found: ${targetSocket || this.currentSocket}`);
            return;
        }
        
        // Process business event
        if (typeof socket.handleEvent === 'function') {
            socket.handleEvent({
                type: eventType,
                data: eventData,
                clientId: clientId
            }).then(result => {
                // Send result back to client
                this.sendToClient(clientId, {
                    type: this.messageTypes.BUSINESS_EVENT,
                    data: {
                        eventType: eventType,
                        result: result,
                        timestamp: new Date().toISOString()
                    }
                });
                
                // Broadcast event to relevant room if specified
                if (data.broadcastToRoom) {
                    this.broadcastToRoom(data.broadcastToRoom, {
                        type: this.messageTypes.BUSINESS_EVENT,
                        data: {
                            eventType: eventType,
                            eventData: eventData,
                            from: clientId,
                            timestamp: new Date().toISOString()
                        }
                    });
                }
                
            }).catch(error => {
                console.error(chalk.red(`❌ Business event error:`, error.message));
                this.sendError(clientId, `Business event failed: ${error.message}`);
            });
        } else {
            this.sendError(clientId, 'Socket does not support events');
        }
    }
    
    handleRoomJoin(clientId, roomName) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        // Create room if it doesn't exist
        if (!this.rooms.has(roomName)) {
            this.rooms.set(roomName, new Set());
        }
        
        // Add client to room
        this.rooms.get(roomName).add(clientId);
        client.rooms.add(roomName);
        
        console.log(chalk.green(`🏠 Client ${clientId} joined room: ${roomName}`));
        
        // Notify client
        this.sendToClient(clientId, {
            type: this.messageTypes.ROOM_JOIN,
            data: {
                room: roomName,
                members: this.rooms.get(roomName).size
            }
        });
        
        // Notify other room members
        this.broadcastToRoom(roomName, {
            type: this.messageTypes.CLIENT_JOIN,
            data: {
                clientId: clientId,
                room: roomName
            }
        }, [clientId]);
    }
    
    handleRoomLeave(clientId, roomName) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        // Remove client from room
        if (this.rooms.has(roomName)) {
            this.rooms.get(roomName).delete(clientId);
            
            // Remove empty rooms
            if (this.rooms.get(roomName).size === 0) {
                this.rooms.delete(roomName);
            }
        }
        
        client.rooms.delete(roomName);
        
        console.log(chalk.yellow(`🚪 Client ${clientId} left room: ${roomName}`));
        
        // Notify client
        this.sendToClient(clientId, {
            type: this.messageTypes.ROOM_LEAVE,
            data: {
                room: roomName
            }
        });
        
        // Notify other room members
        if (this.rooms.has(roomName)) {
            this.broadcastToRoom(roomName, {
                type: this.messageTypes.CLIENT_LEAVE,
                data: {
                    clientId: clientId,
                    room: roomName
                }
            });
        }
    }
    
    handleBroadcast(clientId, data) {
        const { message, targetRoom, targetSocket } = data;
        
        if (targetRoom) {
            this.broadcastToRoom(targetRoom, {
                type: this.messageTypes.BROADCAST,
                data: {
                    message: message,
                    from: clientId,
                    timestamp: new Date().toISOString()
                }
            }, [clientId]);
        } else if (targetSocket) {
            this.broadcastToSocket(targetSocket, {
                type: this.messageTypes.BROADCAST,
                data: {
                    message: message,
                    from: clientId,
                    timestamp: new Date().toISOString()
                }
            }, [clientId]);
        } else {
            this.broadcastToAll({
                type: this.messageTypes.BROADCAST,
                data: {
                    message: message,
                    from: clientId,
                    timestamp: new Date().toISOString()
                }
            }, [clientId]);
        }
        
        console.log(chalk.blue(`📢 Broadcast from ${clientId}: ${message.substring(0, 50)}...`));
    }
    
    handleHeartbeat(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastHeartbeat = new Date();
            
            // Send heartbeat response
            this.sendToClient(clientId, {
                type: this.messageTypes.HEARTBEAT,
                data: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    }
    
    handleClientDisconnection(clientId, code, reason) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        console.log(chalk.gray(`🔌 Client disconnected: ${clientId} (${code})`));
        
        // Remove client from all rooms
        client.rooms.forEach(roomName => {
            this.handleRoomLeave(clientId, roomName);
        });
        
        // Remove client from clients map
        this.clients.delete(clientId);
        
        // Emit client disconnected event
        this.emit('client_disconnected', {
            clientId: clientId,
            code: code,
            reason: reason
        });
    }
    
    handleClientError(clientId, error) {
        console.error(chalk.red(`❌ Client ${clientId} error:`, error.message));
        
        // Send error to client if connection is still open
        this.sendError(clientId, `Connection error: ${error.message}`);
        
        // Emit client error event
        this.emit('client_error', {
            clientId: clientId,
            error: error
        });
    }
    
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error(chalk.red(`❌ Failed to send message to ${clientId}:`, error.message));
            }
        }
    }
    
    sendError(clientId, errorMessage) {
        this.sendToClient(clientId, {
            type: this.messageTypes.ERROR,
            data: {
                error: errorMessage,
                timestamp: new Date().toISOString()
            }
        });
    }
    
    broadcastToAll(message, excludeClients = []) {
        this.clients.forEach((client, clientId) => {
            if (!excludeClients.includes(clientId) && client.ws.readyState === WebSocket.OPEN) {
                this.sendToClient(clientId, message);
            }
        });
    }
    
    broadcastToRoom(roomName, message, excludeClients = []) {
        const room = this.rooms.get(roomName);
        if (room) {
            room.forEach(clientId => {
                if (!excludeClients.includes(clientId)) {
                    this.sendToClient(clientId, message);
                }
            });
        }
    }
    
    broadcastToSocket(socketType, message, excludeClients = []) {
        this.clients.forEach((client, clientId) => {
            if (client.socketType === socketType && !excludeClients.includes(clientId)) {
                this.sendToClient(clientId, message);
            }
        });
    }
    
    sendHeartbeat() {
        const heartbeatMessage = {
            type: this.messageTypes.HEARTBEAT,
            data: {
                timestamp: new Date().toISOString(),
                serverUptime: process.uptime()
            }
        };
        
        // Send ping to all clients
        this.clients.forEach((client, clientId) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                try {
                    client.ws.ping();
                } catch (error) {
                    console.error(chalk.red(`❌ Failed to ping client ${clientId}:`, error.message));
                }
            }
        });
        
        // Clean up dead connections
        this.cleanupDeadConnections();
    }
    
    cleanupDeadConnections() {
        const now = new Date();
        const timeout = 60000; // 1 minute timeout
        
        this.clients.forEach((client, clientId) => {
            const timeSinceLastHeartbeat = now - client.lastHeartbeat;
            
            if (timeSinceLastHeartbeat > timeout) {
                console.log(chalk.yellow(`🧹 Cleaning up dead connection: ${clientId}`));
                
                try {
                    client.ws.terminate();
                } catch (error) {
                    // Connection already closed
                }
                
                this.handleClientDisconnection(clientId, 1001, 'Heartbeat timeout');
            }
        });
    }
    
    async loadSocketConfigurations() {
        try {
            const socketsDir = path.join(__dirname, '..', 'sockets');
            const socketDirs = await fs.readdir(socketsDir);
            
            for (const socketDir of socketDirs) {
                const socketPath = path.join(socketsDir, socketDir, 'index.js');
                
                try {
                    await fs.access(socketPath);
                    await this.loadSocket(socketDir);
                } catch (error) {
                    console.warn(chalk.yellow(`⚠️ Could not load socket: ${socketDir}`));
                }
            }
            
            console.log(chalk.green(`✅ Loaded ${this.sockets.size} socket configurations`));
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to load socket configurations:', error.message));
        }
    }
    
    async loadSocket(socketType) {
        try {
            const socketPath = path.join(__dirname, '..', 'sockets', socketType, 'index.js');
            const SocketClass = require(socketPath);
            
            const socket = new SocketClass({
                server: this,
                socketType: socketType
            });
            
            // Initialize socket if method exists
            if (typeof socket.initialize === 'function') {
                await socket.initialize();
            }
            
            this.sockets.set(socketType, socket);
            console.log(chalk.green(`✅ Loaded socket: ${socketType}`));
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to load socket ${socketType}:`, error.message));
            throw error;
        }
    }
    
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getServerStats() {
        return {
            uptime: process.uptime(),
            clients: this.clients.size,
            rooms: this.rooms.size,
            sockets: this.sockets.size,
            currentSocket: this.currentSocket,
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    }
    
    async stop() {
        console.log(chalk.yellow('🛑 Stopping WebSocket server...'));
        
        // Clear heartbeat interval
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        // Close all client connections
        this.clients.forEach((client, clientId) => {
            try {
                client.ws.close(1001, 'Server shutting down');
            } catch (error) {
                // Connection already closed
            }
        });
        
        // Close server
        if (this.wss) {
            this.wss.close();
        }
        
        console.log(chalk.gray('📴 WebSocket server stopped'));
        
        // Emit server stopped event
        this.emit('server_stopped');
    }
}

module.exports = SocketDirectoryServer;