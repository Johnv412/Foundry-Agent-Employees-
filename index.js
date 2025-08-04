#!/usr/bin/env node
/**
 * WordPress & SEO Socket System - Main Entry Point
 * Universal Business Builder with Claude Code Sub-Agents
 */

const UniversalBusinessBuilder = require('./core/builder');
const ClaudeBridge = require('./core/claude-bridge');
const chalk = require('chalk');
const path = require('path');

class WPSocketSystem {
    constructor() {
        this.builder = new UniversalBusinessBuilder();
        this.claudeBridge = new ClaudeBridge();
        this.isInitialized = false;
    }

    /**
     * Initialize the system
     */
    async initialize() {
        try {
            console.log(chalk.blue('🚀 Starting WordPress & SEO Socket System...'));
            
            // Initialize Claude Bridge agents
            await this.claudeBridge.initializeAgents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log(chalk.green('✅ System initialized successfully!'));
            
            // Display available commands
            this.displayHelp();
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to initialize system:', error.message));
            process.exit(1);
        }
    }

    /**
     * Set up event listeners between components
     */
    setupEventListeners() {
        // Builder events
        this.builder.on('socket:plugged', (data) => {
            console.log(chalk.green(`📡 Socket plugged: ${data.businessType}`));
        });

        this.builder.on('socket:error', (data) => {
            console.error(chalk.red(`❌ Socket error: ${data.error}`));
        });

        // Claude Bridge events
        this.claudeBridge.on('task:completed', (data) => {
            console.log(chalk.green(`🤖 Task completed: ${data.taskId}`));
        });

        this.claudeBridge.on('agent:error', (data) => {
            console.error(chalk.red(`🤖 Agent error: ${data.error}`));
        });
    }

    /**
     * Display help information
     */
    displayHelp() {
        console.log(chalk.cyan('\n📋 Available Commands:'));
        console.log(chalk.white('  npm start          - Start the system'));
        console.log(chalk.white('  npm run dev         - Start in development mode'));
        console.log(chalk.white('  npm run build       - Build business socket'));
        console.log(chalk.white('  npm run demo        - Run workflow demo'));
        console.log(chalk.white('  npm test            - Run tests'));
        
        console.log(chalk.cyan('\n🏢 Available Business Types:'));
        console.log(chalk.white('  - dental           - Dental practice website'));
        console.log(chalk.white('  - gym              - Fitness center website'));
        console.log(chalk.white('  - pizza            - Pizza restaurant website'));
        console.log(chalk.white('  - restaurant       - General restaurant website'));
        
        console.log(chalk.cyan('\n🤖 Available Agents:'));
        const agents = Array.from(this.claudeBridge.agentConfigs.keys());
        agents.forEach(agent => {
            console.log(chalk.white(`  - ${agent}`));
        });
        
        console.log(chalk.yellow('\n💡 System is ready for socket connections!'));
    }

    /**
     * Plug in a business socket
     */
    async plugSocket(businessType, config = {}) {
        if (!this.isInitialized) {
            throw new Error('System not initialized. Call initialize() first.');
        }
        
        return await this.builder.plugSocket(businessType, config);
    }

    /**
     * Run a task with Claude agents
     */
    async runTask(taskType, taskData) {
        if (!this.isInitialized) {
            throw new Error('System not initialized. Call initialize() first.');
        }
        
        return await this.claudeBridge.runTask(taskType, taskData);
    }
}

// If running directly (not imported)
if (require.main === module) {
    const system = new WPSocketSystem();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\n👋 Shutting down gracefully...'));
        process.exit(0);
    });
    
    // Initialize system
    system.initialize().catch(error => {
        console.error(chalk.red('Fatal error:', error.message));
        process.exit(1);
    });
}

module.exports = WPSocketSystem;
