/**
 * Business Event Commands
 * Commands for triggering and managing business events across different socket types
 */

const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const Table = require('cli-table3');
const fs = require('fs').promises;
const path = require('path');

class BusinessCommands {
    constructor(client) {
        this.client = client;
        
        // Business event templates and configurations
        this.eventTemplates = {
            dental: {
                appointment_booking: {
                    description: 'Book a dental appointment',
                    fields: [
                        { name: 'patientName', type: 'string', required: true, description: 'Patient full name' },
                        { name: 'dentistId', type: 'string', required: true, description: 'Dentist identifier' },
                        { name: 'appointmentDate', type: 'datetime', required: true, description: 'Appointment date and time' },
                        { name: 'serviceType', type: 'select', required: true, options: ['cleaning', 'checkup', 'filling', 'extraction', 'crown'], description: 'Type of service' },
                        { name: 'duration', type: 'number', required: false, default: 60, description: 'Duration in minutes' },
                        { name: 'notes', type: 'text', required: false, description: 'Additional notes' },
                        { name: 'insuranceInfo', type: 'object', required: false, description: 'Insurance information' }
                    ],
                    sampleData: {
                        patientName: 'John Doe',
                        dentistId: 'dr_smith_001',
                        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        serviceType: 'cleaning',
                        duration: 60,
                        notes: 'Regular checkup and cleaning',
                        insuranceInfo: { provider: 'BlueCross', policyNumber: 'BC123456' }
                    }
                },
                dentist_registration: {
                    description: 'Register a new dentist',
                    fields: [
                        { name: 'personalInfo', type: 'object', required: true, description: 'Personal information' },
                        { name: 'credentials', type: 'object', required: true, description: 'Professional credentials' },
                        { name: 'practiceInfo', type: 'object', required: true, description: 'Practice information' },
                        { name: 'specialties', type: 'array', required: false, description: 'Areas of specialization' },
                        { name: 'availability', type: 'object', required: false, description: 'Available hours' }
                    ],
                    sampleData: {
                        personalInfo: { name: 'Dr. Jane Smith', email: 'jane@dentalpractice.com', phone: '555-0123' },
                        credentials: { licenseNumber: 'DDS12345', school: 'Harvard Dental', graduationYear: 2015 },
                        practiceInfo: { name: 'Smith Dental Care', address: '123 Main St, City, State' },
                        specialties: ['General Dentistry', 'Cosmetic Dentistry'],
                        availability: { monday: '9:00-17:00', tuesday: '9:00-17:00' }
                    }
                },
                patient_registration: {
                    description: 'Register a new patient',
                    fields: [
                        { name: 'patientInfo', type: 'object', required: true, description: 'Patient information' },
                        { name: 'contactInfo', type: 'object', required: true, description: 'Contact details' },
                        { name: 'medicalHistory', type: 'object', required: false, description: 'Medical history' },
                        { name: 'insuranceInfo', type: 'object', required: false, description: 'Insurance information' },
                        { name: 'emergencyContact', type: 'object', required: true, description: 'Emergency contact' }
                    ],
                    sampleData: {
                        patientInfo: { name: 'Alice Johnson', dateOfBirth: '1985-06-15', gender: 'female' },
                        contactInfo: { email: 'alice@email.com', phone: '555-0456', address: '456 Oak St' },
                        medicalHistory: { allergies: ['penicillin'], conditions: [], medications: [] },
                        insuranceInfo: { provider: 'Aetna', policyNumber: 'AET789012' },
                        emergencyContact: { name: 'Bob Johnson', phone: '555-0789', relationship: 'spouse' }
                    }
                }
            },
            pizza: {
                online_order: {
                    description: 'Place an online pizza order',
                    fields: [
                        { name: 'customerInfo', type: 'object', required: true, description: 'Customer information' },
                        { name: 'orderItems', type: 'array', required: true, description: 'Order items' },
                        { name: 'orderType', type: 'select', required: true, options: ['delivery', 'pickup', 'dine-in'], description: 'Order type' },
                        { name: 'deliveryAddress', type: 'object', required: false, description: 'Delivery address' },
                        { name: 'paymentMethod', type: 'select', required: true, options: ['credit_card', 'paypal', 'cash'], description: 'Payment method' },
                        { name: 'specialInstructions', type: 'text', required: false, description: 'Special instructions' },
                        { name: 'totalAmount', type: 'number', required: true, description: 'Total order amount' }
                    ],
                    sampleData: {
                        customerInfo: { name: 'Mike Wilson', email: 'mike@email.com', phone: '555-0321' },
                        orderItems: [
                            { name: 'Margherita Pizza', size: 'large', quantity: 1, price: 18.99 },
                            { name: 'Garlic Bread', quantity: 2, price: 5.99 }
                        ],
                        orderType: 'delivery',
                        deliveryAddress: { street: '789 Pine St', city: 'Anytown', zipCode: '12345' },
                        paymentMethod: 'credit_card',
                        specialInstructions: 'Extra cheese, light sauce',
                        totalAmount: 26.97
                    }
                },
                restaurant_registration: {
                    description: 'Register a new pizza restaurant',
                    fields: [
                        { name: 'restaurantInfo', type: 'object', required: true, description: 'Restaurant information' },
                        { name: 'ownerInfo', type: 'object', required: true, description: 'Owner information' },
                        { name: 'menuData', type: 'array', required: true, description: 'Menu items' },
                        { name: 'deliveryAreas', type: 'array', required: false, description: 'Delivery coverage areas' },
                        { name: 'operatingHours', type: 'object', required: true, description: 'Operating hours' }
                    ],
                    sampleData: {
                        restaurantInfo: { name: 'Tony\'s Pizza Palace', address: '321 Food St', phone: '555-PIZZA' },
                        ownerInfo: { name: 'Tony Romano', email: 'tony@pizzapalace.com', phone: '555-0654' },
                        menuData: [
                            { category: 'Pizza', items: ['Margherita', 'Pepperoni', 'Supreme'] },
                            { category: 'Sides', items: ['Garlic Bread', 'Caesar Salad'] }
                        ],
                        deliveryAreas: ['Downtown', 'University District', 'Suburbs'],
                        operatingHours: { open: '11:00', close: '23:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }
                    }
                },
                menu_update: {
                    description: 'Update restaurant menu',
                    fields: [
                        { name: 'restaurantId', type: 'string', required: true, description: 'Restaurant identifier' },
                        { name: 'menuChanges', type: 'array', required: true, description: 'Menu changes' },
                        { name: 'changeType', type: 'select', required: true, options: ['add', 'remove', 'update', 'price_change'], description: 'Type of change' },
                        { name: 'effectiveDate', type: 'datetime', required: false, description: 'When changes take effect' },
                        { name: 'updatedBy', type: 'string', required: true, description: 'Who made the update' }
                    ],
                    sampleData: {
                        restaurantId: 'rest_001',
                        menuChanges: [
                            { action: 'add', item: 'BBQ Chicken Pizza', price: 19.99, description: 'Smoky BBQ sauce with grilled chicken' },
                            { action: 'price_change', item: 'Pepperoni Pizza', oldPrice: 16.99, newPrice: 17.99 }
                        ],
                        changeType: 'add',
                        effectiveDate: new Date().toISOString(),
                        updatedBy: 'manager_001'
                    }
                },
                delivery_request: {
                    description: 'Request delivery for an order',
                    fields: [
                        { name: 'orderId', type: 'string', required: true, description: 'Order identifier' },
                        { name: 'deliveryAddress', type: 'object', required: true, description: 'Delivery address' },
                        { name: 'customerPhone', type: 'string', required: true, description: 'Customer phone number' },
                        { name: 'deliveryInstructions', type: 'text', required: false, description: 'Delivery instructions' },
                        { name: 'estimatedTime', type: 'number', required: false, description: 'Estimated delivery time in minutes' }
                    ],
                    sampleData: {
                        orderId: 'order_123456',
                        deliveryAddress: { street: '456 Elm St', apartment: '2B', city: 'Anytown', zipCode: '12345' },
                        customerPhone: '555-0987',
                        deliveryInstructions: 'Ring doorbell twice, leave at door if no answer',
                        estimatedTime: 30
                    }
                }
            },
            gym: {
                member_registration: {
                    description: 'Register a new gym member',
                    fields: [
                        { name: 'memberInfo', type: 'object', required: true, description: 'Member information' },
                        { name: 'membershipType', type: 'select', required: true, options: ['basic', 'premium', 'vip'], description: 'Membership level' },
                        { name: 'contactInfo', type: 'object', required: true, description: 'Contact information' },
                        { name: 'emergencyContact', type: 'object', required: true, description: 'Emergency contact' },
                        { name: 'fitnessGoals', type: 'array', required: false, description: 'Fitness goals' },
                        { name: 'medicalConditions', type: 'array', required: false, description: 'Medical conditions' }
                    ],
                    sampleData: {
                        memberInfo: { name: 'Sarah Davis', dateOfBirth: '1990-03-22', gender: 'female' },
                        membershipType: 'premium',
                        contactInfo: { email: 'sarah@email.com', phone: '555-0246', address: '789 Fitness Ave' },
                        emergencyContact: { name: 'Tom Davis', phone: '555-0135', relationship: 'husband' },
                        fitnessGoals: ['weight_loss', 'muscle_building', 'endurance'],
                        medicalConditions: []
                    }
                },
                class_booking: {
                    description: 'Book a fitness class',
                    fields: [
                        { name: 'memberId', type: 'string', required: true, description: 'Member identifier' },
                        { name: 'classId', type: 'string', required: true, description: 'Class identifier' },
                        { name: 'classDate', type: 'datetime', required: true, description: 'Class date and time' },
                        { name: 'instructorId', type: 'string', required: false, description: 'Preferred instructor' },
                        { name: 'notes', type: 'text', required: false, description: 'Additional notes' }
                    ],
                    sampleData: {
                        memberId: 'member_001',
                        classId: 'yoga_basic_001',
                        classDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        instructorId: 'instructor_jane',
                        notes: 'First time taking yoga class'
                    }
                },
                trainer_registration: {
                    description: 'Register a new trainer',
                    fields: [
                        { name: 'trainerInfo', type: 'object', required: true, description: 'Trainer information' },
                        { name: 'certifications', type: 'array', required: true, description: 'Professional certifications' },
                        { name: 'specialties', type: 'array', required: true, description: 'Training specialties' },
                        { name: 'availability', type: 'object', required: true, description: 'Available schedule' },
                        { name: 'rates', type: 'object', required: true, description: 'Training rates' }
                    ],
                    sampleData: {
                        trainerInfo: { name: 'Mark Johnson', email: 'mark@fitness.com', phone: '555-0777' },
                        certifications: ['NASM-CPT', 'ACSM-CPT', 'Yoga Alliance RYT-200'],
                        specialties: ['strength_training', 'weight_loss', 'yoga', 'nutrition'],
                        availability: { monday: '6:00-20:00', tuesday: '6:00-20:00', wednesday: '6:00-20:00' },
                        rates: { individual: 75, group: 25, online: 50 }
                    }
                }
            }
        };
    }
    
    /**
     * List available business events for current or specified socket
     */
    async listBusinessEvents(socketType = null) {
        const currentSocket = socketType || this.getCurrentSocket();
        
        if (!this.eventTemplates[currentSocket]) {
            console.log(chalk.red(`❌ No events available for socket: ${currentSocket}`));
            return;
        }
        
        const events = this.eventTemplates[currentSocket];
        
        console.log(`\n🎯 Available Business Events for ${chalk.cyan(currentSocket.toUpperCase())} Socket\n`);
        
        const table = new Table({
            head: ['Event Type', 'Description', 'Required Fields', 'Optional Fields'],
            colWidths: [20, 30, 20, 20],
            wordWrap: true
        });
        
        for (const [eventType, eventConfig] of Object.entries(events)) {
            const requiredFields = eventConfig.fields.filter(f => f.required).length;
            const optionalFields = eventConfig.fields.filter(f => !f.required).length;
            
            table.push([
                eventType,
                eventConfig.description,
                `${requiredFields} required`,
                `${optionalFields} optional`
            ]);
        }
        
        console.log(table.toString());
    }
    
    /**
     * Show detailed information about a specific event type
     */
    async showEventInfo(eventType, socketType = null) {
        const currentSocket = socketType || this.getCurrentSocket();
        
        if (!this.eventTemplates[currentSocket] || !this.eventTemplates[currentSocket][eventType]) {
            console.log(chalk.red(`❌ Event type '${eventType}' not found for ${currentSocket} socket`));
            return;
        }
        
        const eventConfig = this.eventTemplates[currentSocket][eventType];
        
        console.log(`\n📋 Event Details: ${chalk.bold(eventType)}`);
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`Socket: ${chalk.cyan(currentSocket)}`);
        console.log(`Description: ${eventConfig.description}`);
        
        console.log('\n📝 Fields:');
        
        const fieldsTable = new Table({
            head: ['Field', 'Type', 'Required', 'Description'],
            colWidths: [15, 12, 10, 25]
        });
        
        eventConfig.fields.forEach(field => {
            fieldsTable.push([
                field.name,
                field.type,
                field.required ? chalk.red('Yes') : chalk.green('No'),
                field.description || ''
            ]);
        });
        
        console.log(fieldsTable.toString());
        
        console.log('\n💡 Sample Data:');
        console.log(JSON.stringify(eventConfig.sampleData, null, 2));
    }
    
