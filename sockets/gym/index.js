/**
 * Gym/Fitness Socket
 * Specialized WordPress & SEO automation for fitness centers
 */

const EventEmitter = require('events');
const chalk = require('chalk');

class GymSocket extends EventEmitter {
    constructor(config = {}) {
        super();
        this.businessType = 'gym';
        this.config = {
            siteName: config.siteName || 'Fitness Center',
            location: config.location || 'Your City',
            services: config.services || [
                'Personal Training',
                'Group Classes',
                'Weight Training',
                'Cardio Equipment',
                'Nutrition Counseling'
            ],
            ...config
        };
        this.isInitialized = false;
    }

    async initialize() {
        console.log(chalk.blue(`💪 Initializing Gym Socket for ${this.config.siteName}...`));
        
        try {
            await this.loadTemplates();
            await this.setupSEOConfig();
            
            this.isInitialized = true;
            console.log(chalk.green('✅ Gym socket initialized successfully'));
            this.emit('initialized', { businessType: this.businessType });
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to initialize gym socket:', error.message));
            throw error;
        }
    }

    async loadTemplates() {
        this.templates = {
            pages: [
                'home',
                'about',
                'memberships',
                'classes',
                'trainers',
                'facilities',
                'nutrition',
                'contact',
                'free-trial',
                'success-stories'
            ],
            services: this.config.services,
            content: {
                seoKeywords: [
                    'gym near me',
                    'fitness center',
                    'personal trainer',
                    'group fitness classes',
                    'weight training',
                    this.config.location + ' gym'
                ]
            }
        };
    }

    async setupSEOConfig() {
        this.seoConfig = {
            localSEO: {
                businessType: 'Gym',
                category: 'Fitness',
                location: this.config.location,
                schema: 'ExerciseGym'
            },
            keywords: {
                primary: `gym ${this.config.location.toLowerCase()}`,
                secondary: [
                    'fitness center',
                    'personal training',
                    'group classes',
                    'weight training',
                    'cardio workout'
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
            services: this.config.services.length
        };
    }
}

module.exports = GymSocket;
