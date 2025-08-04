/**
 * Message Router for Socket Protocol
 * Routes messages between different components of the Socket Directory System
 */

const EventEmitter = require('events');
const chalk = require('chalk');
const protocol = require('./socket-protocol');

class MessageRouter extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            enableLogging: options.enableLogging !== false,
            maxQueueSize: options.maxQueueSize || 1000,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            ...options
        };
        
        // Routing tables
        this.routes = new Map();
        this.middleware = [];
        this.messageQueue = [];
        this.processingQueue = false;
        
        // Statistics
        this.stats = {
            messagesRouted: 0,
            messagesQueued: 0,
            messagesFailed: 0,
            routesRegistered: 0
        };
        
        // Initialize default routes
        this.initializeDefaultRoutes();
        
        if (this.options.enableLogging) {
            console.log(chalk.blue('🚦 Message Router initialized'));
        }
    }
    
    /**
     * Register a route for a message type
     */
    addRoute(messageType, handler, options = {}) {
        if (!messageType || typeof handler !== 'function') {
            throw new Error('Invalid route: messageType and handler are required');
        }
        
        const route = {
            messageType: messageType,
            handler: handler,
            priority: options.priority || 0,
            middleware: options.middleware || [],
            async: options.async !== false,
            retryOnError: options.retryOnError !== false
        };
        
        if (!this.routes.has(messageType)) {
            this.routes.set(messageType, []);
        }
        
        this.routes.get(messageType).push(route);
        
        // Sort routes by priority (higher priority first)
        this.routes.get(messageType).sort((a, b) => b.priority - a.priority);
        
        this.stats.routesRegistered++;
        
        if (this.options.enableLogging) {
            console.log(chalk.green(`✅ Route registered: ${messageType}`));
        }
    }
    
    /**
     * Remove a route
     */
    removeRoute(messageType, handler) {
        if (this.routes.has(messageType)) {
            const routes = this.routes.get(messageType);
            const index = routes.findIndex(route => route.handler === handler);
            
            if (index !== -1) {
                routes.splice(index, 1);
                
                if (routes.length === 0) {
                    this.routes.delete(messageType);
                }
                
                if (this.options.enableLogging) {
                    console.log(chalk.yellow(`➖ Route removed: ${messageType}`));
                }
            }
        }
    }
    
    /**
     * Add middleware to the routing pipeline
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware must be a function');
        }
        
        this.middleware.push(middleware);
        
        if (this.options.enableLogging) {
            console.log(chalk.blue('🔧 Middleware added to router'));
        }
    }
    
    /**
     * Route a message through the system
     */
    async route(message, context = {}) {
        try {
            // Parse message if it's a string
            const parsedMessage = typeof message === 'string' 
                ? protocol.parseMessage(message) 
                : message;
                
            // Validate message
            const validation = protocol.validateMessage(parsedMessage);
            if (!validation.valid) {
                throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
            }
            
            // Create routing context
            const routingContext = {
                ...context,
                message: parsedMessage,
                timestamp: new Date(),
                routerId: this.generateRoutingId()
            };
            
            if (this.options.enableLogging) {
                console.log(chalk.cyan(`🚦 Routing message: ${parsedMessage.type} [${routingContext.routerId}]`));
            }
            
            // Apply middleware
            for (const middleware of this.middleware) {
                try {
                    await this.executeMiddleware(middleware, routingContext);
                } catch (error) {
                    console.error(chalk.red(`❌ Middleware error: ${error.message}`));
                    
                    // Continue with other middleware unless it's a critical error
                    if (error.critical) {
                        throw error;
                    }
                }
            }
            
            // Route message to handlers
            await this.executeRoutes(parsedMessage, routingContext);
            
            this.stats.messagesRouted++;
            
            // Emit routing event
            this.emit('message_routed', {
                message: parsedMessage,
                context: routingContext
            });
            
            return routingContext;
            
        } catch (error) {
            this.stats.messagesFailed++;
            
            console.error(chalk.red(`❌ Routing error: ${error.message}`));
            
            // Emit error event
            this.emit('routing_error', {
                error: error,
                message: message,
                context: context
            });
            
            throw error;
        }
    }
    
    /**
     * Queue a message for later processing
     */
    queueMessage(message, context = {}, priority = 0) {
        if (this.messageQueue.length >= this.options.maxQueueSize) {
            throw new Error('Message queue is full');
        }
        
        const queueItem = {
            message: message,
            context: context,
            priority: priority,
            queuedAt: new Date(),
            attempts: 0
        };
        
        this.messageQueue.push(queueItem);
        
        // Sort queue by priority (higher priority first)
        this.messageQueue.sort((a, b) => b.priority - a.priority);
        
        this.stats.messagesQueued++;
        
        if (this.options.enableLogging) {
            console.log(chalk.blue(`📦 Message queued: ${this.messageQueue.length} in queue`));
        }
        
        // Start processing queue if not already processing
        if (!this.processingQueue) {
            this.processQueue();
        }
    }
    
    /**
     * Process queued messages
     */
    async processQueue() {
        if (this.processingQueue || this.messageQueue.length === 0) {
            return;
        }
        
        this.processingQueue = true;
        
        if (this.options.enableLogging) {
            console.log(chalk.yellow(`🔄 Processing message queue: ${this.messageQueue.length} messages`));
        }
        
        while (this.messageQueue.length > 0) {
            const queueItem = this.messageQueue.shift();
            
            try {
                await this.route(queueItem.message, queueItem.context);
                
            } catch (error) {
                queueItem.attempts++;
                
                // Retry if under limit
                if (queueItem.attempts < this.options.retryAttempts) {
                    // Add delay before retry
                    setTimeout(() => {
                        this.messageQueue.unshift(queueItem);
                    }, this.options.retryDelay);
                    
                    if (this.options.enableLogging) {
                        console.log(chalk.yellow(`🔄 Retrying message: attempt ${queueItem.attempts}`));
                    }
                } else {
                    console.error(chalk.red(`❌ Message failed after ${this.options.retryAttempts} attempts`));
                    
                    // Emit failed message event
                    this.emit('message_failed', {
                        queueItem: queueItem,
                        error: error
                    });
                }
            }
        }
        
        this.processingQueue = false;
        
        if (this.options.enableLogging) {
            console.log(chalk.green('✅ Message queue processing complete'));
        }
    }
    
    /**
     * Execute middleware
     */
    async executeMiddleware(middleware, context) {
        if (middleware.constructor.name === 'AsyncFunction') {
            await middleware(context);
        } else {
            middleware(context);
        }
    }
    
    /**
     * Execute routes for a message
     */
    async executeRoutes(message, context) {
        const routes = this.routes.get(message.type);
        
        if (!routes || routes.length === 0) {
            if (this.options.enableLogging) {
                console.log(chalk.yellow(`⚠️ No routes found for message type: ${message.type}`));
            }
            
            // Emit unrouted message event
            this.emit('message_unrouted', {
                message: message,
                context: context
            });
            
            return;
        }
        
        // Execute routes
        for (const route of routes) {
            try {
                // Apply route-specific middleware
                for (const routeMiddleware of route.middleware) {
                    await this.executeMiddleware(routeMiddleware, context);
                }
                
                // Execute route handler
                if (route.async) {
                    await route.handler(message, context);
                } else {
                    route.handler(message, context);
                }
                
                if (this.options.enableLogging) {
                    console.log(chalk.green(`✅ Route executed: ${message.type}`));
                }
                
            } catch (error) {
                console.error(chalk.red(`❌ Route handler error: ${error.message}`));
                
                // Emit route error event
                this.emit('route_error', {
                    error: error,
                    route: route,
                    message: message,
                    context: context
                });
                
                // Retry if enabled
                if (route.retryOnError && context.retryCount < this.options.retryAttempts) {
                    context.retryCount = (context.retryCount || 0) + 1;
                    
                    setTimeout(() => {
                        this.executeRoutes(message, context);
                    }, this.options.retryDelay);
                }
            }
        }
    }
    
    /**
     * Initialize default routes for common message types
     */
    initializeDefaultRoutes() {
        // Socket switch route
        this.addRoute(protocol.messageTypes.SOCKET_SWITCH, async (message, context) => {
            this.emit('socket_switch_requested', {
                socketType: message.data.socketType,
                options: message.data.options,
                context: context
            });
        }, { priority: 10 });
        
        // Business event route
        this.addRoute(protocol.messageTypes.BUSINESS_EVENT, async (message, context) => {
            this.emit('business_event_received', {
                eventType: message.data.eventType,
                eventData: message.data.eventData,
                context: context
            });
        }, { priority: 8 });
        
        // Room management routes
        this.addRoute(protocol.messageTypes.ROOM_JOIN, async (message, context) => {
            this.emit('room_join_requested', {
                room: message.data.room,
                context: context
            });
        }, { priority: 5 });
        
        this.addRoute(protocol.messageTypes.ROOM_LEAVE, async (message, context) => {
            this.emit('room_leave_requested', {
                room: message.data.room,
                context: context
            });
        }, { priority: 5 });
        
        // Broadcast route
        this.addRoute(protocol.messageTypes.BROADCAST, async (message, context) => {
            this.emit('broadcast_requested', {
                message: message.data.message,
                targetRoom: message.data.targetRoom,
                targetSocket: message.data.targetSocket,
                context: context
            });
        }, { priority: 3 });
        
        // Error handling route
        this.addRoute(protocol.messageTypes.ERROR, async (message, context) => {
            this.emit('error_received', {
                errorCode: message.data.errorCode,
                errorMessage: message.data.errorMessage,
                originalMessage: message.data.originalMessage,
                context: context
            });
        }, { priority: 1 });
        
        // Heartbeat route
        this.addRoute(protocol.messageTypes.HEARTBEAT, async (message, context) => {
            this.emit('heartbeat_received', {
                clientId: message.data.clientId,
                context: context
            });
        }, { priority: 0 });
    }
    
    /**
     * Create middleware for logging
     */
    static createLoggingMiddleware(options = {}) {
        const logLevel = options.logLevel || 'info';
        const includeContext = options.includeContext !== false;
        
        return (context) => {
            const { message, timestamp, routerId } = context;
            
            let logMessage = `[${timestamp.toISOString()}] ${message.type}`;
            
            if (routerId) {
                logMessage += ` [${routerId}]`;
            }
            
            if (includeContext && Object.keys(context).length > 3) {
                logMessage += ` - Context: ${JSON.stringify(context, null, 2)}`;
            }
            
            switch (logLevel) {
                case 'debug':
                    console.log(chalk.gray(logMessage));
                    break;
                case 'info':
                    console.log(chalk.blue(logMessage));
                    break;
                case 'warn':
                    console.log(chalk.yellow(logMessage));
                    break;
                case 'error':
                    console.log(chalk.red(logMessage));
                    break;
            }
        };
    }
    
    /**
     * Create middleware for message filtering
     */
    static createFilterMiddleware(filterFunction) {
        return (context) => {
            if (!filterFunction(context.message, context)) {
                const error = new Error('Message filtered out');
                error.filtered = true;
                throw error;
            }
        };
    }
    
    /**
     * Create middleware for rate limiting
     */
    static createRateLimitMiddleware(options = {}) {
        const limit = options.limit || 100;
        const window = options.window || 60000; // 1 minute
        const clients = new Map();
        
        return (context) => {
            const clientId = context.clientId || context.message.clientId || 'anonymous';
            const now = Date.now();
            
            if (!clients.has(clientId)) {
                clients.set(clientId, { count: 0, resetTime: now + window });
            }
            
            const client = clients.get(clientId);
            
            // Reset if window expired
            if (now >= client.resetTime) {
                client.count = 0;
                client.resetTime = now + window;
            }
            
            client.count++;
            
            if (client.count > limit) {
                const error = new Error('Rate limit exceeded');
                error.code = protocol.errorCodes.RATE_LIMITED;
                error.critical = true;
                throw error;
            }
        };
    }
    
    /**
     * Generate a unique routing ID
     */
    generateRoutingId() {
        return `route_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    
    /**
     * Get router statistics
     */
    getStats() {
        return {
            ...this.stats,
            queueSize: this.messageQueue.length,
            routesCount: this.routes.size,
            middlewareCount: this.middleware.length,
            uptime: process.uptime()
        };
    }
    
    /**
     * Clear message queue
     */
    clearQueue() {
        const clearedCount = this.messageQueue.length;
        this.messageQueue = [];
        
        if (this.options.enableLogging) {
            console.log(chalk.yellow(`🧹 Cleared ${clearedCount} messages from queue`));
        }
        
        return clearedCount;
    }
    
    /**
     * Get all registered routes
     */
    getRoutes() {
        const routeList = [];
        
        this.routes.forEach((routes, messageType) => {
            routes.forEach(route => {
                routeList.push({
                    messageType: messageType,
                    priority: route.priority,
                    middlewareCount: route.middleware.length,
                    async: route.async,
                    retryOnError: route.retryOnError
                });
            });
        });
        
        return routeList.sort((a, b) => b.priority - a.priority);
    }
}

module.exports = MessageRouter;