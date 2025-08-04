#!/usr/bin/env node

/**
 * Socket Directory CLI
 * Command-line interface for managing the Socket Directory System
 */

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const Table = require('cli-table3');
const path = require('path');
const fs = require('fs').promises;

// Import system components
const SocketDirectoryServer = require('../server/websocket-server');
const SocketDirectoryClient = require('../client/websocket-client');
const protocol = require('../protocol/socket-protocol');
const MessageRouter = require('../protocol/message-router');

class SocketCLI {
    constructor() {
        this.program = new Command();
        this.server = null;
        this.client = null;
        this.router = null;
        
        this.setupCommands();
        this.setupGlobalOptions();
    }
    
    setupGlobalOptions() {
        this.program
            .name('socket-cli')
            .description('Socket Directory System CLI')
            .version('1.0.0')
            .option('-v, --verbose', 'verbose output')
            .option('-q, --quiet', 'quiet mode')
            .option('--config <path>', 'config file path', './config.json');
    }
    
    setupCommands() {
        // Server commands
        this.program
            .command('server')
            .description('Server management commands')
            .addCommand(this.createServerStartCommand())
            .addCommand(this.createServerStopCommand())
            .addCommand(this.createServerStatusCommand())
            .addCommand(this.createServerStatsCommand());
        
        // Socket commands
        this.program
            .command('socket')
            .description('Socket management commands')
            .addCommand(this.createSocketListCommand())
            .addCommand(this.createSocketSwitchCommand())
            .addCommand(this.createSocketStatusCommand())
            .addCommand(this.createSocketTestCommand());
        
        // Client commands
        this.program
            .command('client')
            .description('Client management commands')
            .addCommand(this.createClientConnectCommand())
            .addCommand(this.createClientDisconnectCommand())
            .addCommand(this.createClientListCommand())
            .addCommand(this.createClientMonitorCommand());
        
        // Business commands
        this.program
            .command('business')
            .description('Business event commands')
            .addCommand(this.createBusinessEventCommand())
            .addCommand(this.createBusinessRegisterCommand())
            .addCommand(this.createBusinessListCommand());
        
        // Interactive mode
        this.program
            .command('interactive')
            .alias('i')
            .description('Start interactive mode')
            .action(() => this.startInteractiveMode());
        
        // Development commands
        this.program
            .command('dev')
            .description('Development commands')
            .addCommand(this.createDevSetupCommand())
            .addCommand(this.createDevTestCommand())
            .addCommand(this.createDevResetCommand());
    }
    
    // Server Commands
    createServerStartCommand() {
        return new Command('start')
            .description('Start the WebSocket server')
            .option('-p, --port <port>', 'server port', '8080')
            .option('-h, --host <host>', 'server host', 'localhost')
            .option('-s, --socket <type>', 'initial socket type', 'dental')
            .action(async (options) => {
                await this.startServer(options);
            });
    }
    
    createServerStopCommand() {
        return new Command('stop')
            .description('Stop the WebSocket server')
            .action(async () => {
                await this.stopServer();
            });
    }
    
    createServerStatusCommand() {
        return new Command('status')
            .description('Show server status')
            .action(async () => {
                await this.showServerStatus();
            });
    }
    
    createServerStatsCommand() {
        return new Command('stats')
            .description('Show server statistics')
            .option('-w, --watch', 'watch stats in real-time')
            .action(async (options) => {
                await this.showServerStats(options);
            });
    }
    
    // Socket Commands
    createSocketListCommand() {
        return new Command('list')
            .alias('ls')
            .description('List available sockets')
            .action(async () => {
                await this.listSockets();
            });
    }
    
    createSocketSwitchCommand() {
        return new Command('switch')
            .alias('sw')
            .description('Switch to a different socket')
            .argument('<socketType>', 'socket type (dental, pizza, gym)')
            .option('-f, --force', 'force switch without confirmation')
            .action(async (socketType, options) => {
                await this.switchSocket(socketType, options);
            });
    }
    
    createSocketStatusCommand() {
        return new Command('status')
            .description('Show current socket status')
            .action(async () => {
                await this.showSocketStatus();
            });
    }
    