    /**
     * Trigger a business event with interactive data collection
     */
    async triggerEvent(eventType, options = {}) {
        if (!this.client || !this.client.isConnected()) {
            console.log(chalk.red('❌ Not connected to server. Use "client connect" first.'));
            return;
        }
        
        const currentSocket = options.socket || this.getCurrentSocket();
        
        if (!this.eventTemplates[currentSocket] || !this.eventTemplates[currentSocket][eventType]) {
            console.log(chalk.red(`❌ Event type '${eventType}' not found for ${currentSocket} socket`));
            await this.listBusinessEvents(currentSocket);
            return;
        }
        
        const eventConfig = this.eventTemplates[currentSocket][eventType];
        let eventData;
        
        if (options.data) {
            // Use provided data
            try {
                eventData = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
            } catch (error) {
                console.log(chalk.red('❌ Invalid JSON data provided'));
                return;
            }
        } else if (options.sample) {
            // Use sample data
            eventData = eventConfig.sampleData;
            console.log(chalk.blue('📋 Using sample data:'));
            console.log(JSON.stringify(eventData, null, 2));
        } else if (options.file) {
            // Load data from file
            try {
                const fileContent = await fs.readFile(options.file, 'utf8');
                eventData = JSON.parse(fileContent);
            } catch (error) {
                console.log(chalk.red(`❌ Error reading file: ${error.message}`));
                return;
            }
        } else {
            // Interactive data collection
            eventData = await this.collectEventDataInteractively(eventConfig);
        }
        
        // Validate event data
        const validation = this.validateEventData(eventData, eventConfig);
        if (!validation.valid) {
            console.log(chalk.red(`❌ Data validation failed:`));
            validation.errors.forEach(error => console.log(`  • ${error}`));
            return;
        }
        
        // Trigger the event
        const spinner = ora(`Triggering ${eventType} event...`).start();
        
        try {
            const success = await this.client.triggerBusinessEvent(eventType, eventData, {
                targetSocket: currentSocket,
                broadcastToRoom: options.broadcastRoom,
                requiresAck: options.requiresAck
            });
            
            if (success) {
                spinner.succeed(`Event '${eventType}' triggered successfully`);
                
                if (options.wait) {
                    await this.waitForEventResponse(eventType);
                }
                
                // Log event if requested
                if (options.log) {
                    await this.logEvent(eventType, eventData, currentSocket);
                }
                
            } else {
                spinner.fail('Failed to trigger event');
            }
            
        } catch (error) {
            spinner.fail(`Error triggering event: ${error.message}`);
        }
    }
    
