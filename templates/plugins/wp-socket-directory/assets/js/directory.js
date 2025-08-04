/**
 * WP Socket Directory Frontend JavaScript
 * Handles search, filtering, and AJAX interactions
 */

(function($) {
    'use strict';

    class SocketDirectoryApp {
        constructor() {
            this.searchForm = $('.socket-directory-search-form');
            this.resultsContainer = $('.socket-directory-results');
            this.filtersContainer = $('.socket-directory-filters');
            this.mapContainer = $('.directory-map-container');
            
            this.currentSearchParams = {};
            this.isSearching = false;
            this.map = null;
            this.markers = [];
            
            this.init();
        }
        
        init() {
            this.bindEvents();
            this.initializeGeolocation();
            this.loadInitialResults();
            
            // Initialize map if container exists
            if (this.mapContainer.length && typeof google !== 'undefined') {
                this.initializeMap();
            }
        }
        
        bindEvents() {
            // Search form submission
            this.searchForm.on('submit', (e) => {
                e.preventDefault();
                this.performSearch();
            });
            
            // Real-time search suggestions
            $('.search-input[name="query"]').on('input', this.debounce((e) => {
                this.getSuggestions($(e.target).val(), 'business');
            }, 300));
            
            $('.search-input[name="location"]').on('input', this.debounce((e) => {
                this.getSuggestions($(e.target).val(), 'location');
            }, 300));
            
            // Filter changes
            this.filtersContainer.on('change', 'input, select', () => {
                this.performSearch();
            });
            
            // Sort changes
            $('.results-sort select').on('change', () => {
                this.performSearch();
            });
            
            // Pagination
            $(document).on('click', '.pagination-link:not(.disabled)', (e) => {
                e.preventDefault();
                const page = $(e.target).data('page');
                this.performSearch(page);
            });
            
            // Map toggle
            $('.map-toggle-button').on('click', () => {
                this.toggleMap();
            });
            
            // Get current location
            $('.get-current-location').on('click', () => {
                this.getCurrentLocation();
            });
            
            // Business card interactions
            $(document).on('click', '.business-card', (e) => {
                if (!$(e.target).closest('.business-actions').length) {
                    const businessUrl = $(e.currentTarget).find('.business-name a').attr('href');
                    if (businessUrl) {
                        window.open(businessUrl, '_blank');
                    }
                }
            });
        }
        
        performSearch(page = 1) {
            if (this.isSearching) return;
            
            this.isSearching = true;
            this.showLoading();
            
            const searchData = this.collectSearchData();
            searchData.page = page;
            
            $.ajax({
                url: wpSocketDirectory.ajaxurl,
                type: 'POST',
                data: {
                    action: 'directory_search',
                    nonce: wpSocketDirectory.nonce,
                    ...searchData
                },
                success: (response) => {
                    if (response.success) {
                        this.displayResults(response.data);
                        this.updateMap(response.data.businesses);
                        this.updateUrl(searchData);
                    } else {
                        this.showError('Search failed. Please try again.');
                    }
                },
                error: () => {
                    this.showError('Network error. Please check your connection.');
                },
                complete: () => {
                    this.isSearching = false;
                    this.hideLoading();
                }
            });
        }
        
        collectSearchData() {
            const data = {
                query: $('.search-input[name="query"]').val(),
                location: $('.search-input[name="location"]').val(),
                latitude: $('.search-input[name="latitude"]').val(),
                longitude: $('.search-input[name="longitude"]').val(),
                radius: $('.search-input[name="radius"]').val() || 25,
                business_type: $('.search-select[name="business_type"]').val(),
                sort: $('.results-sort select').val() || 'relevance',
                filters: {}
            };
            
            // Collect filter values
            this.filtersContainer.find('input, select').each((index, element) => {
                const $element = $(element);
                const name = $element.attr('name');
                
                if ($element.is(':checkbox')) {
                    if ($element.is(':checked')) {
                        if (!data.filters[name]) data.filters[name] = [];
                        data.filters[name].push($element.val());
                    }
                } else if ($element.is('select') || $element.is('input[type="text"], input[type="number"]')) {
                    const value = $element.val();
                    if (value) {
                        data.filters[name] = value;
                    }
                }
            });
            
            return data;
        }
        
        displayResults(data) {
            const resultsHtml = this.buildResultsHtml(data);
            this.resultsContainer.html(resultsHtml);
            
            // Update results count
            $('.results-count').text(
                data.total + ' results found' + 
                (data.search_params.location ? ' near ' + data.search_params.location : '')
            );
            
            // Build pagination
            this.buildPagination(data);
        }
        
        buildResultsHtml(data) {
            if (!data.businesses || data.businesses.length === 0) {
                return '<div class="no-results"><h3>No businesses found</h3><p>Try adjusting your search criteria.</p></div>';
            }
            
            let html = '<div class="business-grid">';
            
            data.businesses.forEach(business => {
                html += this.buildBusinessCard(business);
            });
            
            html += '</div>';
            return html;
        }
        
        buildBusinessCard(business) {
            const socketClass = `socket-${wpSocketDirectory.current_socket}`;
            const distance = business.distance ? `<div class="business-distance">${business.distance.toFixed(1)} mi</div>` : '';
            const rating = this.buildRating(business.rating, business.review_count);
            const image = business.featured_image ? 
                `<img src="${business.featured_image}" alt="${business.name}" loading="lazy">` : '';
            
            return `
                <div class="business-card ${socketClass}" data-business-id="${business.id}">
                    <div class="business-image">
                        ${image}
                        ${distance}
                    </div>
                    <div class="business-info">
                        <h3 class="business-name">
                            <a href="${business.url}" target="_blank">${business.name}</a>
                        </h3>
                        ${rating}
                        <p class="business-description">${business.description}</p>
                        ${this.buildBusinessMeta(business)}
                        ${this.buildBusinessTags(business)}
                        ${this.buildBusinessActions(business)}
                    </div>
                </div>
            `;
        }
        
        buildRating(rating, reviewCount) {
            if (!rating) return '';
            
            const stars = this.buildStars(rating);
            return `
                <div class="business-rating">
                    <div class="star-rating">${stars}</div>
                    <span class="rating-count">(${reviewCount || 0})</span>
                </div>
            `;
        }
        
        buildStars(rating) {
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += `<span class="star ${i <= rating ? '' : 'empty'}">★</span>`;
            }
            return stars;
        }
        
        buildBusinessMeta(business) {
            let meta = '<div class="business-meta">';
            
            if (business.address) {
                meta += `<div class="meta-item"><span class="meta-icon">📍</span>${business.address}</div>`;
            }
            
            if (business.phone) {
                meta += `<div class="meta-item"><span class="meta-icon">📞</span><a href="tel:${business.phone}">${business.phone}</a></div>`;
            }
            
            if (business.website) {
                meta += `<div class="meta-item"><span class="meta-icon">🌐</span><a href="${business.website}" target="_blank">Visit Website</a></div>`;
            }
            
            meta += '</div>';
            return meta;
        }
        
        buildBusinessTags(business) {
            let tags = '';
            
            if (business.categories && business.categories.length) {
                tags += '<div class="business-tags">';
                business.categories.forEach(category => {
                    tags += `<span class="business-tag">${category}</span>`;
                });
                tags += '</div>';
            }
            
            return tags;
        }
        
        buildBusinessActions(business) {
            let actions = '<div class="business-actions">';
            
            // Socket-specific actions
            switch (wpSocketDirectory.current_socket) {
                case 'dental':
                    if (business.appointment_booking_url) {
                        actions += `<a href="${business.appointment_booking_url}" class="action-button primary" target="_blank">Book Appointment</a>`;
                    }
                    break;
                    
                case 'pizza':
                    if (business.online_ordering_url) {
                        actions += `<a href="${business.online_ordering_url}" class="action-button primary" target="_blank">Order Online</a>`;
                    }
                    break;
                    
                case 'gym':
                    if (business.trial_membership_url) {
                        actions += `<a href="${business.trial_membership_url}" class="action-button primary" target="_blank">Free Trial</a>`;
                    }
                    break;
            }
            
            actions += `<a href="${business.url}" class="action-button secondary" target="_blank">View Details</a>`;
            actions += '</div>';
            
            return actions;
        }
        
        buildPagination(data) {
            if (data.pages <= 1) return;
            
            let pagination = '<div class="directory-pagination">';
            
            // Previous button
            if (data.current_page > 1) {
                pagination += `<a href="#" class="pagination-link" data-page="${data.current_page - 1}">« Previous</a>`;
            } else {
                pagination += `<span class="pagination-link disabled">« Previous</span>`;
            }
            
            // Page numbers
            const startPage = Math.max(1, data.current_page - 2);
            const endPage = Math.min(data.pages, data.current_page + 2);
            
            if (startPage > 1) {
                pagination += `<a href="#" class="pagination-link" data-page="1">1</a>`;
                if (startPage > 2) {
                    pagination += `<span class="pagination-ellipsis">...</span>`;
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const current = i === data.current_page ? 'current' : '';
                pagination += `<a href="#" class="pagination-link ${current}" data-page="${i}">${i}</a>`;
            }
            
            if (endPage < data.pages) {
                if (endPage < data.pages - 1) {
                    pagination += `<span class="pagination-ellipsis">...</span>`;
                }
                pagination += `<a href="#" class="pagination-link" data-page="${data.pages}">${data.pages}</a>`;
            }
            
            // Next button
            if (data.current_page < data.pages) {
                pagination += `<a href="#" class="pagination-link" data-page="${data.current_page + 1}">Next »</a>`;
            } else {
                pagination += `<span class="pagination-link disabled">Next »</span>`;
            }
            
            pagination += '</div>';
            
            this.resultsContainer.append(pagination);
        }
        
        getSuggestions(query, type) {
            if (query.length < 2) {
                this.hideSuggestions(type);
                return;
            }
            
            $.ajax({
                url: wpSocketDirectory.ajaxurl,
                type: 'POST',
                data: {
                    action: 'get_search_suggestions',
                    nonce: wpSocketDirectory.nonce,
                    query: query,
                    type: type
                },
                success: (response) => {
                    if (response.success) {
                        this.showSuggestions(response.data, type);
                    }
                }
            });
        }
        
        showSuggestions(suggestions, type) {
            const input = $(`.search-input[name="${type === 'business' ? 'query' : 'location'}"]`);
            const container = input.parent();
            
            // Remove existing suggestions
            container.find('.search-suggestions').remove();
            
            if (suggestions.length === 0) return;
            
            let suggestionsHtml = '<div class="search-suggestions">';
            suggestions.forEach(suggestion => {
                suggestionsHtml += `<div class="search-suggestion" data-value="${suggestion.name}">${suggestion.name}</div>`;
            });
            suggestionsHtml += '</div>';
            
            container.css('position', 'relative').append(suggestionsHtml);
            
            // Handle suggestion clicks
            container.find('.search-suggestion').on('click', function() {
                input.val($(this).data('value'));
                container.find('.search-suggestions').remove();
            });
        }
        
        hideSuggestions(type) {
            const input = $(`.search-input[name="${type === 'business' ? 'query' : 'location'}"]`);
            input.parent().find('.search-suggestions').remove();
        }
        
        initializeGeolocation() {
            if ('geolocation' in navigator) {
                $('.get-current-location').show();
            }
        }
        
        getCurrentLocation() {
            if (!('geolocation' in navigator)) {
                alert('Geolocation is not supported by this browser.');
                return;
            }
            
            const button = $('.get-current-location');
            button.prop('disabled', true).text('Getting location...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    $('.search-input[name="latitude"]').val(position.coords.latitude);
                    $('.search-input[name="longitude"]').val(position.coords.longitude);
                    $('.search-input[name="location"]').val('Current Location');
                    
                    // Automatically perform search
                    this.performSearch();
                    
                    button.prop('disabled', false).text('Use Current Location');
                },
                (error) => {
                    alert('Unable to get your location. Please enter a location manually.');
                    button.prop('disabled', false).text('Use Current Location');
                }
            );
        }
        
        initializeMap() {
            this.map = new google.maps.Map(this.mapContainer[0], {
                zoom: 10,
                center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });
        }
        
        updateMap(businesses) {
            if (!this.map || !businesses) return;
            
            // Clear existing markers
            this.markers.forEach(marker => marker.setMap(null));
            this.markers = [];
            
            const bounds = new google.maps.LatLngBounds();
            
            businesses.forEach(business => {
                if (business.latitude && business.longitude) {
                    const position = {
                        lat: parseFloat(business.latitude),
                        lng: parseFloat(business.longitude)
                    };
                    
                    const marker = new google.maps.Marker({
                        position: position,
                        map: this.map,
                        title: business.name
                    });
                    
                    const infoWindow = new google.maps.InfoWindow({
                        content: this.buildMapInfoWindow(business)
                    });
                    
                    marker.addListener('click', () => {
                        infoWindow.open(this.map, marker);
                    });
                    
                    this.markers.push(marker);
                    bounds.extend(position);
                }
            });
            
            if (this.markers.length > 0) {
                this.map.fitBounds(bounds);
            }
        }
        
        buildMapInfoWindow(business) {
            return `
                <div class="map-info-window">
                    <h4><a href="${business.url}" target="_blank">${business.name}</a></h4>
                    <p>${business.address || ''}</p>
                    <p>${business.phone || ''}</p>
                    ${business.rating ? `<div class="rating">${this.buildStars(business.rating)} (${business.review_count || 0})</div>` : ''}
                </div>
            `;
        }
        
        toggleMap() {
            const button = $('.map-toggle-button');
            const isVisible = this.mapContainer.is(':visible');
            
            if (isVisible) {
                this.mapContainer.hide();
                button.removeClass('active').text('Show Map');
            } else {
                this.mapContainer.show();
                button.addClass('active').text('Hide Map');
                
                // Trigger map resize
                if (this.map) {
                    google.maps.event.trigger(this.map, 'resize');
                }
            }
        }
        
        loadInitialResults() {
            // Check for URL parameters and load results if any
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('query') || urlParams.has('location')) {
                // Populate form from URL params
                this.populateFormFromUrl();
                this.performSearch();
            }
        }
        
        populateFormFromUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            
            urlParams.forEach((value, key) => {
                const input = $(`.search-input[name="${key}"], .search-select[name="${key}"]`);
                if (input.length) {
                    input.val(value);
                }
            });
        }
        
        updateUrl(searchData) {
            const url = new URL(window.location);
            
            // Update URL parameters
            Object.keys(searchData).forEach(key => {
                if (searchData[key] && key !== 'filters') {
                    url.searchParams.set(key, searchData[key]);
                }
            });
            
            window.history.replaceState({}, '', url);
        }
        
        showLoading() {
            this.resultsContainer.html(`
                <div class="directory-loading">
                    <div class="loading-spinner"></div>
                    <p>Searching...</p>
                </div>
            `);
        }
        
        hideLoading() {
            // Loading is hidden when results are displayed
        }
        
        showError(message) {
            this.resultsContainer.html(`
                <div class="directory-error">
                    <h3>Search Error</h3>
                    <p>${message}</p>
                </div>
            `);
        }
        
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    }
    
    // Initialize the app when DOM is ready
    $(document).ready(function() {
        window.socketDirectoryApp = new SocketDirectoryApp();
    });
    
})(jQuery);