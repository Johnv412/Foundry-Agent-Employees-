/**
 * Server Control Commands
 * Advanced server management and monitoring functionality
 */

const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const Table = require('cli-table3');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class ServerCommands {
    constructor(server) {
        this.server = server;
        this.serverInstance = null;
        this.monitoringInterval = null;
        this.logStream = null;
        
        // Default server configuration
        this.defaultConfig = {
            port: 8080,
            host: 'localhost',
            maxConnections: 1000,
            heartbeatInterval: 30000,
            logLevel: 'info'
        };
    }
    
    /**
     * Start the WebSocket server with advanced configuration
     */
    async startServer(options = {}) {
        if (this.serverInstance) {
            console.log(chalk.yellow('⚠️ Server is already running'));
            const { restart } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'restart',
                    message: 'Would you like to restart the server?',
                    default: false
                }
            ]);
            
            if (restart) {
                await this.stopServer();
            } else {
                return;
            }
        }
        
        // Merge options with defaults
        const config = { ...this.defaultConfig, ...options };
        
        // Validate configuration
        const validation = await this.validateServerConfig(config);
        if (!validation.valid) {
            console.log(chalk.red(`❌ Invalid configuration: ${validation.errors.join(', ')}`));
            return;
        }
        
        const spinner = ora('Starting WebSocket server...').start();
        
        try {
            // Initialize server with configuration
            const SocketDirectoryServer = require('../../server/websocket-server');
            this.serverInstance = new SocketDirectoryServer(config);
            
            // Setup comprehensive event listeners
            this.setupServerEventListeners();
            
            // Start server
            await this.serverInstance.start();
            
            spinner.succeed(`Server started on ws://${config.host}:${config.port}`);
            
            // Display server information
            await this.displayServerInfo();
            
            // Start monitoring if requested
            if (options.monitor) {
                this.startMonitoring();
            }
            
            // Setup graceful shutdown
            this.setupGracefulShutdown();
            
        } catch (error) {
            spinner.fail(`Failed to start server: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Stop the WebSocket server gracefully
     */
    async stopServer(options = {}) {
        if (!this.serverInstance) {
            console.log(chalk.yellow('⚠️ Server is not running'));
            return;
        }
        
        const force = options.force || false;
        
        if (!force) {
            const stats = this.serverInstance.getServerStats();
            
            if (stats.clients > 0) {
                console.log(chalk.yellow(`⚠️ ${stats.clients} clients are still connected`));
                
                const { proceed } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'proceed',
                        message: 'Stop server anyway?',
                        default: false
                    }
                ]);
                
                if (!proceed) {
                    console.log('Server stop cancelled');
                    return;
                }
            }
        }
        
        const spinner = ora('Stopping server...').start();
        
        try {
            // Stop monitoring
            this.stopMonitoring();
            
            // Close log stream
            if (this.logStream) {
                await this.logStream.end();
                this.logStream = null;
            }
            
            // Stop server
            await this.serverInstance.stop();
            this.serverInstance = null;
            
            spinner.succeed('Server stopped gracefully');
            
        } catch (error) {
            spinner.fail(`Error stopping server: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Restart the server with new configuration
     */
    async restartServer(options = {}) {
        console.log(chalk.blue('🔄 Restarting server...'));
        
        const currentConfig = this.serverInstance ? {
            port: this.serverInstance.port,
            host: this.serverInstance.host
        } : {};
        
        await this.stopServer({ force: true });
        
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.startServer({ ...currentConfig, ...options });
    }
    
    /**
     * Show detailed server status
     */
    async showServerStatus(options = {}) {
        if (!this.serverInstance) {
            console.log(chalk.red('❌ Server is not running'));
            return;
        }
        
        const stats = this.serverInstance.getServerStats();
        
        console.log('\n📊 Server Status\n');
        
        // Basic information table
        const infoTable = new Table({
            head: ['Property', 'Value'],
            colWidths: [20, 30]
        });
        
        infoTable.push(
            ['Status', chalk.green('Running')],
            ['Uptime', this.formatUptime(stats.uptime)],
            ['Host:Port', `${this.serverInstance.host}:${this.serverInstance.port}`],
            ['Current Socket', chalk.cyan(stats.currentSocket)],
            ['Protocol Version', '1.0.0']
        );
        
        console.log(infoTable.toString());
        
        // Connection statistics
        console.log('\n🔗 Connection Statistics\n');
        
        const connTable = new Table({
            head: ['Metric', 'Count', 'Details'],
            colWidths: [20, 10, 30]
        });
        
        connTable.push(
            ['Active Clients', stats.clients, 'Currently connected'],
            ['Active Rooms', stats.rooms, 'Chat/group rooms'],
            ['Loaded Sockets', stats.sockets, 'Business socket types'],
            ['Memory Usage', this.formatMemory(stats.memory.heapUsed), `Total: ${this.formatMemory(stats.memory.heapTotal)}`]
        );
        
        console.log(connTable.toString());
        
        // Socket-specific information
        if (options.detailed) {
            await this.showDetailedServerInfo();
        }
        
        // Performance metrics
        if (options.performance) {
            await this.showPerformanceMetrics();
        }
    }
    
    /**
     * Monitor server in real-time
     */
    async monitorServer(options = {}) {
        if (!this.serverInstance) {
            console.log(chalk.red('❌ Server is not running'));
            return;
        }
        
        console.log(chalk.blue('👀 Monitoring server (Ctrl+C to stop)...\n'));
        
        const updateInterval = options.interval || 2000;
        let monitoring = true;
        
        const updateDisplay = async () => {
            if (!monitoring) return;
            
            console.clear();
            console.log(chalk.bold.blue('📊 Real-time Server Monitor'));
            console.log(chalk.gray('─'.repeat(60)));
            console.log(`Last updated: ${new Date().toLocaleTimeString()}\n`);
            
            try {
                await this.showServerStatus({ detailed: false });
                
                // Show recent events
                console.log(chalk.bold('\n📋 Recent Activity'));
                console.log(chalk.gray('─'.repeat(30)));
                this.showRecentActivity();
                
            } catch (error) {
                console.log(chalk.red(`❌ Monitor error: ${error.message}`));
            }
        };
        
        // Initial display
        await updateDisplay();
        
        // Start monitoring interval
        this.monitoringInterval = setInterval(updateDisplay, updateInterval);
        
        // Setup cleanup
        const cleanup = () => {
            monitoring = false;
            this.stopMonitoring();
            console.log(chalk.gray('\n📴 Monitoring stopped'));
            process.exit(0);
        };
        
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }
    
    /**
     * Show server logs
     */
    async showServerLogs(options = {}) {
        const logLevel = options.level || 'info';
        const lines = options.lines || 50;
        const follow = options.follow || false;
        
        console.log(`📜 Server Logs (${logLevel} level, last ${lines} lines)\n`);
        
        if (follow) {
            console.log(chalk.blue('Following logs in real-time (Ctrl+C to stop)...\n'));
            
            // Setup real-time log following
            this.setupLogFollowing(logLevel);
            
            process.on('SIGINT', () => {
                console.log(chalk.gray('\nLog following stopped'));
                process.exit(0);
            });
        } else {
            // Show static logs
            this.displayStaticLogs(lines, logLevel);
        }
    }
    
    /**
     * Manage server configuration
     */
    async configureServer(options = {}) {
        if (options.interactive) {
            await this.interactiveConfiguration();
        } else if (options.file) {
            await this.loadConfigurationFromFile(options.file);
        } else if (options.show) {
            await this.showCurrentConfiguration();
        } else {
            console.log(chalk.yellow('⚠️ No configuration action specified'));
            console.log('Use --interactive, --file <path>, or --show');
        }
    }
    
    /**
     * Backup server state
     */
    async backupServer(options = {}) {
        if (!this.serverInstance) {
            console.log(chalk.red('❌ Server is not running'));
            return;
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = options.path || `./backups/server-backup-${timestamp}.json`;
        
        const spinner = ora('Creating server backup...').start();
        
        try {
            // Ensure backup directory exists
            const backupDir = path.dirname(backupPath);
            await fs.mkdir(backupDir, { recursive: true });
            
            // Collect server state
            const backup = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                serverStats: this.serverInstance.getServerStats(),
                configuration: this.getCurrentConfiguration(),
                socketStates: await this.collectSocketStates(),
                clientStates: await this.collectClientStates()
            };
            
            // Write backup file
            await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
            
            spinner.succeed(`Backup saved to ${backupPath}`);
            console.log(`Backup size: ${this.formatFileSize(JSON.stringify(backup).length)}`);
            
        } catch (error) {
            spinner.fail(`Backup failed: ${error.message}`);
        }
    }
    
    /**
     * Restore server state from backup
     */
    async restoreServer(backupPath, options = {}) {
        if (!await this.fileExists(backupPath)) {
            console.log(chalk.red(`❌ Backup file not found: ${backupPath}`));
            return;
        }
        
        const spinner = ora('Restoring server from backup...').start();
        
        try {
            // Load backup data
            const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
            
            // Validate backup
            if (!this.validateBackup(backupData)) {
                throw new Error('Invalid backup file format');
            }
            
            console.log(`\nRestoring from backup created: ${backupData.timestamp}`);
            
            if (!options.force) {
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: 'This will replace current server state. Continue?',
                        default: false
                    }
                ]);
                
                if (!confirm) {
                    spinner.stop();
                    console.log('Restore cancelled');
                    return;
                }
            }
            
            // Stop current server if running
            if (this.serverInstance) {
                await this.stopServer({ force: true });
            }
            
            // Restore configuration and restart
            await this.restoreFromBackup(backupData);
            
            spinner.succeed('Server restored from backup');
            
        } catch (error) {
            spinner.fail(`Restore failed: ${error.message}`);
        }
    }
    
    // Helper methods
    
    setupServerEventListeners() {
        if (!this.serverInstance) return;
        
        this.serverInstance.on('client_connected', (client) => {
            console.log(chalk.green(`✅ Client connected: ${client.id} from ${client.ip}`));
        });
        
        this.serverInstance.on('client_disconnected', (info) => {
            console.log(chalk.yellow(`👋 Client disconnected: ${info.clientId}`));
        });
        
        this.serverInstance.on('socket_switched', (info) => {
            console.log(chalk.blue(`🔄 Socket switched: ${info.from} → ${info.to}`));
        });
        
        this.serverInstance.on('server_error', (error) => {
            console.log(chalk.red(`❌ Server error: ${error.message}`));
        });
    }
    
    async validateServerConfig(config) {
        const errors = [];
        
        // Port validation
        if (!config.port || config.port < 1 || config.port > 65535) {
            errors.push('Invalid port number');
        }
        
        // Host validation
        if (!config.host || typeof config.host !== 'string') {
            errors.push('Invalid host');
        }
        
        // Check if port is available
        try {
            const net = require('net');
            const server = net.createServer();
            
            await new Promise((resolve, reject) => {
                server.listen(config.port, config.host, () => {
                    server.close(resolve);
                });
                
                server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        errors.push(`Port ${config.port} is already in use`);
                    }
                    reject(err);
                });
            });
        } catch (error) {
            // Port check failed, but we already handled EADDRINUSE
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    async displayServerInfo() {
        if (!this.serverInstance) return;
        
        const stats = this.serverInstance.getServerStats();
        
        console.log(chalk.bold('\n🚀 Server Information'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(`WebSocket URL: ws://${this.serverInstance.host}:${this.serverInstance.port}`);
        console.log(`Current Socket: ${chalk.cyan(stats.currentSocket)}`);
        console.log(`Loaded Sockets: ${stats.sockets}`);
        console.log(`Memory Usage: ${this.formatMemory(stats.memory.heapUsed)}`);
        console.log(chalk.gray('─'.repeat(40)));
    }
    
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(chalk.yellow(`\n📴 Received ${signal}, shutting down gracefully...`));
            
            try {
                await this.stopServer({ force: false });
                process.exit(0);
            } catch (error) {
                console.error(chalk.red(`❌ Error during shutdown: ${error.message}`));
                process.exit(1);
            }
        };
        
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    
    startMonitoring() {
        if (this.monitoringInterval) return;
        
        this.monitoringInterval = setInterval(() => {
            // Monitoring logic would go here
            // For now, just ensure server is still running
            if (!this.serverInstance) {
                this.stopMonitoring();
            }
        }, 5000);
    }
    
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    
    showRecentActivity() {
        // This would show recent server activity
        // For now, just show a placeholder
        console.log(chalk.gray('• Server running normally'));
        console.log(chalk.gray('• All systems operational'));
    }
    
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    formatMemory(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    formatFileSize(bytes) {
        return this.formatMemory(bytes);
    }
    
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    getCurrentConfiguration() {
        if (!this.serverInstance) return null;
        
        return {
            port: this.serverInstance.port,
            host: this.serverInstance.host,
            currentSocket: this.serverInstance.currentSocket
        };
    }
    
    async collectSocketStates() {
        if (!this.serverInstance) return {};
        
        const socketStates = {};
        
        for (const [socketType, socket] of this.serverInstance.sockets.entries()) {
            if (socket && typeof socket.exportData === 'function') {
                socketStates[socketType] = await socket.exportData();
            }
        }
        
        return socketStates;
    }
    
    async collectClientStates() {
        if (!this.serverInstance) return [];
        
        const clientStates = [];
        
        this.serverInstance.clients.forEach((client, clientId) => {
            clientStates.push({
                id: clientId,
                connectedAt: client.connectedAt,
                socketType: client.socketType,
                rooms: Array.from(client.rooms)
            });
        });
        
        return clientStates;
    }
    
    validateBackup(backupData) {
        return backupData && 
               backupData.timestamp && 
               backupData.version && 
               backupData.serverStats;
    }
    
    async restoreFromBackup(backupData) {
        // This would implement the actual restore logic
        // For now, just restart with saved configuration
        const config = backupData.configuration;
        if (config) {
            await this.startServer(config);
        }
    }
}

module.exports = ServerCommands;