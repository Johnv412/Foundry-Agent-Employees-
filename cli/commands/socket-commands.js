/**
 * Socket Management Commands
 * Advanced socket operations and management functionality
 */

const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const Table = require('cli-table3');
const fs = require('fs').promises;
const path = require('path');

class SocketCommands {
    constructor(client, server) {
        this.client = client;
        this.server = server;
        
        // Socket configurations
        this.socketConfigs = {
            dental: {
                name: 'Dental Practices',
                description: 'Dental offices, appointments, and patient management',
                color: '#00a0d2',
                features: ['appointment_booking', 'patient_portal', 'insurance_verification'],
                eventTypes: ['appointment_booking', 'dentist_registration', 'patient_registration']
            },
            pizza: {
                name: 'Pizza Restaurants',
                description: 'Pizza delivery, online ordering, and restaurant management',
                color: '#d63638',
                features: ['online_ordering', 'delivery_tracking', 'menu_management'],
                eventTypes: ['online_order', 'restaurant_registration', 'menu_update', 'delivery_request']
            },
            gym: {
                name: 'Fitness Centers',
                description: 'Gyms, fitness classes, and membership management',
                color: '#00ba37',
                features: ['class_booking', 'membership_management', 'trainer_scheduling'],
                eventTypes: ['member_registration', 'class_booking', 'trainer_registration']
            },
            restaurant: {
                name: 'General Restaurants',
                description: 'Dining establishments and reservation management',
                color: '#f56e28',
                features: ['reservation_system', 'menu_display', 'review_management'],
                eventTypes: ['business_registration', 'review_submitted', 'rating_updated']
            }
        };
    }
    
    /**
     * List all available sockets with detailed information
     */
    async listSockets(options = {}) {
        const table = new Table({
            head: ['Socket', 'Name', 'Status', 'Features', 'Events'],
            colWidths: [12, 20, 12, 30, 25],
            wordWrap: true
        });
        
        const currentSocket = this.getCurrentSocket();
        
        for (const [socketType, config] of Object.entries(this.socketConfigs)) {
            const status = currentSocket === socketType ? 
                chalk.green('● Active') : 
                chalk.gray('○ Available');
            
            const features = config.features.slice(0, 3).join(', ') + 
                (config.features.length > 3 ? '...' : '');
            
            const events = config.eventTypes.slice(0, 2).join(', ') + 
                (config.eventTypes.length > 2 ? '...' : '');
            
            table.push([
                socketType,
                config.name,
                status,
                features,
                events
            ]);
        }
        
        console.log('\n' + chalk.bold('📡 Available Sockets') + '\n');
        console.log(table.toString());
        
        if (options.detailed) {
            await this.showDetailedSocketInfo();
        }
    }
    
    /**
     * Show detailed information about a specific socket
     */
    async showSocketInfo(socketType) {
        if (!this.socketConfigs[socketType]) {
            console.log(chalk.red(`❌ Unknown socket type: ${socketType}`));
            return;
        }
        
        const config = this.socketConfigs[socketType];
        const currentSocket = this.getCurrentSocket();
        const isActive = currentSocket === socketType;
        
        console.log(`\n${chalk.bold(config.name)} (${socketType})`);
        console.log(chalk.gray('─'.repeat(50)));
        
        console.log(`Status: ${isActive ? chalk.green('Active') : chalk.gray('Available')}`);
        console.log(`Description: ${config.description}`);
        console.log(`Color Theme: ${chalk.hex(config.color)('■')} ${config.color}`);
        
        console.log('\nFeatures:');
        config.features.forEach(feature => {
            console.log(`  • ${feature.replace(/_/g, ' ')}`);
        });
        
        console.log('\nSupported Events:');
        config.eventTypes.forEach(eventType => {
            console.log(`  • ${eventType.replace(/_/g, ' ')}`);
        });
        
        if (isActive && this.server) {
            await this.showActiveSocketStats(socketType);
        }
        
        console.log(); // Add spacing
    }
    
