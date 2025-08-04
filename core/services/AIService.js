/**
 * AI Service - Interfaces with AI tools for content generation
 */

const axios = require('axios');
const chalk = require('chalk');

class AIService {
    constructor(config = {}) {
        this.config = config;
        this.apiKeys = {
            openai: config.openaiKey || process.env.OPENAI_API_KEY,
            claude: config.claudeKey || process.env.CLAUDE_API_KEY
        };
        this.contentTemplates = new Map();
        this.generationHistory = [];
        
        console.log(chalk.blue('🤖 AI Service initialized'));
    }

    /**
     * Generate business listing description
     */
    async generateListingDescription(businessType, businessData) {
        console.log(chalk.yellow(`✍️ Generating description for ${businessData.name}...`));
        
        try {
            const prompt = this.buildListingPrompt(businessType, businessData);
            const description = await this.generateContent(prompt, 'description');
            
            console.log(chalk.green(`✅ Generated description for ${businessData.name}`));
            return description;
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to generate listing description:', error.message));
            throw error;
        }
    }

    /**
     * Build prompt for business listing
     */
    buildListingPrompt(businessType, businessData) {
        const templates = {
            dental: `Write a professional description for ${businessData.name}, a dental practice located in ${businessData.location}. 
                     Specialties: ${businessData.specialties?.join(', ') || 'General dentistry'}. 
                     Include their commitment to patient care, modern technology, and comfort. 
                     Keep it under 150 words and make it engaging for potential patients.`,
            
            pizza: `Write an appetizing description for ${businessData.name}, a pizza restaurant in ${businessData.location}. 
                    Cuisine: ${businessData.cuisine || 'Italian pizza'}. 
                    Highlight their fresh ingredients, authentic recipes, and dining atmosphere. 
                    Keep it under 150 words and make it mouth-watering for potential customers.`,
            
            gym: `Write an motivating description for ${businessData.name}, a fitness center in ${businessData.location}. 
                  Services: ${businessData.services?.join(', ') || 'Fitness training, gym equipment'}. 
                  Emphasize their equipment, trainers, and community atmosphere. 
                  Keep it under 150 words and make it inspiring for potential members.`,
            
            default: `Write a professional description for ${businessData.name}, a ${businessType} business in ${businessData.location}. 
                      Services: ${businessData.services?.join(', ') || 'Professional services'}. 
                      Highlight their expertise, quality service, and customer satisfaction. 
                      Keep it under 150 words and make it compelling for potential customers.`
        };
        
        return templates[businessType] || templates.default;
    }

    /**
     * Generate content using AI (simulated)
     */
    async generateContent(prompt, type = 'general') {
        // Simulate API call to AI service
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Return simulated content based on type
        const generatedContent = this.simulateAIResponse(prompt, type);
        
        // Store in history
        this.generationHistory.push({
            prompt,
            type,
            content: generatedContent,
            timestamp: new Date()
        });
        
        return generatedContent;
    }

    /**
     * Simulate AI response (replace with actual API calls)
     */
    simulateAIResponse(prompt, type) {
        const responses = {
            description: [
                "A premier destination offering exceptional service and expertise in the local community. With years of experience and a commitment to excellence, they provide personalized solutions tailored to each client's unique needs. Their professional team uses state-of-the-art technology and proven methods to deliver outstanding results.",
                
                "Known for their outstanding reputation and customer-focused approach, this established business has been serving the community with dedication and professionalism. They pride themselves on quality service, attention to detail, and building lasting relationships with their clients.",
                
                "A trusted local business that combines expertise with exceptional customer service. Their experienced team is committed to providing high-quality solutions and personalized attention to every client. With modern facilities and a proven track record, they continue to exceed expectations."
            ],
            
            blog: [
                "In today's competitive landscape, finding the right service provider can make all the difference. Here are the key factors to consider when making your choice, along with expert tips and insights from industry professionals.",
                
                "The industry has evolved significantly in recent years, with new technologies and approaches transforming how services are delivered. This comprehensive guide explores the latest trends and what they mean for customers.",
                
                "Quality and reliability are paramount when choosing a service provider. This article breaks down the essential questions to ask and red flags to watch for during your selection process."
            ],
            
            review: [
                "Absolutely fantastic experience! The team was professional, knowledgeable, and went above and beyond to ensure everything was perfect. I couldn't be happier with the results and would definitely recommend them to anyone.",
                
                "Outstanding service from start to finish. The staff was friendly and accommodating, and the quality of work exceeded my expectations. Will definitely be returning and recommending to friends and family.",
                
                "Impressed by their attention to detail and commitment to customer satisfaction. The entire process was smooth and hassle-free, and the final result was exactly what I was hoping for."
            ]
        };
        
        const typeResponses = responses[type] || responses.description;
        return typeResponses[Math.floor(Math.random() * typeResponses.length)];
    }