    createSocketTestCommand() {
        return new Command('test')
            .description('Test socket functionality')
            .argument('<socketType>', 'socket type to test')
            .action(async (socketType) => {
                await this.testSocket(socketType);
            });
    }
    
    // Client Commands
    createClientConnectCommand() {
        return new Command('connect')
            .description('Connect to WebSocket server')
            .option('-u, --url <url>', 'server URL', 'ws://localhost:8080')
            .action(async (options) => {
                await this.connectClient(options);
            });
    }
    
    createClientDisconnectCommand() {
        return new Command('disconnect')
            .description('Disconnect from server')
            .action(async () => {
                await this.disconnectClient();
            });
    }
    
    createClientListCommand() {
        return new Command('list')
            .description('List connected clients')
            .action(async () => {
                await this.listClients();
            });
    }
    
    createClientMonitorCommand() {
        return new Command('monitor')
            .description('Monitor client connections')
            .option('-f, --follow', 'follow live updates')
            .action(async (options) => {
                await this.monitorClients(options);
            });
    }
    
    // Business Commands
    createBusinessEventCommand() {
        return new Command('event')
            .description('Trigger a business event')
            .argument('<eventType>', 'event type')
            .option('-d, --data <data>', 'event data (JSON)')
            .option('-s, --socket <type>', 'target socket type')
            .action(async (eventType, options) => {
                await this.triggerBusinessEvent(eventType, options);
            });
    }
    
    createBusinessRegisterCommand() {
        return new Command('register')
            .description('Register a new business')
            .option('-t, --type <type>', 'business type')
            .option('-f, --file <path>', 'business data file')
            .action(async (options) => {
                await this.registerBusiness(options);
            });
    }
    
    createBusinessListCommand() {
        return new Command('list')
            .description('List registered businesses')
            .option('-s, --socket <type>', 'filter by socket type')
            .option('-l, --limit <number>', 'limit results', '10')
            .action(async (options) => {
                await this.listBusinesses(options);
            });
    }
    
    // Development Commands
    createDevSetupCommand() {
        return new Command('setup')
            .description('Setup development environment')
            .action(async () => {
                await this.setupDevelopment();
            });
    }
    
    createDevTestCommand() {
        return new Command('test')
            .description('Run development tests')
            .option('-a, --all', 'run all tests')
            .action(async (options) => {
                await this.runDevelopmentTests(options);
            });
    }
    
    createDevResetCommand() {
        return new Command('reset')
            .description('Reset development environment')
            .option('-f, --force', 'force reset without confirmation')
            .action(async (options) => {
                await this.resetDevelopment(options);
            });
    }
    
    // Command Implementations
    
    async startServer(options) {
        const spinner = ora('Starting WebSocket server...').start();
        
        try {
            this.server = new SocketDirectoryServer({
                port: parseInt(options.port),
                host: options.host
            });
            
            // Setup server event listeners
            this.server.on('server_started', (info) => {
                spinner.succeed(`Server started on ws://${info.host}:${info.port}`);
                console.log(chalk.cyan(`Current socket: ${info.currentSocket}`));
            });
            
            this.server.on('client_connected', (client) => {
                if (!options.quiet) {
                    console.log(chalk.green(`✅ Client connected: ${client.id}`));
                }
            });
            
            this.server.on('client_disconnected', (info) => {
                if (!options.quiet) {
                    console.log(chalk.yellow(`👋 Client disconnected: ${info.clientId}`));
                }
            });
            
            this.server.on('socket_switched', (info) => {
                console.log(chalk.blue(`🔄 Socket switched: ${info.from} → ${info.to}`));
            });
            
            await this.server.start();
            
            // Keep process alive
            process.on('SIGINT', async () => {
                await this.stopServer();
                process.exit(0);
            });
            
        } catch (error) {
            spinner.fail(`Failed to start server: ${error.message}`);
            process.exit(1);
        }
    }
    
    async stopServer() {
        if (!this.server) {
            console.log(chalk.yellow('⚠️ Server is not running'));
            return;
        }
        
        const spinner = ora('Stopping server...').start();
        
        try {
            await this.server.stop();
            this.server = null;
            spinner.succeed('Server stopped');
        } catch (error) {
            spinner.fail(`Failed to stop server: ${error.message}`);
        }
    }
    
