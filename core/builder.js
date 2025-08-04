#!/usr/bin/env node
/**
 * Universal Business Builder - Core Socket System
 * Manages multiple business sockets and coordinates Claude Code sub-agents
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');

class UniversalBusinessBuilder extends EventEmitter {
    constructor() {
        super();
        this.sockets = new Map(); // Active business sockets
        this.currentBusiness = null;
        this.services = new Map(); // Shared services
        this.agents = new Map(); // Claude Code sub-agents
        this.config = {};
        
        console.log(chalk.blue('🏭 Universal Business Builder v1.0 Initialized'));
    }

    /**
     * Plug in a new business socket
     * @param {string} businessType - Type of business (dental, pizza, etc.)
     * @param {Object} config - Business-specific configuration
     */
    async plugSocket(businessType, config = {}) {
        try {
            console.log(chalk.yellow(`🔌 Plugging in ${businessType} socket...`));
            
            // Load business socket module
            const socketPath = path.join(__dirname, '..', 'sockets', businessType, 'index.js');
            const SocketClass = require(socketPath);
            
            // Initialize socket with config
            const socket = new SocketClass(config);
            await socket.initialize();
            
            // Register socket
            this.sockets.set(businessType, socket);
            
            console.log(chalk.green(`✅ ${businessType} socket plugged in successfully`));
            this.emit('socket:plugged', { businessType, socket });
            
            return socket;
        } catch (error) {
            console.error(chalk.red(`❌ Failed to plug ${businessType} socket:`, error.message));
            throw error;
        }
    }

    /**
     * Switch from one business type to another
     * @param {string} fromType - Current business type
     * @param {string} toType - Target business type
     */
    async switchBusiness(fromType, toType) {
        console.log(chalk.blue(`🔄 Switching from ${fromType} to ${toType}...`));
        
        try {
            // Validate both sockets exist
            if (!this.sockets.has(fromType)) {
                throw new Error(`Source socket '${fromType}' not found`);
            }
            if (!this.sockets.has(toType)) {
                throw new Error(`Target socket '${toType}' not found`);
            }

            const fromSocket = this.sockets.get(fromType);
            const toSocket = this.sockets.get(toType);

            // Pause current business
            await fromSocket.pause();
            
            // Migrate data if needed
            const migrationData = await fromSocket.exportData();
            await toSocket.importData(migrationData);
            
            // Activate new business
            await toSocket.activate();
            this.currentBusiness = toType;
            
            console.log(chalk.green(`✅ Successfully switched to ${toType}`));
            this.emit('business:switched', { from: fromType, to: toType });
            
            return toSocket;
        } catch (error) {
            console.error(chalk.red(`❌ Failed to switch business:`, error.message));
            throw error;
        }
    }

    /**
     * Initialize business logic for a specific type
     * @param {string} businessType - Type of business
     * @param {Object} config - Configuration object
     */
    async initializeBusinessLogic(businessType, config = {}) {
        console.log(chalk.blue(`🚀 Initializing ${businessType} business logic...`));
        
        try {
            const socket = this.sockets.get(businessType);
            if (!socket) {
                throw new Error(`Socket for '${businessType}' not found. Please plug it first.`);
            }

            // Initialize business-specific logic
            await socket.initializeLogic(config);
            
            // Set up WordPress configuration
            await this.configureWordPress(businessType, config);
            
            // Initialize SEO strategy
            await this.initializeSEO(businessType, config);
            
            // Set up content templates
            await this.setupContentTemplates(businessType);
            
            console.log(chalk.green(`✅ ${businessType} business logic initialized`));
            this.emit('business:initialized', { businessType, config });
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to initialize ${businessType}:`, error.message));
            throw error;
        }
    }

    /**
     * Handle business-specific events
     * @param {string} businessType - Type of business
     * @param {Object} event - Event object
     */
    async handleBusinessEvent(businessType, event) {
        console.log(chalk.cyan(`📡 Handling ${businessType} event: ${event.type}`));
        
        try {
            const socket = this.sockets.get(businessType);
            if (!socket) {
                throw new Error(`Socket for '${businessType}' not found`);
            }

            // Delegate to business socket
            const result = await socket.handleEvent(event);
            
            // Coordinate with Claude Code sub-agents if needed
            if (event.requiresAgents) {
                await this.delegateToAgents(businessType, event);
            }
            
            this.emit('event:handled', { businessType, event, result });
            return result;
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to handle event:`, error.message));
            throw error;
        }
    }

    /**
     * Configure WordPress for specific business type
     */
    async configureWordPress(businessType, config) {
        const wpService = this.getService('wordpress');
        if (wpService) {
            await wpService.configure(businessType, config);
        }
    }

    /**
     * Initialize SEO strategy for business type
     */
    async initializeSEO(businessType, config) {
        const seoService = this.getService('seo');
        if (seoService) {
            await seoService.initializeStrategy(businessType, config);
        }
    }

    /**
     * Set up content templates
     */
    async setupContentTemplates(businessType) {
        const templatePath = path.join(__dirname, '..', 'templates', 'content', businessType);
        try {
            const templates = await fs.readdir(templatePath);
            console.log(chalk.blue(`📄 Loaded ${templates.length} templates for ${businessType}`));
        } catch (error) {
            console.log(chalk.yellow(`⚠️ No templates found for ${businessType}`));
        }
    }

    /**
     * Delegate work to Claude Code sub-agents
     */
    async delegateToAgents(businessType, event) {
        const claudeBridge = this.getService('claude');
        if (claudeBridge) {
            await claudeBridge.delegate(businessType, event);
        }
    }

    /**
     * Register a shared service
     */
    registerService(name, service) {
        this.services.set(name, service);
        console.log(chalk.green(`🔧 Registered service: ${name}`));
    }

    /**
     * Get a shared service
     */
    getService(name) {
        return this.services.get(name);
    }

    /**
     * List all plugged sockets
     */
    listSockets() {
        const socketList = Array.from(this.sockets.keys());
        console.log(chalk.blue('🔌 Active Sockets:'), socketList);
        return socketList;
    }

    /**
     * Get current business info
     */
    getCurrentBusiness() {
        return {
            type: this.currentBusiness,
            socket: this.sockets.get(this.currentBusiness),
            services: Array.from(this.services.keys())
        };
    }

    /**
     * Shutdown all sockets gracefully
     */
    async shutdown() {
        console.log(chalk.yellow('🔄 Shutting down Universal Business Builder...'));
        
        for (const [type, socket] of this.sockets) {
            try {
                await socket.shutdown();
                console.log(chalk.gray(`📴 ${type} socket shutdown`));
            } catch (error) {
                console.error(chalk.red(`❌ Error shutting down ${type}:`, error.message));
            }
        }
        
        console.log(chalk.green('✅ Universal Business Builder shutdown complete'));
    }
}

module.exports = UniversalBusinessBuilder;