    /**
     * Generate blog post content
     */
    async generateBlogPost(businessType, topic, keywords = []) {
        console.log(chalk.yellow(`📝 Generating blog post: ${topic} for ${businessType}...`));
        
        try {
            const prompt = `Write a comprehensive blog post about "${topic}" for a ${businessType} directory website. 
                           Include these keywords naturally: ${keywords.join(', ')}. 
                           Structure: Introduction, 3-4 main sections, conclusion. 
                           Target length: 800-1200 words. 
                           Make it informative and engaging for potential customers.`;
            
            const content = await this.generateContent(prompt, 'blog');
            
            const blogPost = {
                title: topic,
                content: content,
                excerpt: content.substring(0, 160) + '...',
                keywords: keywords,
                wordCount: content.split(' ').length,
                readingTime: Math.ceil(content.split(' ').length / 200), // Average reading speed
                generatedAt: new Date()
            };
            
            console.log(chalk.green(`✅ Generated blog post: ${topic}`));
            return blogPost;
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to generate blog post:', error.message));
            throw error;
        }
    }

    /**
     * Generate customer reviews (for demonstration/testing)
     */
    async generateReviews(businessType, businessName, count = 5) {
        console.log(chalk.yellow(`⭐ Generating ${count} reviews for ${businessName}...`));
        
        const reviews = [];
        
        for (let i = 0; i < count; i++) {
            const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars
            const prompt = `Generate a realistic customer review for ${businessName}, a ${businessType} business. 
                           Rating: ${rating}/5 stars. Make it specific and authentic.`;
            
            const reviewText = await this.generateContent(prompt, 'review');
            
            reviews.push({
                rating,
                text: reviewText,
                author: `Customer ${i + 1}`,
                date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in last 90 days
                verified: Math.random() > 0.3 // 70% verified
            });
            
            // Add delay to simulate realistic generation
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(chalk.green(`✅ Generated ${reviews.length} reviews for ${businessName}`));
        return reviews;
    }

    /**
     * Generate category descriptions
     */
    async generateCategoryDescription(businessType, category) {
        const prompt = `Write a SEO-optimized description for the "${category}" category in a ${businessType} directory. 
                       Explain what services are included, benefits for customers, and how to choose the right provider. 
                       Keep it under 200 words and include relevant keywords naturally.`;
        
        return await this.generateContent(prompt, 'description');
    }

    /**
     * Generate FAQ content
     */
    async generateFAQs(businessType, count = 10) {
        console.log(chalk.yellow(`❓ Generating ${count} FAQs for ${businessType}...`));
        
        const faqTemplates = {
            dental: [
                "How often should I visit the dentist?",
                "What should I expect during a dental cleaning?",
                "How can I find a good dentist in my area?",
                "What are the signs I need to see a dentist?",
                "How much do dental procedures typically cost?"
            ],
            pizza: [
                "What makes a great pizza?",
                "How do I choose the best pizza restaurant?",
                "What are the most popular pizza toppings?",
                "How long does pizza delivery usually take?",
                "What's the difference between New York and Chicago style pizza?"
            ],
            gym: [
                "How do I choose the right gym?",
                "What should I look for in a fitness center?",
                "How often should I work out?",
                "What equipment do I need to get started?",
                "How much does a gym membership typically cost?"
            ]
        };
        
        const questions = faqTemplates[businessType] || [
            `How do I choose the best ${businessType} service?`,
            `What should I expect from a ${businessType} provider?`,
            `How much do ${businessType} services cost?`
        ];
        
        const faqs = [];
        
        for (const question of questions.slice(0, count)) {
            const prompt = `Answer this question for a ${businessType} directory: "${question}" 
                           Provide a helpful, informative answer in 2-3 sentences.`;
            
            const answer = await this.generateContent(prompt, 'description');
            
            faqs.push({
                question,
                answer,
                category: businessType
            });
        }
        
        console.log(chalk.green(`✅ Generated ${faqs.length} FAQs for ${businessType}`));
        return faqs;
    }

    /**
     * Optimize content for SEO
     */
    async optimizeForSEO(content, keywords, businessType) {
        console.log(chalk.yellow(`🔍 Optimizing content for SEO...`));
        
        // Simulate SEO optimization
        const optimizedContent = {
            original: content,
            optimized: content, // In real implementation, would enhance with keywords
            keywordDensity: this.calculateKeywordDensity(content, keywords),
            readabilityScore: this.calculateReadabilityScore(content),
            suggestions: [
                'Add more relevant keywords naturally',
                'Include internal links to related content',
                'Add subheadings for better structure'
            ],
            optimizedAt: new Date()
        };
        
        console.log(chalk.green(`✅ Content optimized for SEO`));
        return optimizedContent;
    }

    /**
     * Calculate keyword density
     */
    calculateKeywordDensity(content, keywords) {
        const words = content.toLowerCase().split(/\s+/);
        const wordCount = words.length;
        
        const density = {};
        
        keywords.forEach(keyword => {
            const keywordWords = keyword.toLowerCase().split(/\s+/);
            let count = 0;
            
            for (let i = 0; i <= words.length - keywordWords.length; i++) {
                const phrase = words.slice(i, i + keywordWords.length).join(' ');
                if (phrase === keyword.toLowerCase()) {
                    count++;
                }
            }
            
            density[keyword] = {
                count,
                density: (count / wordCount) * 100
            };
        });
        
        return density;
    }

    /**
     * Calculate readability score (simplified)
     */
    calculateReadabilityScore(content) {
        const sentences = content.split(/[.!?]+/).length;
        const words = content.split(/\s+/).length;
        const avgWordsPerSentence = words / sentences;
        
        // Simplified readability score
        let score = 100;
        if (avgWordsPerSentence > 20) score -= 10;
        if (avgWordsPerSentence > 25) score -= 10;
        
        return {
            score: Math.max(score, 60),
            avgWordsPerSentence,
            totalWords: words,
            totalSentences: sentences
        };
    }

    /**
     * Batch generate content for multiple businesses
     */
    async batchGenerateContent(businessType, businesses, contentType = 'description') {
        console.log(chalk.yellow(`🔄 Batch generating ${contentType} for ${businesses.length} businesses...`));
        
        const results = [];
        
        for (const business of businesses) {
            try {
                let content;
                
                switch (contentType) {
                    case 'description':
                        content = await this.generateListingDescription(businessType, business);
                        break;
                    case 'reviews':
                        content = await this.generateReviews(businessType, business.name, 3);
                        break;
                    default:
                        content = await this.generateContent(`Generate ${contentType} for ${business.name}`, contentType);
                }
                
                results.push({
                    business: business.name,
                    content,
                    status: 'success'
                });
                
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                results.push({
                    business: business.name,
                    error: error.message,
                    status: 'failed'
                });
            }
        }
        
        const successful = results.filter(r => r.status === 'success').length;
        console.log(chalk.green(`✅ Generated content for ${successful} of ${businesses.length} businesses`));
        
        return results;
    }

    /**
     * Get generation statistics
     */
    getGenerationStats() {
        const stats = {
            totalGenerations: this.generationHistory.length,
            byType: {},
            recentGenerations: this.generationHistory.slice(-10),
            averageLength: 0
        };
        
        this.generationHistory.forEach(item => {
            stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
            stats.averageLength += item.content.length;
        });
        
        stats.averageLength = Math.round(stats.averageLength / this.generationHistory.length) || 0;
        
        return stats;
    }
}

module.exports = AIService;