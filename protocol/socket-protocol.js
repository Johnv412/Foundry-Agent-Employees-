/**
 * Socket Protocol Implementation
 * Defines the communication protocol and message formats for the Socket Directory System
 */

const EventEmitter = require('events');
const chalk = require('chalk');

class SocketProtocol extends EventEmitter {
    constructor() {
        super();
        
        // Protocol version
        this.version = '1.0.0';
        
        // Message types registry
        this.messageTypes = {
            // Socket management
            SOCKET_SWITCH: 'socket_switch',
            SOCKET_STATUS: 'socket_status',
            SOCKET_LIST: 'socket_list',
            SOCKET_CONFIG: 'socket_config',
            
            // Business events
            BUSINESS_EVENT: 'business_event',
            BUSINESS_REGISTER: 'business_register',
            BUSINESS_UPDATE: 'business_update',
            BUSINESS_DELETE: 'business_delete',
            
            // Client management
            CLIENT_JOIN: 'client_join',
            CLIENT_LEAVE: 'client_leave',
            CLIENT_STATUS: 'client_status',
            CLIENT_LIST: 'client_list',
            
            // Room management
            ROOM_JOIN: 'room_join',
            ROOM_LEAVE: 'room_leave',
            ROOM_LIST: 'room_list',
            ROOM_STATUS: 'room_status',
            
            // Communication
            BROADCAST: 'broadcast',
            DIRECT_MESSAGE: 'direct_message',
            ROOM_MESSAGE: 'room_message',
            
            // System
            HEARTBEAT: 'heartbeat',
            ERROR: 'error',
            ACK: 'ack',
            PING: 'ping',
            PONG: 'pong'
        };
        
        // Error codes
        this.errorCodes = {
            INVALID_MESSAGE: 1001,
            SOCKET_NOT_FOUND: 1002,
            CLIENT_NOT_FOUND: 1003,
            ROOM_NOT_FOUND: 1004,
            PERMISSION_DENIED: 1005,
            RATE_LIMITED: 1006,
            INVALID_SOCKET_TYPE: 1007,
            SOCKET_SWITCH_FAILED: 1008,
            BUSINESS_EVENT_FAILED: 1009,
            CONNECTION_TIMEOUT: 1010
        };
        
        // Socket types registry
        this.socketTypes = {
            DENTAL: 'dental',
            PIZZA: 'pizza',
            GYM: 'gym',
            RESTAURANT: 'restaurant'
        };
        
        // Business event types
        this.businessEventTypes = {
            // Dental events
            APPOINTMENT_BOOKING: 'appointment_booking',
            DENTIST_REGISTRATION: 'dentist_registration',
            PATIENT_REGISTRATION: 'patient_registration',
            
            // Pizza events
            ONLINE_ORDER: 'online_order',
            RESTAURANT_REGISTRATION: 'restaurant_registration',
            MENU_UPDATE: 'menu_update',
            DELIVERY_REQUEST: 'delivery_request',
            
            // Gym events
            MEMBER_REGISTRATION: 'member_registration',
            CLASS_BOOKING: 'class_booking',
            TRAINER_REGISTRATION: 'trainer_registration',
            
            // General events
            BUSINESS_REGISTRATION: 'business_registration',
            REVIEW_SUBMITTED: 'review_submitted',
            RATING_UPDATED: 'rating_updated'
        };
        
        // Message validation schemas
        this.messageSchemas = this.initializeMessageSchemas();
    }
    
    /**
     * Create a protocol message
     */
    createMessage(type, data = {}, options = {}) {
        if (!this.messageTypes[type] && !Object.values(this.messageTypes).includes(type)) {
            throw new Error(`Invalid message type: ${type}`);
        }
        
        const message = {
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            version: this.version
        };
        
        // Add optional fields
        if (options.messageId) {
            message.messageId = options.messageId;
        }
        
        if (options.correlationId) {
            message.correlationId = options.correlationId;
        }
        
        if (options.clientId) {
            message.clientId = options.clientId;
        }
        
        if (options.targetClient) {
            message.targetClient = options.targetClient;
        }
        
        if (options.room) {
            message.room = options.room;
        }
        
        // Validate message
        const validation = this.validateMessage(message);
        if (!validation.valid) {
            throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
        }
        
        return message;
    }
    
    /**
     * Create a socket switch message
     */
    createSocketSwitchMessage(socketType, options = {}) {
        return this.createMessage(this.messageTypes.SOCKET_SWITCH, {
            socketType: socketType,
            options: options,
            force: options.force || false
        });
    }
    
    /**
     * Create a business event message
     */
    createBusinessEventMessage(eventType, eventData, options = {}) {
        return this.createMessage(this.messageTypes.BUSINESS_EVENT, {
            eventType: eventType,
            eventData: eventData,
            targetSocket: options.targetSocket,
            broadcastToRoom: options.broadcastToRoom,
            requiresAck: options.requiresAck || false
        });
    }
    
