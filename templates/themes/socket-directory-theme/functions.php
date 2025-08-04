<?php
/**
 * Socket Directory Theme Functions
 * 
 * @package SocketDirectoryTheme
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Theme setup
 */
function socket_directory_theme_setup() {
    // Add theme support
    add_theme_support('post-thumbnails');
    add_theme_support('title-tag');
    add_theme_support('custom-logo');
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));
    
    // Register navigation menus
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'socket-directory-theme'),
        'footer' => __('Footer Menu', 'socket-directory-theme'),
    ));
    
    // Add image sizes
    add_image_size('business-card', 300, 200, true);
    add_image_size('business-gallery', 400, 300, true);
    add_image_size('business-hero', 800, 400, true);
}
add_action('after_setup_theme', 'socket_directory_theme_setup');

/**
 * Enqueue scripts and styles
 */
function socket_directory_theme_scripts() {
    // Main theme stylesheet
    wp_enqueue_style('socket-directory-theme-style', get_stylesheet_uri(), array(), '1.0.0');
    
    // Directory plugin styles (if plugin is active)
    if (function_exists('wp_socket_directory')) {
        wp_enqueue_style('wp-socket-directory');
        wp_enqueue_script('wp-socket-directory');
    }
    
    // Theme JavaScript
    wp_enqueue_script(
        'socket-directory-theme-script',
        get_template_directory_uri() . '/assets/js/theme.js',
        array('jquery'),
        '1.0.0',
        true
    );
    
    // Google Maps API (if API key is set)
    $google_maps_api_key = get_option('socket_google_maps_api_key');
    if ($google_maps_api_key) {
        wp_enqueue_script(
            'google-maps',
            "https://maps.googleapis.com/maps/api/js?key={$google_maps_api_key}&libraries=places",
            array(),
            null,
            true
        );
    }
    
    // Localize script for AJAX
    wp_localize_script('socket-directory-theme-script', 'socketTheme', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('socket_theme_nonce'),
        'current_socket' => get_current_socket_type()
    ));
}
add_action('wp_enqueue_scripts', 'socket_directory_theme_scripts');

/**
 * Register widget areas
 */
