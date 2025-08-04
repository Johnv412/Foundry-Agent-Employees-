<?php
/**
 * REST API Endpoints for Socket Directory
 * Provides API access for mobile apps and external integrations
 */

if (!defined('ABSPATH')) {
    exit;
}

class Directory_API_Endpoints {
    
    private $namespace = 'wp-socket-directory/v1';
    private $socket_manager;
    private $search_engine;
    
    public function __construct() {
        $this->socket_manager = new Business_Socket_Manager();
        $this->search_engine = new Directory_Search_Engine();
        
        add_action('rest_api_init', array($this, 'register_routes'));
    }
    
    public function register_routes() {
        // Business listings endpoints
        register_rest_route($this->namespace, '/businesses', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_businesses'),
            'permission_callback' => '__return_true',
            'args' => $this->get_search_args()
        ));
        
        register_rest_route($this->namespace, '/businesses/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_business'),
            'permission_callback' => '__return_true',
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                )
            )
        ));
        
        // Search endpoint
        register_rest_route($this->namespace, '/search', array(
            'methods' => 'POST',
            'callback' => array($this, 'search_businesses'),
            'permission_callback' => '__return_true',
            'args' => $this->get_search_args()
        ));
        
        // Socket management endpoints
        register_rest_route($this->namespace, '/sockets', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_sockets'),
            'permission_callback' => '__return_true'
        ));
        
        register_rest_route($this->namespace, '/sockets/current', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_current_socket'),
            'permission_callback' => '__return_true'
        ));
        
        register_rest_route($this->namespace, '/sockets/switch', array(
            'methods' => 'POST',
            'callback' => array($this, 'switch_socket'),
            'permission_callback' => array($this, 'check_admin_permissions'),
            'args' => array(
                'socket' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return in_array($param, array('dental', 'pizza', 'gym', 'restaurant'));
                    }
                )
            )
        ));
        
        // Reviews endpoints
        register_rest_route($this->namespace, '/businesses/(?P<id>\d+)/reviews', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_business_reviews'),
            'permission_callback' => '__return_true'
        ));
        
        register_rest_route($this->namespace, '/businesses/(?P<id>\d+)/reviews', array(
            'methods' => 'POST',
            'callback' => array($this, 'add_business_review'),
            'permission_callback' => 'is_user_logged_in',
            'args' => array(
                'rating' => array(
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_numeric($param) && $param >= 1 && $param <= 5;
                    }
                ),
                'review' => array(
                    'sanitize_callback' => 'sanitize_textarea_field'
                )
            )
        ));
        
        // Analytics endpoints
        register_rest_route($this->namespace, '/analytics/popular', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_popular_businesses'),
            'permission_callback' => '__return_true',
            'args' => array(
                'limit' => array(
                    'default' => 10,
                    'validate_callback' => function($param) {
                        return is_numeric($param) && $param > 0 && $param <= 50;
                    }
                )
            )
        ));
        
        // Import/Export endpoints
        register_rest_route($this->namespace, '/import', array(
            'methods' => 'POST',
            'callback' => array($this, 'import_businesses'),
            'permission_callback' => array($this, 'check_admin_permissions')
        ));
        
        register_rest_route($this->namespace, '/export', array(
            'methods' => 'GET',
            'callback' => array($this, 'export_businesses'),
            'permission_callback' => array($this, 'check_admin_permissions')
        ));
    }
    
    private function get_search_args() {
        return array(
            'query' => array(
                'sanitize_callback' => 'sanitize_text_field'
            ),
            'location' => array(
                'sanitize_callback' => 'sanitize_text_field'
            ),
            'latitude' => array(
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param >= -90 && $param <= 90;
                }
            ),
            'longitude' => array(
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param >= -180 && $param <= 180;
                }
            ),
            'radius' => array(
                'default' => 25,
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param > 0 && $param <= 100;
                }
            ),
            'business_type' => array(
                'sanitize_callback' => 'sanitize_text_field'
            ),
            'sort' => array(
                'default' => 'relevance',
                'validate_callback' => function($param) {
                    return in_array($param, array('relevance', 'distance', 'rating', 'name', 'newest'));
                }
            ),
            'page' => array(
                'default' => 1,
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param > 0;
                }
            ),
            'per_page' => array(
                'default' => 20,
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param > 0 && $param <= 100;
                }
            )
        );
    }
    
    public function get_businesses($request) {
        $params = array(
            'query' => $request->get_param('query') ?: '',
            'location' => $request->get_param('location') ?: '',
            'latitude' => $request->get_param('latitude') ?: 0,
            'longitude' => $request->get_param('longitude') ?: 0,
            'radius' => $request->get_param('radius') ?: 25,
            'business_type' => $request->get_param('business_type') ?: '',
            'sort' => $request->get_param('sort') ?: 'relevance',
            'page' => $request->get_param('page') ?: 1,
            'per_page' => $request->get_param('per_page') ?: 20,
            'filters' => $request->get_param('filters') ?: array()
        );
        
        $results = $this->search_engine->search_businesses($params);
        
        return new WP_REST_Response($results, 200);
    }
    
    public function get_business($request) {
        $business_id = $request->get_param('id');
        $business = get_post($business_id);
        
        if (!$business || $business->post_type !== 'business_listing') {
            return new WP_Error('business_not_found', 'Business not found', array('status' => 404));
        }
        
        $business_data = $this->format_business_detail($business);
        
        return new WP_REST_Response($business_data, 200);
    }
    
    public function search_businesses($request) {
        $params = array(
            'query' => $request->get_param('query') ?: '',
            'location' => $request->get_param('location') ?: '',
            'latitude' => $request->get_param('latitude') ?: 0,
            'longitude' => $request->get_param('longitude') ?: 0,
            'radius' => $request->get_param('radius') ?: 25,
            'business_type' => $request->get_param('business_type') ?: '',
            'sort' => $request->get_param('sort') ?: 'relevance',
            'page' => $request->get_param('page') ?: 1,
            'per_page' => $request->get_param('per_page') ?: 20,
            'filters' => $request->get_param('filters') ?: array()
        );
        
        $results = $this->search_engine->search_businesses($params);
        
        return new WP_REST_Response($results, 200);
    }
    
    public function get_sockets($request) {
        $sockets = $this->socket_manager->get_all_socket_configs();
        $socket_list = array();
        
        foreach ($sockets as $key => $config) {
            $socket_list[] = array(
                'type' => $key,
                'name' => $config['name'],
                'schema_type' => $config['schema_type'],
                'post_types' => $config['post_types'],
                'taxonomies' => $config['taxonomies']
            );
        }
        
        return new WP_REST_Response($socket_list, 200);
    }
    
    public function get_current_socket($request) {
        $current_socket = $this->socket_manager->get_current_socket();
        $socket_config = $this->socket_manager->get_socket_config($current_socket);
        
        return new WP_REST_Response(array(
            'current_socket' => $current_socket,
            'config' => $socket_config
        ), 200);
    }
    
    public function switch_socket($request) {
        $new_socket = $request->get_param('socket');
        $result = $this->socket_manager->switch_socket($new_socket);
        
        if (is_wp_error($result)) {
            return $result;
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => sprintf('Switched to %s socket', $new_socket),
            'socket' => $new_socket
        ), 200);
    }
    
    public function get_business_reviews($request) {
        global $wpdb;
        
        $business_id = $request->get_param('id');
        
        $reviews = $wpdb->get_results($wpdb->prepare(
            "SELECT r.*, u.display_name as reviewer_name 
             FROM {$wpdb->prefix}business_ratings r
             LEFT JOIN {$wpdb->users} u ON r.user_id = u.ID
             WHERE r.business_id = %d
             ORDER BY r.created_at DESC",
            $business_id
        ));
        
        foreach ($reviews as &$review) {
            $review->rating = floatval($review->rating);
            $review->created_at = mysql2date('c', $review->created_at);
        }
        
        return new WP_REST_Response($reviews, 200);
    }
    
    public function add_business_review($request) {
        global $wpdb;
        
        $business_id = $request->get_param('id');
        $rating = $request->get_param('rating');
        $review = $request->get_param('review');
        $user_id = get_current_user_id();
        
        // Check if business exists
        $business = get_post($business_id);
        if (!$business || $business->post_type !== 'business_listing') {
            return new WP_Error('business_not_found', 'Business not found', array('status' => 404));
        }
        
        // Check if user already reviewed this business
        $existing_review = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}business_ratings 
             WHERE business_id = %d AND user_id = %d",
            $business_id, $user_id
        ));
        
        if ($existing_review) {
            return new WP_Error('review_exists', 'You have already reviewed this business', array('status' => 400));
        }
        
        // Insert review
        $result = $wpdb->insert(
            $wpdb->prefix . 'business_ratings',
            array(
                'business_id' => $business_id,
                'user_id' => $user_id,
                'rating' => $rating,
                'review' => $review
            ),
            array('%d', '%d', '%f', '%s')
        );
        
        if ($result === false) {
            return new WP_Error('review_failed', 'Failed to save review', array('status' => 500));
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Review added successfully',
            'review_id' => $wpdb->insert_id
        ), 201);
    }
    
    public function get_popular_businesses($request) {
        global $wpdb;
        
        $limit = $request->get_param('limit');
        
        $popular_businesses = $wpdb->get_results($wpdb->prepare(
            "SELECT p.ID, p.post_title, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
             FROM {$wpdb->posts} p
             LEFT JOIN {$wpdb->prefix}business_ratings r ON p.ID = r.business_id
             WHERE p.post_type = 'business_listing' AND p.post_status = 'publish'
             GROUP BY p.ID
             ORDER BY avg_rating DESC, review_count DESC
             LIMIT %d",
            $limit
        ));
        
        $businesses = array();
        foreach ($popular_businesses as $business) {
            $businesses[] = array(
                'id' => $business->ID,
                'name' => $business->post_title,
                'url' => get_permalink($business->ID),
                'rating' => $business->avg_rating ? round($business->avg_rating, 1) : 0,
                'review_count' => intval($business->review_count),
                'featured_image' => get_the_post_thumbnail_url($business->ID, 'medium')
            );
        }
        
        return new WP_REST_Response($businesses, 200);
    }
    
    public function import_businesses($request) {
        $file = $request->get_file_params()['file'];
        
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            return new WP_Error('upload_failed', 'File upload failed', array('status' => 400));
        }
        
        $file_content = file_get_contents($file['tmp_name']);
        $businesses = json_decode($file_content, true);
        
        if (!$businesses) {
            return new WP_Error('invalid_format', 'Invalid JSON format', array('status' => 400));
        }
        
        $imported = 0;
        $errors = array();
        
        foreach ($businesses as $business_data) {
            $result = $this->import_single_business($business_data);
            if (is_wp_error($result)) {
                $errors[] = $result->get_error_message();
            } else {
                $imported++;
            }
        }
        
        return new WP_REST_Response(array(
            'imported' => $imported,
            'errors' => $errors,
            'total' => count($businesses)
        ), 200);
    }
    
    public function export_businesses($request) {
        $businesses = get_posts(array(
            'post_type' => 'business_listing',
            'post_status' => 'publish',
            'numberposts' => -1
        ));
        
        $export_data = array();
        foreach ($businesses as $business) {
            $export_data[] = $this->format_business_for_export($business);
        }
        
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="businesses-export-' . date('Y-m-d') . '.json"');
        
        return new WP_REST_Response($export_data, 200);
    }
    
    private function format_business_detail($business) {
        $meta_fields = $this->socket_manager->get_socket_meta_fields();
        $business_data = array(
            'id' => $business->ID,
            'name' => $business->post_title,
            'description' => $business->post_content,
            'excerpt' => $business->post_excerpt,
            'url' => get_permalink($business->ID),
            'date_created' => $business->post_date,
            'date_modified' => $business->post_modified,
            'featured_image' => get_the_post_thumbnail_url($business->ID, 'full'),
            'gallery' => array(),
            'categories' => wp_get_post_terms($business->ID, 'business_category'),
            'locations' => wp_get_post_terms($business->ID, 'business_location'),
            'meta' => array()
        );
        
        // Add meta fields
        foreach ($meta_fields as $field_key => $field_config) {
            $business_data['meta'][$field_key] = get_post_meta($business->ID, $field_key, true);
        }
        
        // Add standard meta fields
        $standard_fields = array('latitude', 'longitude', 'address', 'phone', 'website', 'email');
        foreach ($standard_fields as $field) {
            $business_data['meta'][$field] = get_post_meta($business->ID, $field, true);
        }
        
        return $business_data;
    }
    
    private function import_single_business($business_data) {
        if (empty($business_data['name'])) {
            return new WP_Error('missing_name', 'Business name is required');
        }
        
        $post_data = array(
            'post_title' => sanitize_text_field($business_data['name']),
            'post_content' => wp_kses_post($business_data['description'] ?? ''),
            'post_excerpt' => sanitize_textarea_field($business_data['excerpt'] ?? ''),
            'post_type' => 'business_listing',
            'post_status' => 'publish'
        );
        
        $business_id = wp_insert_post($post_data);
        
        if (is_wp_error($business_id)) {
            return $business_id;
        }
        
        // Add meta fields
        if (isset($business_data['meta'])) {
            foreach ($business_data['meta'] as $key => $value) {
                update_post_meta($business_id, sanitize_key($key), sanitize_text_field($value));
            }
        }
        
        // Add taxonomies
        if (isset($business_data['categories'])) {
            wp_set_post_terms($business_id, $business_data['categories'], 'business_category');
        }
        
        if (isset($business_data['locations'])) {
            wp_set_post_terms($business_id, $business_data['locations'], 'business_location');
        }
        
        return $business_id;
    }
    
    private function format_business_for_export($business) {
        return $this->format_business_detail($business);
    }
    
    public function check_admin_permissions() {
        return current_user_can('manage_options');
    }
}