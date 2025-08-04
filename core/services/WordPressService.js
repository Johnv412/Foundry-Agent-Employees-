/**
 * WordPress Service - Handles WordPress site management via REST API
 */

const axios = require('axios');
const chalk = require('chalk');

class WordPressService {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'http://localhost/wp-json/wp/v2';
        this.auth = config.auth || {};
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Set up authentication if provided
        if (this.auth.username && this.auth.password) {
            this.client.defaults.auth = this.auth;
        }
        
        console.log(chalk.blue('🌐 WordPress Service initialized'));
    }

    /**
     * Configure WordPress for specific business type
     */
    async configure(businessType, config) {
        console.log(chalk.yellow(`🔧 Configuring WordPress for ${businessType}...`));
        
        try {
            // Install required plugins
            await this.installBusinessPlugins(businessType);
            
            // Configure theme
            await this.configureTheme(businessType, config);
            
            // Set up custom post types
            await this.setupCustomPostTypes(businessType);
            
            // Configure menus and widgets
            await this.setupNavigation(businessType);
            
            console.log(chalk.green(`✅ WordPress configured for ${businessType}`));
            
        } catch (error) {
            console.error(chalk.red('❌ WordPress configuration failed:', error.message));
            throw error;
        }
    }

    /**
     * Install business-specific plugins
     */
    async installBusinessPlugins(businessType) {
        const pluginMap = {
            dental: ['appointment-booking', 'medical-directory', 'doctor-reviews'],
            pizza: ['restaurant-menu', 'online-ordering', 'delivery-zones'],
            gym: ['class-scheduler', 'membership-manager', 'trainer-profiles'],
            default: ['directory-pro', 'seo-toolkit', 'contact-forms']
        };
        
        const plugins = pluginMap[businessType] || pluginMap.default;
        
        for (const plugin of plugins) {
            try {
                // Simulate plugin installation
                console.log(chalk.blue(`📦 Installing plugin: ${plugin}`));
                await this.simulatePluginInstall(plugin);
            } catch (error) {
                console.warn(chalk.yellow(`⚠️ Failed to install ${plugin}: ${error.message}`));
            }
        }
    }

    /**
     * Simulate plugin installation (replace with actual WP-CLI or REST API calls)
     */
    async simulatePluginInstall(pluginName) {
        // Simulate installation time
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(chalk.green(`✅ Plugin ${pluginName} installed`));
    }

    /**
     * Configure theme for business type
     */
    async configureTheme(businessType, config) {
        const themeConfig = {
            dental: {
                colors: { primary: '#4A90E2', secondary: '#50C878' },
                layout: 'medical',
                features: ['appointment-booking', 'doctor-profiles']
            },
            pizza: {
                colors: { primary: '#FF6B6B', secondary: '#4ECDC4' },
                layout: 'restaurant',
                features: ['menu-display', 'online-ordering']
            },
            gym: {
                colors: { primary: '#FF9500', secondary: '#007AFF' },
                layout: 'fitness',
                features: ['class-schedules', 'trainer-profiles']
            }
        };
        
        const settings = themeConfig[businessType] || themeConfig.dental;
        console.log(chalk.blue(`🎨 Configuring ${businessType} theme with settings:`, settings));
    }

    /**
     * Set up custom post types for business
     */
    async setupCustomPostTypes(businessType) {
        const postTypeMap = {
            dental: ['dentists', 'procedures', 'clinics'],
            pizza: ['restaurants', 'menu-items', 'locations'],
            gym: ['gyms', 'trainers', 'classes'],
            default: ['listings', 'categories', 'reviews']
        };
        
        const postTypes = postTypeMap[businessType] || postTypeMap.default;
        
        for (const postType of postTypes) {
            await this.createCustomPostType(postType, businessType);
        }
    }

    /**
     * Create custom post type
     */
    async createCustomPostType(postType, businessType) {
        const postTypeConfig = {
            name: postType,
            public: true,
            supports: ['title', 'editor', 'thumbnail', 'custom-fields'],
            has_archive: true,
            rewrite: { slug: postType }
        };
        
        console.log(chalk.blue(`📝 Creating post type: ${postType} for ${businessType}`));
        // In real implementation, this would register the post type via REST API
    }

    /**
     * Set up navigation menus
     */
    async setupNavigation(businessType) {
        const menuStructure = {
            dental: ['Home', 'Find Dentists', 'Procedures', 'About', 'Contact'],
            pizza: ['Home', 'Restaurants', 'Menu', 'Order Online', 'Contact'],
            gym: ['Home', 'Find Gyms', 'Classes', 'Trainers', 'Contact'],
            default: ['Home', 'Directory', 'Categories', 'About', 'Contact']
        };
        
        const menuItems = menuStructure[businessType] || menuStructure.default;
        console.log(chalk.blue(`🧭 Setting up navigation for ${businessType}:`, menuItems));
    }

    /**
     * Create a new post/page
     */
    async createPost(data) {
        try {
            const response = await this.client.post('/posts', data);
            console.log(chalk.green(`✅ Post created: ${response.data.title.rendered}`));
            return response.data;
        } catch (error) {
            console.error(chalk.red('❌ Failed to create post:', error.message));
            throw error;
        }
    }

    /**
     * Update existing post/page
     */
    async updatePost(postId, data) {
        try {
            const response = await this.client.put(`/posts/${postId}`, data);
            console.log(chalk.green(`✅ Post updated: ${response.data.title.rendered}`));
            return response.data;
        } catch (error) {
            console.error(chalk.red('❌ Failed to update post:', error.message));
            throw error;
        }
    }

    /**
     * Get posts by criteria
     */
    async getPosts(params = {}) {
        try {
            const response = await this.client.get('/posts', { params });
            return response.data;
        } catch (error) {
            console.error(chalk.red('❌ Failed to get posts:', error.message));
            throw error;
        }
    }

    /**
     * Create business directory listing
     */
    async createDirectoryListing(businessType, listingData) {
        const postData = {
            title: listingData.name,
            content: listingData.description,
            status: 'publish',
            meta: {
                business_type: businessType,
                address: listingData.address,
                phone: listingData.phone,
                website: listingData.website,
                rating: listingData.rating || 0
            }
        };
        
        return await this.createPost(postData);
    }

    /**
     * Bulk import directory listings
     */
    async bulkImportListings(businessType, listings) {
        console.log(chalk.yellow(`📦 Bulk importing ${listings.length} listings for ${businessType}...`));
        
        const results = [];
        for (const listing of listings) {
            try {
                const result = await this.createDirectoryListing(businessType, listing);
                results.push(result);
                
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(chalk.red(`❌ Failed to import listing ${listing.name}:`, error.message));
            }
        }
        
        console.log(chalk.green(`✅ Imported ${results.length} of ${listings.length} listings`));
        return results;
    }

    /**
     * Get site health status
     */
    async getSiteHealth() {
        try {
            // Check if WordPress is accessible
            const response = await this.client.get('/');
            return {
                status: 'healthy',
                version: response.headers['wp-version'] || 'unknown',
                timestamp: new Date()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

module.exports = WordPressService;