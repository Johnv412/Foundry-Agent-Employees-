<?php
/**
 * Plugin Name: WP Socket Directory
 * Plugin URI: https://github.com/Johnv412/Foundry-Agent-Employees-
 * Description: Universal business directory plugin with socket-based business type switching
 * Version: 1.0.0
 * Author: Claude Code Agent System
 * License: GPL v2 or later
 * Text Domain: wp-socket-directory
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('WP_SOCKET_DIRECTORY_VERSION', '1.0.0');
define('WP_SOCKET_DIRECTORY_PLUGIN_FILE', __FILE__);
define('WP_SOCKET_DIRECTORY_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WP_SOCKET_DIRECTORY_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main WP Socket Directory class
 */
class WP_Socket_Directory {
    
    private static $instance = null;
    private $current_socket = 'dental'; // Default socket
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        $this->load_dependencies();
        $this->register_post_types();
        $this->register_taxonomies();
        $this->setup_hooks();
    }
    
    private function load_dependencies() {
        require_once WP_SOCKET_DIRECTORY_PLUGIN_DIR . 'includes/class-business-socket-manager.php';
        require_once WP_SOCKET_DIRECTORY_PLUGIN_DIR . 'includes/class-search-engine.php';
        require_once WP_SOCKET_DIRECTORY_PLUGIN_DIR . 'includes/class-api-endpoints.php';
        require_once WP_SOCKET_DIRECTORY_PLUGIN_DIR . 'admin/class-admin-interface.php';
        require_once WP_SOCKET_DIRECTORY_PLUGIN_DIR . 'public/class-public-interface.php';
    }
    
    public function register_post_types() {
        // Business listing post type
        register_post_type('business_listing', array(
            'labels' => array(
                'name' => __('Business Listings', 'wp-socket-directory'),
                'singular_name' => __('Business Listing', 'wp-socket-directory'),
                'menu_name' => __('Directory', 'wp-socket-directory'),
                'add_new' => __('Add New Business', 'wp-socket-directory'),
                'add_new_item' => __('Add New Business Listing', 'wp-socket-directory'),
                'edit_item' => __('Edit Business Listing', 'wp-socket-directory'),
                'new_item' => __('New Business Listing', 'wp-socket-directory'),
                'view_item' => __('View Business Listing', 'wp-socket-directory'),
                'search_items' => __('Search Businesses', 'wp-socket-directory'),
                'not_found' => __('No businesses found', 'wp-socket-directory'),
                'not_found_in_trash' => __('No businesses found in trash', 'wp-socket-directory')
            ),
            'public' => true,
            'has_archive' => true,
            'rewrite' => array('slug' => 'business'),
            'supports' => array(
                'title', 
                'editor', 
                'thumbnail', 
                'excerpt', 
                'custom-fields',
                'comments'
            ),
            'menu_icon' => 'dashicons-building',
            'show_in_rest' => true,
            'capability_type' => 'post',
            'map_meta_cap' => true
        ));
        
        // Socket-specific post types based on current socket
        $this->register_socket_post_types();
    }
    
    private function register_socket_post_types() {
        $socket = $this->get_current_socket();
        
        switch ($socket) {
            case 'dental':
                register_post_type('dental_practice', array(
                    'labels' => array(
                        'name' => __('Dental Practices', 'wp-socket-directory'),
                        'singular_name' => __('Dental Practice', 'wp-socket-directory')
                    ),
                    'public' => true,
                    'supports' => array('title', 'editor', 'thumbnail', 'custom-fields'),
                    'show_in_rest' => true,
                    'menu_icon' => 'dashicons-admin-users'
                ));
                break;
                
            case 'pizza':
                register_post_type('pizza_restaurant', array(
                    'labels' => array(
                        'name' => __('Pizza Restaurants', 'wp-socket-directory'),
                        'singular_name' => __('Pizza Restaurant', 'wp-socket-directory')
                    ),
                    'public' => true,
                    'supports' => array('title', 'editor', 'thumbnail', 'custom-fields'),
                    'show_in_rest' => true,
                    'menu_icon' => 'dashicons-store'
                ));
                break;
                
            case 'gym':
                register_post_type('fitness_center', array(
                    'labels' => array(
                        'name' => __('Fitness Centers', 'wp-socket-directory'),
                        'singular_name' => __('Fitness Center', 'wp-socket-directory')
                    ),
                    'public' => true,
                    'supports' => array('title', 'editor', 'thumbnail', 'custom-fields'),
                    'show_in_rest' => true,
                    'menu_icon' => 'dashicons-universal-access'
                ));
                break;
        }
    }
    
    public function register_taxonomies() {
        // Universal taxonomies
        register_taxonomy('business_category', 'business_listing', array(
            'labels' => array(
                'name' => __('Business Categories', 'wp-socket-directory'),
                'singular_name' => __('Business Category', 'wp-socket-directory')
            ),
            'hierarchical' => true,
            'show_in_rest' => true,
            'rewrite' => array('slug' => 'category')
        ));
        
        register_taxonomy('business_location', 'business_listing', array(
            'labels' => array(
                'name' => __('Locations', 'wp-socket-directory'),
                'singular_name' => __('Location', 'wp-socket-directory')
            ),
            'hierarchical' => true,
            'show_in_rest' => true,
            'rewrite' => array('slug' => 'location')
        ));
        
        // Socket-specific taxonomies
        $this->register_socket_taxonomies();
    }
    
    private function register_socket_taxonomies() {
        $socket = $this->get_current_socket();
        
        switch ($socket) {
            case 'dental':
                register_taxonomy('dental_specialty', array('business_listing', 'dental_practice'), array(
                    'labels' => array(
                        'name' => __('Dental Specialties', 'wp-socket-directory'),
                        'singular_name' => __('Dental Specialty', 'wp-socket-directory')
                    ),
                    'hierarchical' => true,
                    'show_in_rest' => true
                ));
                
                register_taxonomy('insurance_accepted', array('business_listing', 'dental_practice'), array(
                    'labels' => array(
                        'name' => __('Insurance Accepted', 'wp-socket-directory'),
                        'singular_name' => __('Insurance', 'wp-socket-directory')
                    ),
                    'hierarchical' => false,
                    'show_in_rest' => true
                ));
                break;
                
            case 'pizza':
                register_taxonomy('cuisine_type', array('business_listing', 'pizza_restaurant'), array(
                    'labels' => array(
                        'name' => __('Cuisine Types', 'wp-socket-directory'),
                        'singular_name' => __('Cuisine Type', 'wp-socket-directory')
                    ),
                    'hierarchical' => true,
                    'show_in_rest' => true
                ));
                
                register_taxonomy('delivery_area', array('business_listing', 'pizza_restaurant'), array(
                    'labels' => array(
                        'name' => __('Delivery Areas', 'wp-socket-directory'),
                        'singular_name' => __('Delivery Area', 'wp-socket-directory')
                    ),
                    'hierarchical' => false,
                    'show_in_rest' => true
                ));
                break;
                
            case 'gym':
                register_taxonomy('fitness_type', array('business_listing', 'fitness_center'), array(
                    'labels' => array(
                        'name' => __('Fitness Types', 'wp-socket-directory'),
                        'singular_name' => __('Fitness Type', 'wp-socket-directory')
                    ),
                    'hierarchical' => true,
                    'show_in_rest' => true
                ));
                break;
        }
    }
    
    private function setup_hooks() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        add_action('wp_ajax_socket_switch', array($this, 'handle_socket_switch'));
        add_action('wp_ajax_nopriv_socket_switch', array($this, 'handle_socket_switch'));
    }
    
    public function enqueue_scripts() {
        wp_enqueue_script(
            'wp-socket-directory',
            WP_SOCKET_DIRECTORY_PLUGIN_URL . 'assets/js/directory.js',
            array('jquery'),
            WP_SOCKET_DIRECTORY_VERSION,
            true
        );
        
        wp_enqueue_style(
            'wp-socket-directory',
            WP_SOCKET_DIRECTORY_PLUGIN_URL . 'assets/css/directory.css',
            array(),
            WP_SOCKET_DIRECTORY_VERSION
        );
        
        wp_localize_script('wp-socket-directory', 'wpSocketDirectory', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wp_socket_directory_nonce'),
            'current_socket' => $this->get_current_socket()
        ));
    }
    
    public function admin_enqueue_scripts() {
        wp_enqueue_script(
            'wp-socket-directory-admin',
            WP_SOCKET_DIRECTORY_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            WP_SOCKET_DIRECTORY_VERSION,
            true
        );
        
        wp_enqueue_style(
            'wp-socket-directory-admin',
            WP_SOCKET_DIRECTORY_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            WP_SOCKET_DIRECTORY_VERSION
        );
    }
    
    public function handle_socket_switch() {
        check_ajax_referer('wp_socket_directory_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Insufficient permissions', 'wp-socket-directory'));
        }
        
        $new_socket = sanitize_text_field($_POST['socket']);
        $valid_sockets = array('dental', 'pizza', 'gym', 'restaurant');
        
        if (in_array($new_socket, $valid_sockets)) {
            update_option('wp_socket_directory_current_socket', $new_socket);
            $this->current_socket = $new_socket;
            
            wp_send_json_success(array(
                'message' => sprintf(__('Switched to %s socket', 'wp-socket-directory'), $new_socket),
                'socket' => $new_socket
            ));
        } else {
            wp_send_json_error(__('Invalid socket type', 'wp-socket-directory'));
        }
    }
    
    public function get_current_socket() {
        if (!$this->current_socket) {
            $this->current_socket = get_option('wp_socket_directory_current_socket', 'dental');
        }
        return $this->current_socket;
    }
    
    public function set_socket($socket) {
        $valid_sockets = array('dental', 'pizza', 'gym', 'restaurant');
        if (in_array($socket, $valid_sockets)) {
            $this->current_socket = $socket;
            update_option('wp_socket_directory_current_socket', $socket);
            return true;
        }
        return false;
    }
    
    public function activate() {
        $this->register_post_types();
        $this->register_taxonomies();
        flush_rewrite_rules();
        
        // Create default options
        add_option('wp_socket_directory_current_socket', 'dental');
        add_option('wp_socket_directory_version', WP_SOCKET_DIRECTORY_VERSION);
        
        // Create custom database tables
        $this->create_custom_tables();
    }
    
    private function create_custom_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Business ratings table
        $sql = "CREATE TABLE {$wpdb->prefix}business_ratings (
            id int(11) NOT NULL AUTO_INCREMENT,
            business_id int(11) NOT NULL,
            user_id int(11) NOT NULL,
            rating decimal(2,1) NOT NULL,
            review text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY business_id (business_id),
            KEY user_id (user_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Socket configurations table
        $sql = "CREATE TABLE {$wpdb->prefix}socket_configurations (
            id int(11) NOT NULL AUTO_INCREMENT,
            socket_type varchar(50) NOT NULL,
            config_key varchar(100) NOT NULL,
            config_value text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY socket_config (socket_type, config_key)
        ) $charset_collate;";
        
        dbDelta($sql);
    }
    
    public function deactivate() {
        flush_rewrite_rules();
    }
    
    public function load_textdomain() {
        load_plugin_textdomain(
            'wp-socket-directory',
            false,
            dirname(plugin_basename(__FILE__)) . '/languages/'
        );
    }
}

// Initialize the plugin
WP_Socket_Directory::get_instance();

// Helper function to get plugin instance
function wp_socket_directory() {
    return WP_Socket_Directory::get_instance();
}