    async showServerStatus() {
        if (!this.server) {
            console.log(chalk.red('❌ Server is not running'));
            return;
        }
        
        const stats = this.server.getServerStats();
        
        const table = new Table({
            head: ['Property', 'Value'],
            colWidths: [20, 30]
        });
        
        table.push(
            ['Status', chalk.green('Running')],
            ['Uptime', `${Math.floor(stats.uptime)}s`],
            ['Clients', stats.clients],
            ['Rooms', stats.rooms],
            ['Sockets', stats.sockets],
            ['Current Socket', stats.currentSocket],
            ['Memory Usage', `${Math.round(stats.memory.heapUsed / 1024 / 1024)}MB`]
        );
        
        console.log(table.toString());
    }
    
    async showServerStats(options) {
        if (options.watch) {
            console.log(chalk.blue('👀 Watching server statistics (Ctrl+C to stop)...'));
            
            const updateStats = () => {
                console.clear();
                this.showServerStatus();
            };
            
            updateStats();
            const interval = setInterval(updateStats, 2000);
            
            process.on('SIGINT', () => {
                clearInterval(interval);
                process.exit(0);
            });
        } else {
            await this.showServerStatus();
        }
    }
    
    async listSockets() {
        const sockets = ['dental', 'pizza', 'gym', 'restaurant'];
        
        const table = new Table({
            head: ['Socket Type', 'Description', 'Status'],
            colWidths: [15, 40, 15]
        });
        
        for (const socket of sockets) {
            const description = this.getSocketDescription(socket);
            const status = this.server && this.server.currentSocket === socket ? 
                chalk.green('Active') : chalk.gray('Available');
            
            table.push([socket, description, status]);
        }
        
        console.log(table.toString());
    }
    
