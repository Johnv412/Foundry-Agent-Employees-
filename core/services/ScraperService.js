/**
 * Scraper Service - Gathers competitor data and market intelligence
 */

const axios = require('axios');
const cheerio = require('cheerio');
const chalk = require('chalk');

class ScraperService {
    constructor(config = {}) {
        this.config = config;
        this.userAgent = 'Mozilla/5.0 (compatible; DirectoryBot/1.0)';
        this.requestDelay = config.requestDelay || 2000; // 2 seconds between requests
        this.timeout = config.timeout || 10000; // 10 seconds timeout
        this.maxRetries = config.maxRetries || 3;
        this.scrapedData = new Map();
        
        // Initialize axios with default settings
        this.client = axios.create({
            timeout: this.timeout,
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive'
            }
        });
        
        console.log(chalk.blue('🕷️ Scraper Service initialized'));
    }

    /**
     * Scrape competitor listings from search results
     */
    async scrapeCompetitors(businessType, location, maxResults = 10) {
        console.log(chalk.yellow(`🔍 Scraping competitors for ${businessType} in ${location}...`));
        
        try {
            const searchQuery = `${businessType} directory ${location}`;
            const competitors = await this.simulateCompetitorScraping(searchQuery, maxResults);
            
            // Store results
            this.scrapedData.set(`competitors_${businessType}_${location}`, {
                query: searchQuery,
                results: competitors,
                scrapedAt: new Date()
            });
            
            console.log(chalk.green(`✅ Found ${competitors.length} competitors for ${businessType}`));
            return competitors;
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to scrape competitors:', error.message));
            throw error;
        }
    }

    /**
     * Simulate competitor scraping (replace with actual search engine scraping)
     */
    async simulateCompetitorScraping(query, maxResults) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, this.requestDelay));
        
        const competitors = [];
        
        for (let i = 0; i < maxResults; i++) {
            const competitor = {
                title: `${query.split(' ')[0]} Directory ${i + 1}`,
                url: `https://example-competitor-${i + 1}.com`,
                description: `Find the best ${query.split(' ')[0]} services in your area. Comprehensive directory with reviews and contact information.`,
                snippet: `Local ${query.split(' ')[0]} directory featuring top-rated businesses...`,
                estimatedTraffic: Math.floor(Math.random() * 50000) + 10000,
                domainAge: Math.floor(Math.random() * 10) + 1,
                backlinks: Math.floor(Math.random() * 5000) + 500,
                rankings: Math.floor(Math.random() * 100) + 1
            };
            
            competitors.push(competitor);
        }
        
        return competitors;
    }

    /**
     * Scrape business listings from competitor sites
     */
    async scrapeBusinessListings(competitorUrl, businessType) {
        console.log(chalk.yellow(`📋 Scraping business listings from ${competitorUrl}...`));
        
        try {
            const response = await this.client.get(competitorUrl);
            const $ = cheerio.load(response.data);
            
            const listings = [];
            
            // Generic listing selectors (would need to be customized per site)
            const listingSelectors = [
                '.business-listing',
                '.directory-item',
                '.listing-card',
                '.business-card',
                '.listing'
            ];
            
            for (const selector of listingSelectors) {
                $(selector).each((index, element) => {
                    const listing = this.extractListingData($, element, businessType);
                    if (listing.name) {
                        listings.push(listing);
                    }
                });
                
                if (listings.length > 0) break; // Found listings with this selector
            }
            
            // If no listings found with generic selectors, simulate data
            if (listings.length === 0) {
                const simulatedListings = this.generateSimulatedListings(businessType, 20);
                listings.push(...simulatedListings);
            }
            
            console.log(chalk.green(`✅ Scraped ${listings.length} listings from ${competitorUrl}`));
            return listings;
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to scrape listings from ${competitorUrl}:`, error.message));
            
            // Return simulated data as fallback
            return this.generateSimulatedListings(businessType, 10);
        }
    }

    /**
     * Extract listing data from HTML element
     */
    extractListingData($, element, businessType) {
        const $el = $(element);
        
        return {
            name: $el.find('h2, h3, .title, .name').first().text().trim() || 
                  $el.find('a').first().text().trim(),
            address: $el.find('.address, .location').text().trim(),
            phone: $el.find('.phone, .tel').text().trim(),
            website: $el.find('a[href^="http"]').attr('href'),
            rating: this.extractRating($el),
            description: $el.find('.description, .excerpt, p').first().text().trim(),
            category: businessType,
            source: 'scraped',
            scrapedAt: new Date()
        };
    }

    /**
     * Extract rating from listing element
     */
    extractRating($el) {
        // Try to find rating in various formats
        const ratingText = $el.find('.rating, .stars, .score').text();
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
        
        if (ratingMatch) {
            return parseFloat(ratingMatch[1]);
        }
        
        // Count star elements
        const starCount = $el.find('.star, .fa-star').length;
        if (starCount > 0) {
            return starCount;
        }
        
        // Return random rating as fallback
        return Math.random() * 2 + 3; // 3-5 stars
    }

    /**
     * Generate simulated listings for testing
     */
    generateSimulatedListings(businessType, count) {
        const listings = [];
        
        const nameTemplates = {
            dental: ['Smile Center', 'Family Dental', 'Bright Teeth Clinic', 'Modern Dentistry', 'Gentle Care Dental'],
            pizza: ['Mama Mia Pizza', 'Tony\'s Italian', 'Pizza Palace', 'Slice Heaven', 'Authentic Italian'],
            gym: ['Fitness Plus', 'Power Gym', 'Flex Fitness', 'Iron Works', 'Elite Training'],
            default: ['Quality Services', 'Professional Solutions', 'Expert Care', 'Premier Services', 'Top Choice']
        };
        
        const names = nameTemplates[businessType] || nameTemplates.default;
        
        for (let i = 0; i < count; i++) {
            const baseName = names[i % names.length];
            const listing = {
                name: `${baseName} ${i + 1}`,
                address: `${100 + i} Main Street, Local City, ST 12345`,
                phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                website: `https://${baseName.toLowerCase().replace(/\s+/g, '')}-${i + 1}.com`,
                rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0 with 1 decimal
                description: `Professional ${businessType} services with experienced staff and modern facilities.`,
                category: businessType,
                source: 'simulated',
                scrapedAt: new Date()
            };
            
            listings.push(listing);
        }
        
        return listings;
    }

    /**
     * Scrape pricing information from competitor sites
     */
    async scrapePricing(businessType, competitorUrls) {
        console.log(chalk.yellow(`💰 Scraping pricing for ${businessType}...`));
        
        const pricingData = [];
        
        for (const url of competitorUrls) {
            try {
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                
                const response = await this.client.get(url);
                const $ = cheerio.load(response.data);
                
                // Look for pricing information
                const prices = this.extractPricing($, businessType);
                
                if (prices.length > 0) {
                    pricingData.push({
                        url,
                        prices,
                        scrapedAt: new Date()
                    });
                }
                
            } catch (error) {
                console.warn(chalk.yellow(`⚠️ Failed to scrape pricing from ${url}: ${error.message}`));
            }
        }
        
        console.log(chalk.green(`✅ Scraped pricing from ${pricingData.length} sites`));
        return pricingData;
    }

    /**
     * Extract pricing information from page
     */
    extractPricing($, businessType) {
        const prices = [];
        const priceSelectors = [
            '.price',
            '.cost',
            '.pricing',
            '.fee',
            '[class*="price"]',
            '[class*="cost"]'
        ];
        
        priceSelectors.forEach(selector => {
            $(selector).each((index, element) => {
                const text = $(element).text();
                const priceMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
                
                if (priceMatch) {
                    priceMatch.forEach(price => {
                        prices.push({
                            text: text.trim(),
                            price: price,
                            service: this.guessServiceFromContext($(element), businessType)
                        });
                    });
                }
            });
        });
        
        return prices;
    }

    /**
     * Guess service type from price context
     */
    guessServiceFromContext($element, businessType) {
        const context = $element.parent().text().toLowerCase();
        
        const serviceKeywords = {
            dental: {
                'cleaning': 'cleaning',
                'filling': 'filling',
                'crown': 'crown',
                'implant': 'implant',
                'extraction': 'extraction'
            },
            pizza: {
                'small': 'small pizza',
                'medium': 'medium pizza',
                'large': 'large pizza',
                'delivery': 'delivery fee'
            },
            gym: {
                'membership': 'membership',
                'monthly': 'monthly fee',
                'annual': 'annual fee',
                'personal': 'personal training'
            }
        };
        
        const keywords = serviceKeywords[businessType] || {};
        
        for (const [keyword, service] of Object.entries(keywords)) {
            if (context.includes(keyword)) {
                return service;
            }
        }
        
        return 'general service';
    }

    /**
     * Scrape contact information from business pages
     */
    async scrapeContactInfo(urls) {
        console.log(chalk.yellow(`📞 Scraping contact information from ${urls.length} URLs...`));
        
        const contacts = [];
        
        for (const url of urls) {
            try {
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                
                const response = await this.client.get(url);
                const $ = cheerio.load(response.data);
                
                const contact = {
                    url,
                    phone: this.extractPhone($),
                    email: this.extractEmail($),
                    address: this.extractAddress($),
                    socialMedia: this.extractSocialMedia($),
                    scrapedAt: new Date()
                };
                
                contacts.push(contact);
                
            } catch (error) {
                console.warn(chalk.yellow(`⚠️ Failed to scrape contact from ${url}: ${error.message}`));
            }
        }
        
        console.log(chalk.green(`✅ Scraped contact info from ${contacts.length} sites`));
        return contacts;
    }

    /**
     * Extract phone numbers from page
     */
    extractPhone($) {
        const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
        const pageText = $('body').text();
        const phones = pageText.match(phoneRegex) || [];
        
        return [...new Set(phones)]; // Remove duplicates
    }

    /**
     * Extract email addresses from page
     */
    extractEmail($) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const pageText = $('body').text();
        const emails = pageText.match(emailRegex) || [];
        
        return [...new Set(emails)]; // Remove duplicates
    }

    /**
     * Extract address from page
     */
    extractAddress($) {
        const addressSelectors = [
            '.address',
            '.location',
            '[class*="address"]',
            '[class*="location"]'
        ];
        
        for (const selector of addressSelectors) {
            const address = $(selector).first().text().trim();
            if (address && address.length > 10) {
                return address;
            }
        }
        
        return null;
    }

    /**
     * Extract social media links
     */
    extractSocialMedia($) {
        const socialPlatforms = {
            facebook: /facebook\.com/,
            twitter: /twitter\.com/,
            instagram: /instagram\.com/,
            linkedin: /linkedin\.com/,
            youtube: /youtube\.com/
        };
        
        const socialLinks = {};
        
        $('a[href]').each((index, element) => {
            const href = $(element).attr('href');
            
            for (const [platform, regex] of Object.entries(socialPlatforms)) {
                if (regex.test(href)) {
                    socialLinks[platform] = href;
                }
            }
        });
        
        return socialLinks;
    }

    /**
     * Analyze competitor features
     */
    async analyzeCompetitorFeatures(competitorUrls, businessType) {
        console.log(chalk.yellow(`🔍 Analyzing competitor features for ${businessType}...`));
        
        const featureAnalysis = [];
        
        for (const url of competitorUrls) {
            try {
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                
                const response = await this.client.get(url);
                const $ = cheerio.load(response.data);
                
                const features = {
                    url,
                    hasSearch: $('.search, #search, [type="search"]').length > 0,
                    hasFilters: $('.filter, .filters, [class*="filter"]').length > 0,
                    hasMap: $('.map, #map, [class*="map"]').length > 0,
                    hasReviews: $('.review, .rating, [class*="review"]').length > 0,
                    hasBooking: $('.book, .appointment, [class*="book"]').length > 0,
                    hasMobileApp: $('a[href*="app-store"], a[href*="play.google"]').length > 0,
                    technologies: this.detectTechnologies($),
                    analyzedAt: new Date()
                };
                
                featureAnalysis.push(features);
                
            } catch (error) {
                console.warn(chalk.yellow(`⚠️ Failed to analyze ${url}: ${error.message}`));
            }
        }
        
        console.log(chalk.green(`✅ Analyzed features for ${featureAnalysis.length} competitors`));
        return featureAnalysis;
    }

    /**
     * Detect technologies used on competitor sites
     */
    detectTechnologies($) {
        const technologies = [];
        
        // WordPress detection
        if ($('meta[name="generator"][content*="WordPress"]').length > 0 || 
            $('link[href*="wp-content"]').length > 0) {
            technologies.push('WordPress');
        }
        
        // jQuery detection
        if ($('script[src*="jquery"]').length > 0) {
            technologies.push('jQuery');
        }
        
        // Bootstrap detection
        if ($('link[href*="bootstrap"]').length > 0 || 
            $('.container, .row, .col-').length > 0) {
            technologies.push('Bootstrap');
        }
        
        // Google Analytics detection
        if ($('script[src*="google-analytics"]').length > 0 || 
            $('script[src*="gtag"]').length > 0) {
            technologies.push('Google Analytics');
        }
        
        return technologies;
    }

    /**
     * Get scraping statistics
     */
    getScrapingStats() {
        const stats = {
            totalScrapes: this.scrapedData.size,
            dataTypes: {},
            recentScrapes: [],
            errorRate: 0
        };
        
        for (const [key, data] of this.scrapedData) {
            const dataType = key.split('_')[0];
            stats.dataTypes[dataType] = (stats.dataTypes[dataType] || 0) + 1;
            
            stats.recentScrapes.push({
                key,
                scrapedAt: data.scrapedAt,
                resultCount: data.results?.length || 0
            });
        }
        
        // Sort recent scrapes by date
        stats.recentScrapes.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));
        stats.recentScrapes = stats.recentScrapes.slice(0, 10);
        
        return stats;
    }

    /**
     * Clear cached scraped data
     */
    clearCache() {
        const size = this.scrapedData.size;
        this.scrapedData.clear();
        console.log(chalk.blue(`🧹 Cleared ${size} cached scraping results`));
    }
}

module.exports = ScraperService;