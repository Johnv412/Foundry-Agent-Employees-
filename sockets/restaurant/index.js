/**
 * General Restaurant Socket
 * Specialized WordPress & SEO automation for restaurants
 */

const EventEmitter = require('events');
const chalk = require('chalk');

class RestaurantSocket extends EventEmitter {
    constructor(config = {}) {
        super();
        this.businessType = 'restaurant';
        this.config = {
            siteName: config.siteName || 'Restaurant',
            location: config.location || 'Your City',
            cuisine: config.cuisine || 'American',
            services: config.services || [
                'Dine-In',
                'Takeout',
                'Delivery',
                'Catering',
                'Private Events'
            ],
            ...config
        };
        this.isInitialized = false;
    }

    async initialize() {
        console.log(chalk.blue(`🍽️  Initializing Restaurant Socket for ${this.config.siteName}...`));
        
        try {
            await this.loadTemplates();
            await this.setupSEOConfig();
            
            this.isInitialized = true;
            console.log(chalk.green('✅ Restaurant socket initialized successfully'));
            this.emit('initialized', { businessType: this.businessType });
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to initialize restaurant socket:', error.message));
            throw error;
        }
    }

    async loadTemplates() {
        this.templates = {
            pages: [
                'home',
                'menu',
                'about',
                'reservations',
                'catering',
                'events',
                'contact',
                'hours',
                'reviews',
                'gallery'
            ],
            services: this.config.services,
            cuisine: this.config.cuisine,
            content: {
                seoKeywords: [
                    'restaurant near me',
                    `${this.config.cuisine.toLowerCase()} restaurant`,
                    'fine dining',
                    'restaurant reservations',
                    'catering services',
                    this.config.location + ' restaurant'
                ]
            }
        };
    }

    async setupSEOConfig() {
        this.seoConfig = {
            localSEO: {
                businessType: 'Restaurant',
                category: `${this.config.cuisine} Restaurant`,
                location: this.config.location,
                schema: 'Restaurant'
            },
            keywords: {
                primary: `${this.config.cuisine.toLowerCase()} restaurant ${this.config.location.toLowerCase()}`,
                secondary: [
                    'restaurant near me',
                    'fine dining',
                    'restaurant reservations',
                    'catering services',
                    `${this.config.cuisine.toLowerCase()} food`
                ]
            }
        };
    }

    getStatus() {
        return {
            businessType: this.businessType,
            isInitialized: this.isInitialized,
            siteName: this.config.siteName,
            location: this.config.location,
            cuisine: this.config.cuisine,
            services: this.config.services.length
        };
    }
}

module.exports = RestaurantSocket;