    async switchSocket(socketType, options) {
        if (!this.client) {
            console.log(chalk.red('❌ Not connected to server. Use "client connect" first.'));
            return;
        }
        
        const validSockets = ['dental', 'pizza', 'gym', 'restaurant'];
        if (!validSockets.includes(socketType)) {
            console.log(chalk.red(`❌ Invalid socket type. Valid types: ${validSockets.join(', ')}`));
            return;
        }
        
        if (!options.force) {
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Switch to ${socketType} socket?`,
                    default: true
                }
            ]);
            
            if (!confirm) {
                console.log('Socket switch cancelled');
                return;
            }
        }
        
        const spinner = ora(`Switching to ${socketType} socket...`).start();
        
        try {
            await this.client.switchSocket(socketType);
            
            // Wait for confirmation
            await new Promise((resolve) => {
                this.client.once('socket_switched', (data) => {
                    if (data.to === socketType) {
                        spinner.succeed(`Switched to ${socketType} socket`);
                        resolve();
                    }
                });
                
                setTimeout(() => {
                    spinner.fail('Socket switch timeout');
                    resolve();
                }, 5000);
            });
            
        } catch (error) {
            spinner.fail(`Failed to switch socket: ${error.message}`);
        }
    }
    
    async connectClient(options) {
        if (this.client && this.client.isConnected()) {
            console.log(chalk.yellow('⚠️ Already connected to server'));
            return;
        }
        
        const spinner = ora(`Connecting to ${options.url}...`).start();
        
        try {
            this.client = new SocketDirectoryClient({
                serverUrl: options.url
            });
            
            // Setup client event listeners
            this.client.on('connected', () => {
                spinner.succeed(`Connected to ${options.url}`);
            });
            
            this.client.on('socket_switched', (data) => {
                console.log(chalk.blue(`🔄 Socket switched: ${data.from} → ${data.to}`));
            });
            
            this.client.on('business_event', (data) => {
                console.log(chalk.cyan(`🏢 Business event: ${data.eventType}`));
            });
            
            this.client.on('broadcast', (data) => {
                console.log(chalk.magenta(`📢 Broadcast: ${data.message}`));
            });
            
            this.client.on('disconnected', (info) => {
                console.log(chalk.gray(`🔌 Disconnected (${info.code})`));
            });
            
            await this.client.connect();
            
        } catch (error) {
            spinner.fail(`Connection failed: ${error.message}`);
        }
    }
    
    async triggerBusinessEvent(eventType, options) {
        if (!this.client || !this.client.isConnected()) {
            console.log(chalk.red('❌ Not connected to server. Use "client connect" first.'));
            return;
        }
        
        let eventData = {};
        
        if (options.data) {
            try {
                eventData = JSON.parse(options.data);
            } catch (error) {
                console.log(chalk.red('❌ Invalid JSON data'));
                return;
            }
        } else {
            // Interactive data collection
            eventData = await this.collectEventData(eventType);
        }
        
        const spinner = ora(`Triggering ${eventType} event...`).start();
        
        try {
            const success = await this.client.triggerBusinessEvent(eventType, eventData, {
                targetSocket: options.socket
            });
            
            if (success) {
                spinner.succeed(`Event triggered: ${eventType}`);
            } else {
                spinner.fail('Failed to trigger event');
            }
            
        } catch (error) {
            spinner.fail(`Error triggering event: ${error.message}`);
        }
    }
    
    async startInteractiveMode() {
        console.log(chalk.blue.bold('\n🎯 Socket Directory Interactive Mode\n'));
        
        while (true) {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        { name: '🖥️  Start Server', value: 'start_server' },
                        { name: '🔌 Connect Client', value: 'connect_client' },
                        { name: '🔄 Switch Socket', value: 'switch_socket' },
                        { name: '🏢 Trigger Business Event', value: 'business_event' },
                        { name: '📊 Show Status', value: 'show_status' },
                        { name: '📋 List Sockets', value: 'list_sockets' },
                        { name: '❌ Exit', value: 'exit' }
                    ]
                }
            ]);
            
            try {
                switch (action) {
                    case 'start_server':
                        await this.interactiveStartServer();
                        break;
                    case 'connect_client':
                        await this.interactiveConnectClient();
                        break;
                    case 'switch_socket':
                        await this.interactiveSwitchSocket();
                        break;
                    case 'business_event':
                        await this.interactiveBusinessEvent();
                        break;
                    case 'show_status':
                        await this.showServerStatus();
                        break;
                    case 'list_sockets':
                        await this.listSockets();
                        break;
                    case 'exit':
                        console.log(chalk.blue('👋 Goodbye!'));
                        process.exit(0);
                }
            } catch (error) {
                console.log(chalk.red(`❌ Error: ${error.message}`));
            }
            
            console.log(); // Add spacing
        }
    }
    
    async interactiveStartServer() {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'port',
                message: 'Server port:',
                default: '8080',
                validate: (input) => {
                    const port = parseInt(input);
                    return port > 0 && port < 65536 ? true : 'Please enter a valid port number';
                }
            },
            {
                type: 'input',
                name: 'host',
                message: 'Server host:',
                default: 'localhost'
            },
            {
                type: 'list',
                name: 'socket',
                message: 'Initial socket type:',
                choices: ['dental', 'pizza', 'gym', 'restaurant'],
                default: 'dental'
            }
        ]);
        
        await this.startServer(answers);
    }
    
    async interactiveSwitchSocket() {
        if (!this.client || !this.client.isConnected()) {
            console.log(chalk.red('❌ Not connected to server'));
            return;
        }
        
        const { socketType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'socketType',
                message: 'Select socket type:',
                choices: ['dental', 'pizza', 'gym', 'restaurant']
            }
        ]);
        
        await this.switchSocket(socketType, { force: false });
    }
    
    getSocketDescription(socketType) {
        const descriptions = {
            dental: 'Dental practices, appointments, and patient management',
            pizza: 'Pizza restaurants, online ordering, and delivery',
            gym: 'Fitness centers, memberships, and class bookings',
            restaurant: 'General restaurants and dining establishments'
        };
        
        return descriptions[socketType] || 'Unknown socket type';
    }
    
    async collectEventData(eventType) {
        // Simplified event data collection
        const { data } = await inquirer.prompt([
            {
                type: 'editor',
                name: 'data',
                message: `Enter event data for ${eventType} (JSON format):`,
                default: '{\n  \n}'
            }
        ]);
        
        try {
            return JSON.parse(data);
        } catch (error) {
            throw new Error('Invalid JSON format');
        }
    }
    
    run() {
        this.program.parse();
    }
}

// Create and run CLI
if (require.main === module) {
    const cli = new SocketCLI();
    cli.run();
}

module.exports = SocketCLI;