    /**
     * Batch trigger multiple events from a file
     */
    async batchTriggerEvents(filePath, options = {}) {
        if (!this.client || !this.client.isConnected()) {
            console.log(chalk.red('❌ Not connected to server'));
            return;
        }
        
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            const events = JSON.parse(fileContent);
            
            if (!Array.isArray(events)) {
                throw new Error('File must contain an array of events');
            }
            
            console.log(`\n🚀 Batch triggering ${events.length} events from ${filePath}\n`);
            
            const results = [];
            
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const eventNumber = i + 1;
                
                console.log(`[${eventNumber}/${events.length}] Processing ${event.type}...`);
                
                try {
                    const success = await this.client.triggerBusinessEvent(
                        event.type, 
                        event.data, 
                        {
                            targetSocket: event.socket || options.socket,
                            broadcastToRoom: event.broadcastRoom
                        }
                    );
                    
                    results.push({
                        event: event.type,
                        status: success ? 'success' : 'failed',
                        index: i
                    });
                    
                    console.log(success ? chalk.green('✓') : chalk.red('✗'));
                    
                    // Add delay between events if specified
                    if (options.delay && i < events.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, options.delay));
                    }
                    
                } catch (error) {
                    results.push({
                        event: event.type,
                        status: 'error',
                        error: error.message,
                        index: i
                    });
                    
                    console.log(chalk.red(`✗ Error: ${error.message}`));
                }
            }
            
            // Show summary
            this.showBatchResults(results);
            
        } catch (error) {
            console.log(chalk.red(`❌ Error processing batch file: ${error.message}`));
        }
    }
    
    /**
     * Generate sample event data file
     */
    async generateSampleEvents(socketType, outputPath) {
        const currentSocket = socketType || this.getCurrentSocket();
        
        if (!this.eventTemplates[currentSocket]) {
            console.log(chalk.red(`❌ No events available for socket: ${currentSocket}`));
            return;
        }
        
        const events = this.eventTemplates[currentSocket];
        const sampleEvents = [];
        
        // Generate sample events for each type
        for (const [eventType, eventConfig] of Object.entries(events)) {
            sampleEvents.push({
                type: eventType,
                socket: currentSocket,
                data: eventConfig.sampleData,
                description: eventConfig.description
            });
        }
        
        try {
            await fs.writeFile(outputPath, JSON.stringify(sampleEvents, null, 2));
            console.log(chalk.green(`✅ Sample events generated: ${outputPath}`));
            console.log(`Events included: ${Object.keys(events).join(', ')}`);
        } catch (error) {
            console.log(chalk.red(`❌ Error writing file: ${error.message}`));
        }
    }
    
    /**
     * Interactive event builder
     */
    async interactiveEventBuilder() {
        if (!this.client || !this.client.isConnected()) {
            console.log(chalk.red('❌ Not connected to server'));
            return;
        }
        
        console.log(chalk.blue.bold('\n🎯 Interactive Business Event Builder\n'));
        
        // Select socket type
        const availableSockets = Object.keys(this.eventTemplates);
        const { socketType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'socketType',
                message: 'Select socket type:',
                choices: availableSockets.map(socket => ({
                    name: `${socket.toUpperCase()} Socket`,
                    value: socket
                }))
            }
        ]);
        
        // Select event type
        const availableEvents = Object.keys(this.eventTemplates[socketType]);
        const { eventType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'eventType',
                message: 'Select event type:',
                choices: availableEvents.map(event => ({
                    name: `${event.replace(/_/g, ' ')} - ${this.eventTemplates[socketType][event].description}`,
                    value: event
                }))
            }
        ]);
        
        // Select data source
        const { dataSource } = await inquirer.prompt([
            {
                type: 'list',
                name: 'dataSource',
                message: 'How would you like to provide event data?',
                choices: [
                    { name: '📋 Use sample data', value: 'sample' },
                    { name: '✏️ Enter custom data', value: 'custom' },
                    { name: '📁 Load from file', value: 'file' }
                ]
            }
        ]);
        
        let eventData;
        
        switch (dataSource) {
            case 'sample':
                eventData = this.eventTemplates[socketType][eventType].sampleData;
                break;
                
            case 'custom':
                eventData = await this.collectEventDataInteractively(this.eventTemplates[socketType][eventType]);
                break;
                
            case 'file':
                const { filePath } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'filePath',
                        message: 'Enter file path:',
                        validate: async (input) => {
                            try {
                                await fs.access(input);
                                return true;
                            } catch (error) {
                                return 'File not found';
                            }
                        }
                    }
                ]);
                
                try {
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    eventData = JSON.parse(fileContent);
                } catch (error) {
                    console.log(chalk.red(`❌ Error reading file: ${error.message}`));
                    return;
                }
                break;
        }
        
        // Show data preview
        console.log('\n📋 Event Data Preview:');
        console.log(JSON.stringify(eventData, null, 2));
        
        // Confirm and trigger
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Trigger this event?',
                default: true
            }
        ]);
        
        if (confirm) {
            await this.triggerEvent(eventType, {
                data: eventData,
                socket: socketType,
                wait: true
            });
        } else {
            console.log('Event cancelled');
        }
    }
    
    // Helper methods
    
    getCurrentSocket() {
        if (this.client && this.client.getCurrentSocket()) {
            return this.client.getCurrentSocket();
        }
        return 'dental'; // Default fallback
    }
    
    async collectEventDataInteractively(eventConfig) {
        console.log(chalk.blue(`\n📝 Enter data for ${eventConfig.description}\n`));
        
        const eventData = {};
        
        for (const field of eventConfig.fields) {
            if (field.type === 'object' || field.type === 'array') {
                // For complex types, use JSON input
                const { value } = await inquirer.prompt([
                    {
                        type: 'editor',
                        name: 'value',
                        message: `${field.name} (${field.type}) - ${field.description}:`,
                        default: field.type === 'object' ? '{}' : '[]'
                    }
                ]);
                
                try {
                    eventData[field.name] = JSON.parse(value);
                } catch (error) {
                    console.log(chalk.yellow(`⚠️ Invalid JSON for ${field.name}, using default`));
                    eventData[field.name] = field.type === 'object' ? {} : [];
                }
            } else {
                // Simple types
                const promptConfig = {
                    type: this.getInquirerType(field.type),
                    name: 'value',
                    message: `${field.name}${field.required ? ' (required)' : ''} - ${field.description}:`
                };
                
                if (field.options) {
                    promptConfig.type = 'list';
                    promptConfig.choices = field.options;
                }
                
                if (field.default !== undefined) {
                    promptConfig.default = field.default;
                }
                
                if (field.required) {
                    promptConfig.validate = (input) => {
                        return input && input.trim().length > 0 ? true : 'This field is required';
                    };
                }
                
                const { value } = await inquirer.prompt([promptConfig]);
                eventData[field.name] = value;
            }
        }
        
        return eventData;
    }
    
    getInquirerType(fieldType) {
        const typeMap = {
            string: 'input',
            number: 'number',
            boolean: 'confirm',
            text: 'editor',
            datetime: 'input',
            select: 'list'
        };
        
        return typeMap[fieldType] || 'input';
    }
    
    validateEventData(data, eventConfig) {
        const errors = [];
        
        // Check required fields
        for (const field of eventConfig.fields) {
            if (field.required && (data[field.name] === undefined || data[field.name] === null || data[field.name] === '')) {
                errors.push(`Required field missing: ${field.name}`);
            }
        }
        
        // Type validation (simplified)
        for (const field of eventConfig.fields) {
            if (data[field.name] !== undefined) {
                const value = data[field.name];
                
                switch (field.type) {
                    case 'number':
                        if (isNaN(value)) {
                            errors.push(`${field.name} must be a number`);
                        }
                        break;
                    case 'boolean':
                        if (typeof value !== 'boolean') {
                            errors.push(`${field.name} must be a boolean`);
                        }
                        break;
                    case 'array':
                        if (!Array.isArray(value)) {
                            errors.push(`${field.name} must be an array`);
                        }
                        break;
                    case 'object':
                        if (typeof value !== 'object' || Array.isArray(value)) {
                            errors.push(`${field.name} must be an object`);
                        }
                        break;
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    async waitForEventResponse(eventType, timeout = 10000) {
        console.log(chalk.blue('⏳ Waiting for event response...'));
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                console.log(chalk.yellow('⚠️ Response timeout'));
                resolve(false);
            }, timeout);
            
            this.client.once('business_event', (data) => {
                clearTimeout(timeoutId);
                console.log(chalk.green('✅ Event response received:'));
                console.log(JSON.stringify(data, null, 2));
                resolve(true);
            });
        });
    }
    
    async logEvent(eventType, eventData, socketType) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            eventType: eventType,
            socketType: socketType,
            data: eventData
        };
        
        const logPath = path.join(process.cwd(), 'event-logs.json');
        
        try {
            let logs = [];
            
            try {
                const existingLogs = await fs.readFile(logPath, 'utf8');
                logs = JSON.parse(existingLogs);
            } catch (error) {
                // File doesn't exist or is invalid, start with empty array
            }
            
            logs.push(logEntry);
            
            // Keep only last 1000 entries
            if (logs.length > 1000) {
                logs = logs.slice(-1000);
            }
            
            await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
            console.log(chalk.gray(`📝 Event logged to ${logPath}`));
            
        } catch (error) {
            console.log(chalk.yellow(`⚠️ Failed to log event: ${error.message}`));
        }
    }
    
    showBatchResults(results) {
        console.log('\n📊 Batch Processing Results\n');
        
        const table = new Table({
            head: ['#', 'Event', 'Status', 'Details'],
            colWidths: [5, 20, 12, 30]
        });
        
        results.forEach((result, index) => {
            let status;
            switch (result.status) {
                case 'success':
                    status = chalk.green('✓ SUCCESS');
                    break;
                case 'failed':
                    status = chalk.red('✗ FAILED');
                    break;
                case 'error':
                    status = chalk.yellow('⚠ ERROR');
                    break;
            }
            
            table.push([
                index + 1,
                result.event,
                status,
                result.error || 'Completed'
            ]);
        });
        
        console.log(table.toString());
        
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const errors = results.filter(r => r.status === 'error').length;
        
        console.log(`\n📈 Summary: ${chalk.green(successful)} successful, ${chalk.red(failed)} failed, ${chalk.yellow(errors)} errors`);
    }
}

module.exports = BusinessCommands;