    /**
     * Create a room join message
     */
    createRoomJoinMessage(roomName, options = {}) {
        return this.createMessage(this.messageTypes.ROOM_JOIN, {
            room: roomName,
            password: options.password,
            metadata: options.metadata
        });
    }
    
    /**
     * Create a broadcast message
     */
    createBroadcastMessage(message, options = {}) {
        return this.createMessage(this.messageTypes.BROADCAST, {
            message: message,
            targetRoom: options.targetRoom,
            targetSocket: options.targetSocket,
            priority: options.priority || 'normal'
        });
    }
    
    /**
     * Create an error message
     */
    createErrorMessage(errorCode, errorMessage, originalMessage = null) {
        return this.createMessage(this.messageTypes.ERROR, {
            errorCode: errorCode,
            errorMessage: errorMessage,
            originalMessage: originalMessage
        });
    }
    
    /**
     * Create an acknowledgment message
     */
    createAckMessage(originalMessageId, status = 'success', data = {}) {
        return this.createMessage(this.messageTypes.ACK, {
            originalMessageId: originalMessageId,
            status: status,
            data: data
        });
    }
    
    /**
     * Parse a protocol message from JSON
     */
    parseMessage(jsonData) {
        try {
            const message = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            // Validate message structure
            const validation = this.validateMessage(message);
            if (!validation.valid) {
                throw new Error(`Invalid message format: ${validation.errors.join(', ')}`);
            }
            
            return message;
            
        } catch (error) {
            throw new Error(`Failed to parse message: ${error.message}`);
        }
    }
    
    /**
     * Serialize a message to JSON
     */
    serializeMessage(message) {
        try {
            return JSON.stringify(message);
        } catch (error) {
            throw new Error(`Failed to serialize message: ${error.message}`);
        }
    }
    