function socket_directory_theme_widgets_init() {
    register_sidebar(array(
        'name' => __('Main Sidebar', 'socket-directory-theme'),
        'id' => 'sidebar-main',
        'description' => __('Main sidebar that appears on most pages.', 'socket-directory-theme'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
    
    register_sidebar(array(
        'name' => __('Search Sidebar', 'socket-directory-theme'),
        'id' => 'sidebar-search',
        'description' => __('Sidebar that appears on search and directory pages.', 'socket-directory-theme'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
    
    register_sidebar(array(
        'name' => __('Footer Widget Area 1', 'socket-directory-theme'),
        'id' => 'footer-1',
        'description' => __('First footer widget area.', 'socket-directory-theme'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
    
    register_sidebar(array(
        'name' => __('Footer Widget Area 2', 'socket-directory-theme'),
        'id' => 'footer-2',
        'description' => __('Second footer widget area.', 'socket-directory-theme'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
    
    register_sidebar(array(
        'name' => __('Footer Widget Area 3', 'socket-directory-theme'),
        'id' => 'footer-3',
        'description' => __('Third footer widget area.', 'socket-directory-theme'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ));
}
add_action('widgets_init', 'socket_directory_theme_widgets_init');

/**
 * Get current socket type
 */
function get_current_socket_type() {
    if (function_exists('wp_socket_directory')) {
        return wp_socket_directory()->get_current_socket();
    }
    return 'dental'; // Default fallback
}

/**
 * Get current socket name
 */
function get_current_socket_name() {
    $socket_type = get_current_socket_type();
    
    $socket_names = array(
        'dental' => 'Dental Practices',
        'pizza' => 'Pizza Restaurants',
        'gym' => 'Fitness Centers',
        'restaurant' => 'Restaurants'
    );
    
    return isset($socket_names[$socket_type]) ? $socket_names[$socket_type] : 'Businesses';
}

/**
 * Get socket-specific hero title
 */
function get_socket_hero_title() {
    $socket_type = get_current_socket_type();
    
    $titles = array(
        'dental' => 'Find the Best Dentists Near You',
        'pizza' => 'Discover Amazing Pizza Places',
        'gym' => 'Find Your Perfect Fitness Center',
        'restaurant' => 'Explore Great Restaurants'
    );
    
    return isset($titles[$socket_type]) ? $titles[$socket_type] : 'Find Local Businesses';
}

/**
 * Get socket-specific hero description
 */
function get_socket_hero_description() {
    $socket_type = get_current_socket_type();
    
    $descriptions = array(
        'dental' => 'Connect with trusted dental professionals in your area. Read reviews, compare services, and book appointments online.',
        'pizza' => 'From traditional Italian to creative gourmet, find the perfect pizza for every craving. Order online or visit in person.',
        'gym' => 'Discover fitness centers, gyms, and studios that match your workout style and fitness goals.',
        'restaurant' => 'Explore diverse dining options, from casual eateries to fine dining establishments.'
    );
    
    return isset($descriptions[$socket_type]) ? $descriptions[$socket_type] : 'Discover local businesses and services in your area.';
}

/**
 * Get socket-specific listings title
 */
function get_socket_listings_title() {
    return 'Browse ' . get_current_socket_name();
}

/**
 * Get featured businesses
 */
function get_featured_businesses($number = 6) {
    $query = new WP_Query(array(
        'post_type' => 'business_listing',
        'posts_per_page' => $number,
        'meta_query' => array(
            array(
                'key' => 'featured_business',
                'value' => '1',
                'compare' => '='
            )
        ),
        'orderby' => 'menu_order',
        'order' => 'ASC'
    ));
    
    // If no featured businesses, get recent ones
    if (!$query->have_posts()) {
        $query = new WP_Query(array(
            'post_type' => 'business_listing',
            'posts_per_page' => $number,
            'orderby' => 'date',
            'order' => 'DESC'
        ));
    }
    
    return $query;
}

/**
 * Get business rating
 */
function get_business_rating($business_id) {
    global $wpdb;
    
    $rating = $wpdb->get_var($wpdb->prepare(
        "SELECT AVG(rating) FROM {$wpdb->prefix}business_ratings WHERE business_id = %d",
        $business_id
    ));
    
    return $rating ? round($rating, 1) : 0;
}

/**
 * Get business review count
 */
function get_business_review_count($business_id) {
    global $wpdb;
    
    $count = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$wpdb->prefix}business_ratings WHERE business_id = %d",
        $business_id
    ));
    
    return intval($count);
}

/**
 * Display star rating
 */
function display_star_rating($rating, $max_stars = 5) {
    $output = '<div class="star-rating">';
    
    for ($i = 1; $i <= $max_stars; $i++) {
        $class = ($i <= $rating) ? 'star filled' : 'star empty';
        $output .= '<span class="' . $class . '">★</span>';
    }
    
    $output .= '</div>';
    return $output;
}

/**
 * Get socket-specific body class
 */
function socket_directory_body_class($classes) {
    $socket_type = get_current_socket_type();
    $classes[] = 'socket-' . $socket_type;
    
    return $classes;
}
add_filter('body_class', 'socket_directory_body_class');

/**
 * Customize excerpt length
 */
function socket_directory_excerpt_length($length) {
    if (is_post_type_archive('business_listing') || is_home()) {
        return 20;
    }
    return $length;
}
add_filter('excerpt_length', 'socket_directory_excerpt_length');

/**
 * Customize excerpt more text
 */
function socket_directory_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'socket_directory_excerpt_more');

/**
 * Add schema markup to business listings
 */
function add_business_schema_markup() {
    if (is_singular('business_listing')) {
        $business_id = get_the_ID();
        $socket_type = get_current_socket_type();
        
        $schema = array(
            '@context' => 'https://schema.org',
            '@type' => get_schema_type_for_socket($socket_type),
            'name' => get_the_title(),
            'description' => get_the_excerpt() ?: get_the_content(),
            'url' => get_permalink(),
            'image' => get_the_post_thumbnail_url('large')
        );
        
        // Add address if available
        $address = get_post_meta($business_id, 'address', true);
        $city = get_post_meta($business_id, 'city', true);
        $state = get_post_meta($business_id, 'state', true);
        $zip = get_post_meta($business_id, 'zip_code', true);
        
        if ($address || $city) {
            $schema['address'] = array(
                '@type' => 'PostalAddress',
                'streetAddress' => $address,
                'addressLocality' => $city,
                'addressRegion' => $state,
                'postalCode' => $zip,
                'addressCountry' => 'US'
            );
        }
        
        // Add coordinates if available
        $lat = get_post_meta($business_id, 'latitude', true);
        $lng = get_post_meta($business_id, 'longitude', true);
        
        if ($lat && $lng) {
            $schema['geo'] = array(
                '@type' => 'GeoCoordinates',
                'latitude' => $lat,
                'longitude' => $lng
            );
        }
        
        // Add contact info
        $phone = get_post_meta($business_id, 'phone', true);
        if ($phone) {
            $schema['telephone'] = $phone;
        }
        
        // Add rating if available
        $rating = get_business_rating($business_id);
        $review_count = get_business_review_count($business_id);
        
        if ($rating && $review_count) {
            $schema['aggregateRating'] = array(
                '@type' => 'AggregateRating',
                'ratingValue' => $rating,
                'reviewCount' => $review_count
            );
        }
        
        echo '<script type="application/ld+json">' . json_encode($schema, JSON_UNESCAPED_SLASHES) . '</script>';
    }
}
add_action('wp_head', 'add_business_schema_markup');

/**
 * Get Schema.org type for socket
 */
function get_schema_type_for_socket($socket_type) {
    $schema_types = array(
        'dental' => 'Dentist',
        'pizza' => 'Restaurant',
        'gym' => 'ExerciseGym',
        'restaurant' => 'Restaurant'
    );
    
    return isset($schema_types[$socket_type]) ? $schema_types[$socket_type] : 'LocalBusiness';
}

/**
 * Custom post type archive title
 */
function socket_directory_archive_title($title) {
    if (is_post_type_archive('business_listing')) {
        $title = get_current_socket_name() . ' Directory';
    }
    
    return $title;
}
add_filter('get_the_archive_title', 'socket_directory_archive_title');

/**
 * Add custom meta fields to REST API
 */
function add_business_meta_to_rest() {
    if (function_exists('wp_socket_directory')) {
        $socket_manager = new Business_Socket_Manager();
        $meta_fields = $socket_manager->get_socket_meta_fields();
        
        foreach ($meta_fields as $field_key => $field_config) {
            register_rest_field('business_listing', $field_key, array(
                'get_callback' => function($post) use ($field_key) {
                    return get_post_meta($post['id'], $field_key, true);
                },
                'update_callback' => function($value, $post) use ($field_key) {
                    return update_post_meta($post->ID, $field_key, $value);
                },
                'schema' => array(
                    'description' => $field_config['label'],
                    'type' => 'string',
                    'context' => array('view', 'edit')
                )
            ));
        }
    }
}
add_action('rest_api_init', 'add_business_meta_to_rest');

/**
 * Modify main query for business listings
 */
function socket_directory_modify_main_query($query) {
    if (!is_admin() && $query->is_main_query()) {
        if (is_home() || is_front_page()) {
            // Show business listings on homepage
            $query->set('post_type', array('post', 'business_listing'));
            $query->set('posts_per_page', 6);
        }
    }
}
add_action('pre_get_posts', 'socket_directory_modify_main_query');

/**
 * Add custom CSS for socket-specific styling
 */
function socket_directory_custom_css() {
    $socket_type = get_current_socket_type();
    
    $socket_colors = array(
        'dental' => array(
            'primary' => '#00a0d2',
            'dark' => '#007ba1'
        ),
        'pizza' => array(
            'primary' => '#d63638',
            'dark' => '#b32d2e'
        ),
        'gym' => array(
            'primary' => '#00ba37',
            'dark' => '#00a532'
        )
    );
    
    if (isset($socket_colors[$socket_type])) {
        $colors = $socket_colors[$socket_type];
        echo "<style>
            :root {
                --socket-primary: {$colors['primary']};
                --socket-primary-dark: {$colors['dark']};
            }
            .socket-{$socket_type} .btn,
            .socket-{$socket_type} .search-button {
                background-color: {$colors['primary']};
            }
            .socket-{$socket_type} .btn:hover,
            .socket-{$socket_type} .search-button:hover {
                background-color: {$colors['dark']};
            }
        </style>";
    }
}
add_action('wp_head', 'socket_directory_custom_css');

/**
 * Theme customizer
 */
function socket_directory_customize_register($wp_customize) {
    // Socket Settings Section
    $wp_customize->add_section('socket_settings', array(
        'title' => __('Socket Directory Settings', 'socket-directory-theme'),
        'priority' => 30,
    ));
    
    // Hero section toggle
    $wp_customize->add_setting('show_hero_section', array(
        'default' => true,
        'sanitize_callback' => 'wp_validate_boolean',
    ));
    
    $wp_customize->add_control('show_hero_section', array(
        'label' => __('Show Hero Section', 'socket-directory-theme'),
        'section' => 'socket_settings',
        'type' => 'checkbox',
    ));
    
    // Featured businesses toggle
    $wp_customize->add_setting('show_featured_businesses', array(
        'default' => true,
        'sanitize_callback' => 'wp_validate_boolean',
    ));
    
    $wp_customize->add_control('show_featured_businesses', array(
        'label' => __('Show Featured Businesses', 'socket-directory-theme'),
        'section' => 'socket_settings',
        'type' => 'checkbox',
    ));
}
add_action('customize_register', 'socket_directory_customize_register');