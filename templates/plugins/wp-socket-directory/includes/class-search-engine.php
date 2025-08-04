<?php
/**
 * Advanced Search Engine for Business Directory
 * Handles geolocation search, filtering, and faceted search
 */

if (!defined('ABSPATH')) {
    exit;
}

class Directory_Search_Engine {
    
    private $socket_manager;
    
    public function __construct() {
        $this->socket_manager = new Business_Socket_Manager();
        
        add_action('wp_ajax_directory_search', array($this, 'handle_ajax_search'));
        add_action('wp_ajax_nopriv_directory_search', array($this, 'handle_ajax_search'));
        add_action('wp_ajax_get_search_suggestions', array($this, 'get_search_suggestions'));
        add_action('wp_ajax_nopriv_get_search_suggestions', array($this, 'get_search_suggestions'));
    }
    
    public function handle_ajax_search() {
        check_ajax_referer('wp_socket_directory_nonce', 'nonce');
        
        $search_params = array(
            'query' => sanitize_text_field($_POST['query'] ?? ''),
            'location' => sanitize_text_field($_POST['location'] ?? ''),
            'latitude' => floatval($_POST['latitude'] ?? 0),
            'longitude' => floatval($_POST['longitude'] ?? 0),
            'radius' => intval($_POST['radius'] ?? 25),
            'business_type' => sanitize_text_field($_POST['business_type'] ?? ''),
            'filters' => $_POST['filters'] ?? array(),
            'sort' => sanitize_text_field($_POST['sort'] ?? 'relevance'),
            'page' => intval($_POST['page'] ?? 1),
            'per_page' => intval($_POST['per_page'] ?? 20)
        );
        
        $results = $this->search_businesses($search_params);
        
        wp_send_json_success($results);
    }
    