    /**
     * Validate a message against the protocol
     */
    validateMessage(message) {
        const errors = [];
        
        // Check required fields
        if (!message.type) {
            errors.push('Message type is required');
        }
        
        if (!message.timestamp) {
            errors.push('Timestamp is required');
        }
        
        if (!message.version) {
            errors.push('Protocol version is required');
        }
        
        // Check message type validity
        if (message.type && !Object.values(this.messageTypes).includes(message.type)) {
            errors.push(`Invalid message type: ${message.type}`);
        }
        
        // Check protocol version compatibility
        if (message.version && !this.isVersionCompatible(message.version)) {
            errors.push(`Incompatible protocol version: ${message.version}`);
        }
        
        // Validate specific message types
        if (message.type && this.messageSchemas[message.type]) {
            const schemaErrors = this.validateAgainstSchema(message, this.messageSchemas[message.type]);
            errors.push(...schemaErrors);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Check if a protocol version is compatible
     */
    isVersionCompatible(version) {
        // Simple version compatibility check
        const [major, minor, patch] = version.split('.').map(Number);
        const [currentMajor, currentMinor, currentPatch] = this.version.split('.').map(Number);
        
        // Same major version is compatible
        return major === currentMajor;
    }
    
    /**
     * Validate message data against a schema
     */
    validateAgainstSchema(message, schema) {
        const errors = [];
        
        // Check required data fields
        if (schema.requiredFields) {
            for (const field of schema.requiredFields) {
                if (!message.data || message.data[field] === undefined) {
                    errors.push(`Required field missing: ${field}`);
                }
            }
        }
        
        // Check field types
        if (schema.fieldTypes && message.data) {
            for (const [field, expectedType] of Object.entries(schema.fieldTypes)) {
                if (message.data[field] !== undefined) {
                    const actualType = typeof message.data[field];
                    if (actualType !== expectedType) {
                        errors.push(`Invalid type for field ${field}: expected ${expectedType}, got ${actualType}`);
                    }
                }
            }
        }
        
        // Check field values
        if (schema.fieldValues && message.data) {
            for (const [field, allowedValues] of Object.entries(schema.fieldValues)) {
                if (message.data[field] !== undefined) {
                    if (!allowedValues.includes(message.data[field])) {
                        errors.push(`Invalid value for field ${field}: ${message.data[field]}`);
                    }
                }
            }
        }
        
        return errors;
    }
    
    /**
     * Initialize message validation schemas
     */
    initializeMessageSchemas() {
        return {
            [this.messageTypes.SOCKET_SWITCH]: {
                requiredFields: ['socketType'],
                fieldTypes: {
                    socketType: 'string',
                    force: 'boolean'
                },
                fieldValues: {
                    socketType: Object.values(this.socketTypes)
                }
            },
            
            [this.messageTypes.BUSINESS_EVENT]: {
                requiredFields: ['eventType', 'eventData'],
                fieldTypes: {
                    eventType: 'string',
                    eventData: 'object',
                    targetSocket: 'string',
                    broadcastToRoom: 'string',
                    requiresAck: 'boolean'
                }
            },
            
            [this.messageTypes.ROOM_JOIN]: {
                requiredFields: ['room'],
                fieldTypes: {
                    room: 'string',
                    password: 'string',
                    metadata: 'object'
                }
            },
            
            [this.messageTypes.ROOM_LEAVE]: {
                requiredFields: ['room'],
                fieldTypes: {
                    room: 'string'
                }
            },
            
            [this.messageTypes.BROADCAST]: {
                requiredFields: ['message'],
                fieldTypes: {
                    message: 'string',
                    targetRoom: 'string',
                    targetSocket: 'string',
                    priority: 'string'
                },
                fieldValues: {
                    priority: ['low', 'normal', 'high', 'urgent']
                }
            },
            
            [this.messageTypes.ERROR]: {
                requiredFields: ['errorCode', 'errorMessage'],
                fieldTypes: {
                    errorCode: 'number',
                    errorMessage: 'string',
                    originalMessage: 'object'
                }
            },
            
            [this.messageTypes.ACK]: {
                requiredFields: ['originalMessageId', 'status'],
                fieldTypes: {
                    originalMessageId: 'string',
                    status: 'string',
                    data: 'object'
                },
                fieldValues: {
                    status: ['success', 'error', 'pending']
                }
            }
        };
    }
    
    /**
     * Generate a unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Generate a correlation ID for request-response pairs
     */
    generateCorrelationId() {
        return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Check if a socket type is valid
     */
    isValidSocketType(socketType) {
        return Object.values(this.socketTypes).includes(socketType);
    }
    
    /**
     * Check if a business event type is valid
     */
    isValidBusinessEventType(eventType) {
        return Object.values(this.businessEventTypes).includes(eventType);
    }
    
    /**
     * Get socket-specific business event types
     */
    getSocketBusinessEventTypes(socketType) {
        const eventMap = {
            [this.socketTypes.DENTAL]: [
                this.businessEventTypes.APPOINTMENT_BOOKING,
                this.businessEventTypes.DENTIST_REGISTRATION,
                this.businessEventTypes.PATIENT_REGISTRATION
            ],
            [this.socketTypes.PIZZA]: [
                this.businessEventTypes.ONLINE_ORDER,
                this.businessEventTypes.RESTAURANT_REGISTRATION,
                this.businessEventTypes.MENU_UPDATE,
                this.businessEventTypes.DELIVERY_REQUEST
            ],
            [this.socketTypes.GYM]: [
                this.businessEventTypes.MEMBER_REGISTRATION,
                this.businessEventTypes.CLASS_BOOKING,
                this.businessEventTypes.TRAINER_REGISTRATION
            ]
        };
        
        const socketEvents = eventMap[socketType] || [];
        const generalEvents = [
            this.businessEventTypes.BUSINESS_REGISTRATION,
            this.businessEventTypes.REVIEW_SUBMITTED,
            this.businessEventTypes.RATING_UPDATED
        ];
        
        return [...socketEvents, ...generalEvents];
    }
    
    /**
     * Create a protocol handler for message routing
     */
    createMessageHandler() {
        return {
            handleMessage: (message, context) => {
                try {
                    const parsedMessage = this.parseMessage(message);
                    
                    // Emit message event
                    this.emit('message', parsedMessage, context);
                    this.emit(`message:${parsedMessage.type}`, parsedMessage, context);
                    
                    return parsedMessage;
                    
                } catch (error) {
                    console.error(chalk.red('❌ Protocol error:', error.message));
                    
                    // Create error message
                    const errorMessage = this.createErrorMessage(
                        this.errorCodes.INVALID_MESSAGE,
                        error.message,
                        message
                    );
                    
                    this.emit('error', errorMessage, context);
                    
                    return errorMessage;
                }
            }
        };
    }
    
    /**
     * Get protocol information
     */
    getProtocolInfo() {
        return {
            version: this.version,
            messageTypes: Object.keys(this.messageTypes).length,
            socketTypes: Object.keys(this.socketTypes).length,
            businessEventTypes: Object.keys(this.businessEventTypes).length,
            errorCodes: Object.keys(this.errorCodes).length
        };
    }
    
    /**
     * Export protocol constants for external use
     */
    getConstants() {
        return {
            messageTypes: { ...this.messageTypes },
            errorCodes: { ...this.errorCodes },
            socketTypes: { ...this.socketTypes },
            businessEventTypes: { ...this.businessEventTypes }
        };
    }
}

// Export singleton instance
const protocol = new SocketProtocol();

module.exports = protocol;
module.exports.SocketProtocol = SocketProtocol;