    /**
     * Switch to a different socket type
     */
    async switchSocket(socketType, options = {}) {
        if (!this.socketConfigs[socketType]) {
            console.log(chalk.red(`❌ Unknown socket type: ${socketType}`));
            console.log(`Valid types: ${Object.keys(this.socketConfigs).join(', ')}`);
            return false;
        }
        
        const currentSocket = this.getCurrentSocket();
        
        if (currentSocket === socketType) {
            console.log(chalk.yellow(`⚠️ Already using ${socketType} socket`));
            return true;
        }
        
        // Confirmation unless forced
        if (!options.force) {
            const config = this.socketConfigs[socketType];
            
            console.log(`\nSwitching to: ${chalk.bold(config.name)}`);
            console.log(`Description: ${config.description}`);
            
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Proceed with socket switch?',
                    default: true
                }
            ]);
            
            if (!confirm) {
                console.log('Socket switch cancelled');
                return false;
            }
        }
        
        const spinner = ora(`Switching from ${currentSocket} to ${socketType}...`).start();
        
        try {
            if (this.client && this.client.isConnected()) {
                // Client-side switch
                await this.client.switchSocket(socketType, options.switchOptions || {});
                
                // Wait for confirmation
                const success = await this.waitForSocketSwitch(socketType, 10000);
                
                if (success) {
                    spinner.succeed(`Switched to ${socketType} socket`);
                    await this.showSocketSwitchSummary(currentSocket, socketType);
                    return true;
                } else {
                    spinner.fail('Socket switch timeout - may have failed');
                    return false;
                }
                
            } else if (this.server) {
                // Server-side switch
                await this.server.switchSocket(socketType, options.switchOptions || {});
                spinner.succeed(`Server switched to ${socketType} socket`);
                return true;
                
            } else {
                spinner.fail('No connection to server');
                return false;
            }
            
        } catch (error) {
            spinner.fail(`Socket switch failed: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Test socket functionality
     */
    async testSocket(socketType, options = {}) {
        if (!this.socketConfigs[socketType]) {
            console.log(chalk.red(`❌ Unknown socket type: ${socketType}`));
            return;
        }
        
        const config = this.socketConfigs[socketType];
        console.log(`\n🧪 Testing ${config.name} Socket\n`);
        
        const tests = [
            { name: 'Socket Configuration', test: () => this.testSocketConfig(socketType) },
            { name: 'Event Types', test: () => this.testSocketEvents(socketType) },
            { name: 'Business Logic', test: () => this.testBusinessLogic(socketType) },
            { name: 'Data Validation', test: () => this.testDataValidation(socketType) }
        ];
        
        const results = [];
        
        for (const test of tests) {
            const spinner = ora(`Testing ${test.name}...`).start();
            
            try {
                const result = await test.test();
                
                if (result.success) {
                    spinner.succeed(`${test.name}: ${result.message || 'Passed'}`);
                    results.push({ name: test.name, status: 'passed', details: result });
                } else {
                    spinner.fail(`${test.name}: ${result.message || 'Failed'}`);
                    results.push({ name: test.name, status: 'failed', details: result });
                }
                
            } catch (error) {
                spinner.fail(`${test.name}: ${error.message}`);
                results.push({ name: test.name, status: 'error', error: error.message });
            }
        }
        
        this.displayTestResults(results);
    }
    
    /**
     * Compare different socket types
     */
    async compareSocket(socketTypes = []) {
        if (socketTypes.length === 0) {
            socketTypes = Object.keys(this.socketConfigs);
        }
        
        // Validate socket types
        const validTypes = socketTypes.filter(type => this.socketConfigs[type]);
        const invalidTypes = socketTypes.filter(type => !this.socketConfigs[type]);
        
        if (invalidTypes.length > 0) {
            console.log(chalk.yellow(`⚠️ Invalid socket types ignored: ${invalidTypes.join(', ')}`));
        }
        
        if (validTypes.length < 2) {
            console.log(chalk.red('❌ Need at least 2 valid socket types to compare'));
            return;
        }
        
        console.log('\n📊 Socket Comparison\n');
        
        const table = new Table({
            head: ['Feature', ...validTypes.map(type => this.socketConfigs[type].name)],
            colWidths: [20, ...validTypes.map(() => 15)]
        });
        
        // Compare features
        const allFeatures = new Set();
        validTypes.forEach(type => {
            this.socketConfigs[type].features.forEach(feature => allFeatures.add(feature));
        });
        
        for (const feature of allFeatures) {
            const row = [feature.replace(/_/g, ' ')];
            
            validTypes.forEach(type => {
                const hasFeature = this.socketConfigs[type].features.includes(feature);
                row.push(hasFeature ? chalk.green('✓') : chalk.gray('✗'));
            });
            
            table.push(row);
        }
        
        console.log(table.toString());
        
        // Show event type comparison
        console.log('\n🎯 Event Types Comparison\n');
        
        const eventTable = new Table({
            head: ['Event Type', ...validTypes.map(type => this.socketConfigs[type].name)],
            colWidths: [25, ...validTypes.map(() => 15)]
        });
        
        const allEvents = new Set();
        validTypes.forEach(type => {
            this.socketConfigs[type].eventTypes.forEach(event => allEvents.add(event));
        });
        
        for (const event of allEvents) {
            const row = [event.replace(/_/g, ' ')];
            
            validTypes.forEach(type => {
                const hasEvent = this.socketConfigs[type].eventTypes.includes(event);
                row.push(hasEvent ? chalk.green('✓') : chalk.gray('✗'));
            });
            
            eventTable.push(row);
        }
        
        console.log(eventTable.toString());
    }
    
    /**
     * Interactive socket selection
     */
    async interactiveSocketSelect() {
        const choices = Object.entries(this.socketConfigs).map(([type, config]) => ({
            name: `${config.name} - ${config.description}`,
            value: type,
            short: config.name
        }));
        
        const { selectedSocket } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedSocket',
                message: 'Select a socket type:',
                choices: choices,
                pageSize: 10
            }
        ]);
        
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: `What would you like to do with ${this.socketConfigs[selectedSocket].name}?`,
                choices: [
                    { name: '🔄 Switch to this socket', value: 'switch' },
                    { name: '📊 Show detailed info', value: 'info' },
                    { name: '🧪 Test functionality', value: 'test' },
                    { name: '🎯 Trigger sample event', value: 'event' },
                    { name: '❌ Cancel', value: 'cancel' }
                ]
            }
        ]);
        
        switch (action) {
            case 'switch':
                await this.switchSocket(selectedSocket);
                break;
            case 'info':
                await this.showSocketInfo(selectedSocket);
                break;
            case 'test':
                await this.testSocket(selectedSocket);
                break;
            case 'event':
                await this.triggerSampleEvent(selectedSocket);
                break;
            case 'cancel':
                console.log('Operation cancelled');
                break;
        }
    }
    
    // Helper methods
    
    getCurrentSocket() {
        if (this.client && this.client.getCurrentSocket()) {
            return this.client.getCurrentSocket();
        } else if (this.server) {
            return this.server.currentSocket;
        }
        return 'unknown';
    }
    
    async waitForSocketSwitch(targetSocket, timeout = 5000) {
        return new Promise((resolve) => {
            if (!this.client) {
                resolve(false);
                return;
            }
            
            const timeoutId = setTimeout(() => {
                resolve(false);
            }, timeout);
            
            this.client.once('socket_switched', (data) => {
                clearTimeout(timeoutId);
                resolve(data.to === targetSocket);
            });
        });
    }
    
    async showSocketSwitchSummary(fromSocket, toSocket) {
        const fromConfig = this.socketConfigs[fromSocket];
        const toConfig = this.socketConfigs[toSocket];
        
        console.log('\n📋 Socket Switch Summary');
        console.log(chalk.gray('─'.repeat(30)));
        console.log(`From: ${fromConfig?.name || fromSocket}`);
        console.log(`To: ${toConfig?.name || toSocket}`);
        console.log(`Time: ${new Date().toLocaleTimeString()}`);
        
        if (toConfig) {
            console.log(`\nNew Features Available:`);
            toConfig.features.forEach(feature => {
                console.log(`  • ${feature.replace(/_/g, ' ')}`);
            });
        }
    }
    
    async testSocketConfig(socketType) {
        const config = this.socketConfigs[socketType];
        
        const tests = [
            config.name && config.name.length > 0,
            config.description && config.description.length > 0,
            config.features && config.features.length > 0,
            config.eventTypes && config.eventTypes.length > 0,
            config.color && /^#[0-9a-f]{6}$/i.test(config.color)
        ];
        
        const passed = tests.filter(Boolean).length;
        const total = tests.length;
        
        return {
            success: passed === total,
            message: `${passed}/${total} configuration checks passed`
        };
    }
    
    async testSocketEvents(socketType) {
        const config = this.socketConfigs[socketType];
        const eventCount = config.eventTypes.length;
        
        return {
            success: eventCount > 0,
            message: `${eventCount} event types available`
        };
    }
    
    async testBusinessLogic(socketType) {
        // This would test actual business logic implementation
        // For now, just check if socket file exists
        const socketPath = path.join(__dirname, '../../sockets', socketType, 'index.js');
        
        try {
            await fs.access(socketPath);
            return {
                success: true,
                message: 'Socket implementation found'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Socket implementation not found'
            };
        }
    }
    
    async testDataValidation(socketType) {
        // Simple validation test
        const config = this.socketConfigs[socketType];
        
        const validationTests = [
            typeof config.name === 'string',
            typeof config.description === 'string',
            Array.isArray(config.features),
            Array.isArray(config.eventTypes)
        ];
        
        const passed = validationTests.filter(Boolean).length;
        
        return {
            success: passed === validationTests.length,
            message: `Data structure validation passed`
        };
    }
    
    displayTestResults(results) {
        console.log('\n🧪 Test Results Summary\n');
        
        const table = new Table({
            head: ['Test', 'Status', 'Details'],
            colWidths: [20, 12, 30]
        });
        
        results.forEach(result => {
            let status;
            switch (result.status) {
                case 'passed':
                    status = chalk.green('✓ PASS');
                    break;
                case 'failed':
                    status = chalk.red('✗ FAIL');
                    break;
                case 'error':
                    status = chalk.yellow('⚠ ERROR');
                    break;
                default:
                    status = chalk.gray('? UNKNOWN');
            }
            
            const details = result.details?.message || result.error || 'No details';
            
            table.push([result.name, status, details]);
        });
        
        console.log(table.toString());
        
        const passed = results.filter(r => r.status === 'passed').length;
        const total = results.length;
        
        if (passed === total) {
            console.log(chalk.green(`\n✅ All tests passed (${passed}/${total})`));
        } else {
            console.log(chalk.yellow(`\n⚠️ ${passed}/${total} tests passed`));
        }
    }
    
    async triggerSampleEvent(socketType) {
        const config = this.socketConfigs[socketType];
        
        if (config.eventTypes.length === 0) {
            console.log(chalk.yellow('⚠️ No event types available for this socket'));
            return;
        }
        
        const { eventType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'eventType',
                message: 'Select an event to trigger:',
                choices: config.eventTypes.map(type => ({
                    name: type.replace(/_/g, ' '),
                    value: type
                }))
            }
        ]);
        
        const sampleData = this.generateSampleEventData(eventType, socketType);
        
        console.log(`\nSample data for ${eventType}:`);
        console.log(JSON.stringify(sampleData, null, 2));
        
        const { proceed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Trigger this event?',
                default: true
            }
        ]);
        
        if (proceed && this.client && this.client.isConnected()) {
            const spinner = ora(`Triggering ${eventType} event...`).start();
            
            try {
                await this.client.triggerBusinessEvent(eventType, sampleData, {
                    targetSocket: socketType
                });
                spinner.succeed(`Event triggered successfully`);
            } catch (error) {
                spinner.fail(`Failed to trigger event: ${error.message}`);
            }
        }
    }
    
    generateSampleEventData(eventType, socketType) {
        const sampleData = {
            appointment_booking: {
                patientName: 'John Doe',
                dentistId: 'dr_smith_001',
                appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                serviceType: 'cleaning',
                notes: 'Regular checkup and cleaning'
            },
            online_order: {
                customerName: 'Jane Smith',
                items: [{ name: 'Margherita Pizza', size: 'large', price: 18.99 }],
                deliveryAddress: '123 Main St, City, State',
                totalAmount: 23.98,
                orderType: 'delivery'
            },
            member_registration: {
                memberName: 'Mike Johnson',
                membershipType: 'monthly',
                contactInfo: { email: 'mike@example.com', phone: '555-0123' },
                preferredClasses: ['yoga', 'weightlifting']
            }
        };
        
        return sampleData[eventType] || { message: `Sample ${eventType} event`, timestamp: new Date().toISOString() };
    }
}

module.exports = SocketCommands;