    public function search_businesses($params) {
        $query_args = $this->build_search_query($params);
        $query = new WP_Query($query_args);
        
        $businesses = array();
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $businesses[] = $this->format_business_result(get_post());
            }
            wp_reset_postdata();
        }
        
        // Add distance calculation for geolocation searches
        if ($params['latitude'] && $params['longitude']) {
            $businesses = $this->calculate_distances($businesses, $params['latitude'], $params['longitude']);
        }
        
        // Apply sorting
        $businesses = $this->sort_results($businesses, $params['sort']);
        
        return array(
            'businesses' => $businesses,
            'total' => $query->found_posts,
            'pages' => $query->max_num_pages,
            'current_page' => $params['page'],
            'search_params' => $params
        );
    }
    
    private function build_search_query($params) {
        $query_args = array(
            'post_type' => 'business_listing',
            'post_status' => 'publish',
            'posts_per_page' => $params['per_page'],
            'paged' => $params['page'],
            'meta_query' => array('relation' => 'AND'),
            'tax_query' => array('relation' => 'AND')
        );
        
        // Text search
        if (!empty($params['query'])) {
            $query_args['s'] = $params['query'];
        }
        
        // Business type filter
        if (!empty($params['business_type'])) {
            $query_args['tax_query'][] = array(
                'taxonomy' => 'business_category',
                'field' => 'slug',
                'terms' => $params['business_type']
            );
        }
        
        // Location filter
        if (!empty($params['location'])) {
            $query_args['tax_query'][] = array(
                'taxonomy' => 'business_location',
                'field' => 'name',
                'terms' => $params['location'],
                'compare' => 'LIKE'
            );
        }
        
        // Apply socket-specific filters
        $this->apply_socket_filters($query_args, $params['filters']);
        
        // Geolocation bounding box (rough filtering before distance calculation)
        if ($params['latitude'] && $params['longitude']) {
            $this->add_geolocation_bounds($query_args, $params['latitude'], $params['longitude'], $params['radius']);
        }
        
        return $query_args;
    }
    
    private function apply_socket_filters(&$query_args, $filters) {
        $current_socket = $this->socket_manager->get_current_socket();
        $socket_config = $this->socket_manager->get_socket_config($current_socket);
        
        if (empty($filters) || empty($socket_config)) {
            return;
        }
        
        switch ($current_socket) {
            case 'dental':
                $this->apply_dental_filters($query_args, $filters);
                break;
            case 'pizza':
                $this->apply_pizza_filters($query_args, $filters);
                break;
            case 'gym':
                $this->apply_gym_filters($query_args, $filters);
                break;
        }
    }
    
    private function apply_dental_filters(&$query_args, $filters) {
        // Dental specialty filter
        if (!empty($filters['specialty'])) {
            $query_args['tax_query'][] = array(
                'taxonomy' => 'dental_specialty',
                'field' => 'slug',
                'terms' => $filters['specialty']
            );
        }
        
        // Insurance accepted filter
        if (!empty($filters['insurance'])) {
            $query_args['tax_query'][] = array(
                'taxonomy' => 'insurance_accepted',
                'field' => 'slug',
                'terms' => $filters['insurance']
            );
        }
        
        // Emergency services filter
        if (!empty($filters['emergency_services'])) {
            $query_args['meta_query'][] = array(
                'key' => 'emergency_services',
                'value' => '1',
                'compare' => '='
            );
        }
    }
    
    private function apply_pizza_filters(&$query_args, $filters) {
        // Cuisine style filter
        if (!empty($filters['cuisine_style'])) {
            $query_args['meta_query'][] = array(
                'key' => 'cuisine_style',
                'value' => $filters['cuisine_style'],
                'compare' => '='
            );
        }
        
        // Delivery available filter
        if (!empty($filters['delivery_available'])) {
            $query_args['meta_query'][] = array(
                'key' => 'delivery_available',
                'value' => '1',
                'compare' => '='
            );
        }
        
        // Dietary options filter
        if (!empty($filters['dietary_options'])) {
            $dietary_query = array('relation' => 'OR');
            foreach ($filters['dietary_options'] as $option) {
                $dietary_query[] = array(
                    'key' => $option . '_options',
                    'value' => '1',
                    'compare' => '='
                );
            }
            $query_args['meta_query'][] = $dietary_query;
        }
    }
    
    private function apply_gym_filters(&$query_args, $filters) {
        // Facility type filter
        if (!empty($filters['facility_type'])) {
            $query_args['meta_query'][] = array(
                'key' => 'facility_type',
                'value' => $filters['facility_type'],
                'compare' => '='
            );
        }
        
        // Personal training filter
        if (!empty($filters['personal_training'])) {
            $query_args['meta_query'][] = array(
                'key' => 'personal_training',
                'value' => '1',
                'compare' => '='
            );
        }
        
        // Group classes filter
        if (!empty($filters['group_classes'])) {
            $query_args['meta_query'][] = array(
                'key' => 'group_classes',
                'value' => '1',
                'compare' => '='
            );
        }
        
        // Price range filter
        if (!empty($filters['price_min']) || !empty($filters['price_max'])) {
            $price_query = array(
                'key' => 'membership_fee_monthly',
                'type' => 'NUMERIC'
            );
            
            if (!empty($filters['price_min']) && !empty($filters['price_max'])) {
                $price_query['value'] = array($filters['price_min'], $filters['price_max']);
                $price_query['compare'] = 'BETWEEN';
            } elseif (!empty($filters['price_min'])) {
                $price_query['value'] = $filters['price_min'];
                $price_query['compare'] = '>=';
            } elseif (!empty($filters['price_max'])) {
                $price_query['value'] = $filters['price_max'];
                $price_query['compare'] = '<=';
            }
            
            $query_args['meta_query'][] = $price_query;
        }
    }
    
    private function add_geolocation_bounds(&$query_args, $lat, $lng, $radius) {
        // Calculate rough bounding box for initial filtering
        $lat_range = $radius / 69; // Roughly 69 miles per degree of latitude
        $lng_range = $radius / (69 * cos(deg2rad($lat))); // Adjust for longitude
        
        $query_args['meta_query'][] = array(
            'key' => 'latitude',
            'value' => array($lat - $lat_range, $lat + $lat_range),
            'type' => 'DECIMAL',
            'compare' => 'BETWEEN'
        );
        
        $query_args['meta_query'][] = array(
            'key' => 'longitude',
            'value' => array($lng - $lng_range, $lng + $lng_range),
            'type' => 'DECIMAL',
            'compare' => 'BETWEEN'
        );
    }
    
    private function calculate_distances($businesses, $lat, $lng) {
        foreach ($businesses as &$business) {
            if (isset($business['latitude']) && isset($business['longitude'])) {
                $business['distance'] = $this->calculate_distance(
                    $lat, $lng, 
                    $business['latitude'], $business['longitude']
                );
            }
        }
        
        return $businesses;
    }
    
    private function calculate_distance($lat1, $lng1, $lat2, $lng2) {
        $earth_radius = 3959; // Miles
        
        $lat1 = deg2rad($lat1);
        $lng1 = deg2rad($lng1);
        $lat2 = deg2rad($lat2);
        $lng2 = deg2rad($lng2);
        
        $dlat = $lat2 - $lat1;
        $dlng = $lng2 - $lng1;
        
        $a = sin($dlat/2) * sin($dlat/2) + cos($lat1) * cos($lat2) * sin($dlng/2) * sin($dlng/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        
        return $earth_radius * $c;
    }
    
    private function sort_results($businesses, $sort_by) {
        switch ($sort_by) {
            case 'distance':
                usort($businesses, function($a, $b) {
                    return ($a['distance'] ?? 999) <=> ($b['distance'] ?? 999);
                });
                break;
                
            case 'rating':
                usort($businesses, function($a, $b) {
                    return ($b['rating'] ?? 0) <=> ($a['rating'] ?? 0);
                });
                break;
                
            case 'name':
                usort($businesses, function($a, $b) {
                    return strcmp($a['name'], $b['name']);
                });
                break;
                
            case 'newest':
                usort($businesses, function($a, $b) {
                    return strtotime($b['date_created']) <=> strtotime($a['date_created']);
                });
                break;
                
            default: // relevance
                // Keep WordPress relevance sorting
                break;
        }
        
        return $businesses;
    }
    
    private function format_business_result($post) {
        $business = array(
            'id' => $post->ID,
            'name' => $post->post_title,
            'description' => wp_trim_words($post->post_content, 30),
            'url' => get_permalink($post->ID),
            'date_created' => $post->post_date,
            'featured_image' => get_the_post_thumbnail_url($post->ID, 'medium'),
            'latitude' => get_post_meta($post->ID, 'latitude', true),
            'longitude' => get_post_meta($post->ID, 'longitude', true),
            'address' => get_post_meta($post->ID, 'address', true),
            'phone' => get_post_meta($post->ID, 'phone', true),
            'website' => get_post_meta($post->ID, 'website', true),
            'rating' => $this->get_business_rating($post->ID),
            'review_count' => $this->get_review_count($post->ID)
        );
        
        // Add socket-specific fields
        $socket_fields = $this->socket_manager->get_socket_meta_fields();
        foreach ($socket_fields as $field_key => $field_config) {
            $business[$field_key] = get_post_meta($post->ID, $field_key, true);
        }
        
        // Add taxonomies
        $business['categories'] = wp_get_post_terms($post->ID, 'business_category', array('fields' => 'names'));
        $business['locations'] = wp_get_post_terms($post->ID, 'business_location', array('fields' => 'names'));
        
        return $business;
    }
    
    private function get_business_rating($business_id) {
        global $wpdb;
        
        $rating = $wpdb->get_var($wpdb->prepare(
            "SELECT AVG(rating) FROM {$wpdb->prefix}business_ratings WHERE business_id = %d",
            $business_id
        ));
        
        return $rating ? round($rating, 1) : 0;
    }
    
    private function get_review_count($business_id) {
        global $wpdb;
        
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}business_ratings WHERE business_id = %d",
            $business_id
        ));
        
        return intval($count);
    }
    
    public function get_search_suggestions() {
        check_ajax_referer('wp_socket_directory_nonce', 'nonce');
        
        $query = sanitize_text_field($_POST['query'] ?? '');
        $type = sanitize_text_field($_POST['type'] ?? 'business');
        
        $suggestions = array();
        
        if (strlen($query) >= 2) {
            switch ($type) {
                case 'business':
                    $suggestions = $this->get_business_suggestions($query);
                    break;
                case 'location':
                    $suggestions = $this->get_location_suggestions($query);
                    break;
                case 'category':
                    $suggestions = $this->get_category_suggestions($query);
                    break;
            }
        }
        
        wp_send_json_success($suggestions);
    }
    
    private function get_business_suggestions($query) {
        global $wpdb;
        
        $suggestions = $wpdb->get_results($wpdb->prepare(
            "SELECT ID, post_title as name FROM {$wpdb->posts} 
             WHERE post_type = 'business_listing' 
             AND post_status = 'publish' 
             AND post_title LIKE %s 
             LIMIT 10",
            '%' . $wpdb->esc_like($query) . '%'
        ));
        
        return array_map(function($item) {
            return array(
                'id' => $item->ID,
                'name' => $item->name,
                'type' => 'business'
            );
        }, $suggestions);
    }
    
    private function get_location_suggestions($query) {
        $terms = get_terms(array(
            'taxonomy' => 'business_location',
            'name__like' => $query,
            'number' => 10,
            'hide_empty' => true
        ));
        
        return array_map(function($term) {
            return array(
                'id' => $term->term_id,
                'name' => $term->name,
                'type' => 'location'
            );
        }, $terms);
    }
    
    private function get_category_suggestions($query) {
        $terms = get_terms(array(
            'taxonomy' => 'business_category',
            'name__like' => $query,
            'number' => 10,
            'hide_empty' => true
        ));
        
        return array_map(function($term) {
            return array(
                'id' => $term->term_id,
                'name' => $term->name,
                'type' => 'category'
            );
        }, $terms);
    }
    
    public function get_search_filters() {
        $current_socket = $this->socket_manager->get_current_socket();
        $filters = array();
        
        switch ($current_socket) {
            case 'dental':
                $filters = array(
                    'specialty' => array(
                        'label' => __('Specialty', 'wp-socket-directory'),
                        'type' => 'select',
                        'options' => $this->get_taxonomy_options('dental_specialty')
                    ),
                    'insurance' => array(
                        'label' => __('Insurance Accepted', 'wp-socket-directory'),
                        'type' => 'select',
                        'options' => $this->get_taxonomy_options('insurance_accepted')
                    ),
                    'emergency_services' => array(
                        'label' => __('Emergency Services', 'wp-socket-directory'),
                        'type' => 'checkbox'
                    )
                );
                break;
                
            case 'pizza':
                $filters = array(
                    'cuisine_style' => array(
                        'label' => __('Cuisine Style', 'wp-socket-directory'),
                        'type' => 'select',
                        'options' => array(
                            'new_york' => 'New York Style',
                            'chicago' => 'Chicago Deep Dish',
                            'neapolitan' => 'Neapolitan',
                            'sicilian' => 'Sicilian'
                        )
                    ),
                    'delivery_available' => array(
                        'label' => __('Delivery Available', 'wp-socket-directory'),
                        'type' => 'checkbox'
                    ),
                    'dietary_options' => array(
                        'label' => __('Dietary Options', 'wp-socket-directory'),
                        'type' => 'checkbox_group',
                        'options' => array(
                            'gluten_free' => 'Gluten-Free',
                            'vegan' => 'Vegan'
                        )
                    )
                );
                break;
                
            case 'gym':
                $filters = array(
                    'facility_type' => array(
                        'label' => __('Facility Type', 'wp-socket-directory'),
                        'type' => 'select',
                        'options' => array(
                            'gym' => 'Traditional Gym',
                            'crossfit' => 'CrossFit Box',
                            'yoga_studio' => 'Yoga Studio'
                        )
                    ),
                    'personal_training' => array(
                        'label' => __('Personal Training', 'wp-socket-directory'),
                        'type' => 'checkbox'
                    ),
                    'price_range' => array(
                        'label' => __('Monthly Fee', 'wp-socket-directory'),
                        'type' => 'range',
                        'min' => 0,
                        'max' => 200
                    )
                );
                break;
        }
        
        return $filters;
    }
    
    private function get_taxonomy_options($taxonomy) {
        $terms = get_terms(array(
            'taxonomy' => $taxonomy,
            'hide_empty' => false
        ));
        
        $options = array();
        foreach ($terms as $term) {
            $options[$term->slug] = $term->name;
        }
        
        return $options;
    }
}