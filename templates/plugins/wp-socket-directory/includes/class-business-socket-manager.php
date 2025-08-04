<?php
/**
 * Business Socket Manager
 * Handles switching between different business types and their configurations
 */

if (!defined('ABSPATH')) {
    exit;
}

class Business_Socket_Manager {
    
    private $socket_configs = array();
    private $current_socket = 'dental';
    
    public function __construct() {
        $this->current_socket = get_option('wp_socket_directory_current_socket', 'dental');
        $this->load_socket_configs();
        
        add_action('init', array($this, 'maybe_update_socket_config'));
        add_filter('wp_socket_directory_meta_fields', array($this, 'get_socket_meta_fields'));
    }
    
    private function load_socket_configs() {
        $this->socket_configs = array(
            'dental' => array(
                'name' => __('Dental Practices', 'wp-socket-directory'),
                'post_types' => array('dental_practice'),
                'taxonomies' => array('dental_specialty', 'insurance_accepted'),
                'meta_fields' => array(
                    'license_number' => array(
                        'label' => __('License Number', 'wp-socket-directory'),
                        'type' => 'text',
                        'required' => true
                    ),
                    'specialties' => array(
                        'label' => __('Specialties', 'wp-socket-directory'),
                        'type' => 'textarea',
                        'required' => false
                    ),
                    'years_experience' => array(
                        'label' => __('Years of Experience', 'wp-socket-directory'),
                        'type' => 'number',
                        'required' => false
                    ),
                    'education' => array(
                        'label' => __('Education', 'wp-socket-directory'),
                        'type' => 'textarea',
                        'required' => false
                    ),
                    'emergency_services' => array(
                        'label' => __('Emergency Services Available', 'wp-socket-directory'),
                        'type' => 'checkbox',
                        'required' => false
                    ),
                    'languages_spoken' => array(
                        'label' => __('Languages Spoken', 'wp-socket-directory'),
                        'type' => 'text',
                        'required' => false
                    ),
                    'appointment_booking_url' => array(
                        'label' => __('Online Booking URL', 'wp-socket-directory'),
                        'type' => 'url',
                        'required' => false
                    )
                ),
                'search_filters' => array('specialty', 'insurance', 'emergency_services'),
                'schema_type' => 'Dentist'
            ),
            
            'pizza' => array(
                'name' => __('Pizza Restaurants', 'wp-socket-directory'),
                'post_types' => array('pizza_restaurant'),
                'taxonomies' => array('cuisine_type', 'delivery_area'),
                'meta_fields' => array(
                    'cuisine_style' => array(
                        'label' => __('Cuisine Style', 'wp-socket-directory'),
                        'type' => 'select',
                        'options' => array(
                            'new_york' => 'New York Style',
                            'chicago' => 'Chicago Deep Dish',
                            'neapolitan' => 'Neapolitan',
                            'sicilian' => 'Sicilian',
                            'california' => 'California Style'
                        ),
                        'required' => true
                    ),
                    'delivery_available' => array(
                        'label' => __('Delivery Available', 'wp-socket-directory'),
                        'type' => 'checkbox',
                        'required' => false
                    ),
                    'delivery_radius' => array(
                        'label' => __('Delivery Radius (miles)', 'wp-socket-directory'),
                        'type' => 'number',
                        'required' => false,
                        'step' => '0.1'
                    ),
                    'minimum_order' => array(
                        'label' => __('Minimum Order ($)', 'wp-socket-directory'),
                        'type' => 'number',
                        'required' => false,
                        'step' => '0.01'
                    ),
                    'delivery_fee' => array(
                        'label' => __('Delivery Fee ($)', 'wp-socket-directory'),
                        'type' => 'number',
                        'required' => false,
                        'step' => '0.01'
                    ),
                    'online_ordering_url' => array(
                        'label' => __('Online Ordering URL', 'wp-socket-directory'),
                        'type' => 'url',
                        'required' => false
                    ),
                    'gluten_free_options' => array(
                        'label' => __('Gluten-Free Options Available', 'wp-socket-directory'),
                        'type' => 'checkbox',
                        'required' => false
                    ),
                    'vegan_options' => array(
                        'label' => __('Vegan Options Available', 'wp-socket-directory'),
                        'type' => 'checkbox',
                        'required' => false
                    )
                ),
                'search_filters' => array('cuisine_style', 'delivery_available', 'dietary_options'),
                'schema_type' => 'Restaurant'
            ),
            
            'gym' => array(
                'name' => __('Fitness Centers', 'wp-socket-directory'),
                'post_types' => array('fitness_center'),
                'taxonomies' => array('fitness_type'),
                'meta_fields' => array(
                    'facility_type' => array(
                        'label' => __('Facility Type', 'wp-socket-directory'),
                        'type' => 'select',
                        'options' => array(
                            'gym' => 'Traditional Gym',
                            'crossfit' => 'CrossFit Box',
                            'yoga_studio' => 'Yoga Studio',
                            'martial_arts' => 'Martial Arts',
                            'dance_studio' => 'Dance Studio',
                            'pilates' => 'Pilates Studio'
                        ),
                        'required' => true
                    ),
                    'membership_fee_monthly' => array(
                        'label' => __('Monthly Membership ($)', 'wp-socket-directory'),
                        'type' => 'number',
                        'required' => false,
                        'step' => '0.01'
                    ),
                    'personal_training' => array(
                        'label' => __('Personal Training Available', 'wp-socket-directory'),
                        'type' => 'checkbox',
                        'required' => false
                    ),
                    'group_classes' => array(
                        'label' => __('Group Classes Available', 'wp-socket-directory'),
                        'type' => 'checkbox',
                        'required' => false
                    ),
                    'twenty_four_hour' => array(
                        'label' => __('24-Hour Access', 'wp-socket-directory'),
                        'type' => 'checkbox',
                        'required' => false
                    ),
                    'pool_available' => array(
                        'label' => __('Swimming Pool', 'wp-socket-directory'),
                        'type' => 'checkbox',
                        'required' => false
                    ),
                    'childcare' => array(
                        'label' => __('Childcare Services', 'wp-socket-directory'),
                        'type' => 'checkbox',
                        'required' => false
                    ),
                    'trial_membership_url' => array(
                        'label' => __('Free Trial URL', 'wp-socket-directory'),
                        'type' => 'url',
                        'required' => false
                    )
                ),
                'search_filters' => array('facility_type', 'personal_training', 'group_classes', 'amenities'),
                'schema_type' => 'ExerciseGym'
            )
        );
    }
    
    public function get_current_socket() {
        return $this->current_socket;
    }
    
    public function get_socket_config($socket_type = null) {
        $socket = $socket_type ?: $this->current_socket;
        return isset($this->socket_configs[$socket]) ? $this->socket_configs[$socket] : array();
    }
    
    public function get_all_socket_configs() {
        return $this->socket_configs;
    }
    
    public function switch_socket($new_socket) {
        if (!isset($this->socket_configs[$new_socket])) {
            return new WP_Error('invalid_socket', __('Invalid socket type', 'wp-socket-directory'));
        }
        
        $old_socket = $this->current_socket;
        $this->current_socket = $new_socket;
        update_option('wp_socket_directory_current_socket', $new_socket);
        
        // Trigger socket switch actions
        do_action('wp_socket_directory_socket_switched', $new_socket, $old_socket);
        
        return true;
    }
    
    public function get_socket_meta_fields($socket_type = null) {
        $config = $this->get_socket_config($socket_type);
        return isset($config['meta_fields']) ? $config['meta_fields'] : array();
    }
    
    public function get_socket_search_filters($socket_type = null) {
        $config = $this->get_socket_config($socket_type);
        return isset($config['search_filters']) ? $config['search_filters'] : array();
    }
    
    public function get_socket_schema_type($socket_type = null) {
        $config = $this->get_socket_config($socket_type);
        return isset($config['schema_type']) ? $config['schema_type'] : 'LocalBusiness';
    }
    
    public function maybe_update_socket_config() {
        if (is_admin() && isset($_POST['socket_config_update'])) {
            check_admin_referer('socket_config_update', 'socket_config_nonce');
            
            if (!current_user_can('manage_options')) {
                return;
            }
            
            $socket_type = sanitize_text_field($_POST['socket_type']);
            $config_updates = $_POST['socket_config'];
            
            if (isset($this->socket_configs[$socket_type])) {
                // Update socket configuration
                $this->update_socket_config($socket_type, $config_updates);
                add_action('admin_notices', function() {
                    echo '<div class="notice notice-success"><p>' . 
                         __('Socket configuration updated successfully.', 'wp-socket-directory') . 
                         '</p></div>';
                });
            }
        }
    }
    
    private function update_socket_config($socket_type, $config_updates) {
        global $wpdb;
        
        foreach ($config_updates as $key => $value) {
            $wpdb->replace(
                $wpdb->prefix . 'socket_configurations',
                array(
                    'socket_type' => $socket_type,
                    'config_key' => $key,
                    'config_value' => maybe_serialize($value)
                ),
                array('%s', '%s', '%s')
            );
        }
    }
    
    public function get_socket_config_value($socket_type, $config_key, $default = '') {
        global $wpdb;
        
        $value = $wpdb->get_var($wpdb->prepare(
            "SELECT config_value FROM {$wpdb->prefix}socket_configurations 
             WHERE socket_type = %s AND config_key = %s",
            $socket_type, $config_key
        ));
        
        return $value ? maybe_unserialize($value) : $default;
    }
    
    public function render_meta_box($post) {
        $socket_config = $this->get_socket_config();
        $meta_fields = $this->get_socket_meta_fields();
        
        wp_nonce_field('wp_socket_directory_meta_box', 'wp_socket_directory_meta_nonce');
        
        echo '<div class="socket-meta-fields">';
        echo '<h4>' . sprintf(__('%s Information', 'wp-socket-directory'), $socket_config['name']) . '</h4>';
        
        foreach ($meta_fields as $field_key => $field_config) {
            $value = get_post_meta($post->ID, $field_key, true);
            $this->render_meta_field($field_key, $field_config, $value);
        }
        
        echo '</div>';
    }
    
    private function render_meta_field($field_key, $field_config, $value) {
        $required = isset($field_config['required']) && $field_config['required'] ? 'required' : '';
        $type = $field_config['type'];
        
        echo '<div class="meta-field-wrapper">';
        echo '<label for="' . esc_attr($field_key) . '">' . esc_html($field_config['label']) . '</label>';
        
        switch ($type) {
            case 'text':
            case 'url':
            case 'email':
                echo '<input type="' . esc_attr($type) . '" id="' . esc_attr($field_key) . '" name="' . esc_attr($field_key) . '" value="' . esc_attr($value) . '" ' . $required . ' />';
                break;
                
            case 'number':
                $step = isset($field_config['step']) ? $field_config['step'] : '1';
                echo '<input type="number" id="' . esc_attr($field_key) . '" name="' . esc_attr($field_key) . '" value="' . esc_attr($value) . '" step="' . esc_attr($step) . '" ' . $required . ' />';
                break;
                
            case 'textarea':
                echo '<textarea id="' . esc_attr($field_key) . '" name="' . esc_attr($field_key) . '" rows="4" ' . $required . '>' . esc_textarea($value) . '</textarea>';
                break;
                
            case 'select':
                echo '<select id="' . esc_attr($field_key) . '" name="' . esc_attr($field_key) . '" ' . $required . '>';
                echo '<option value="">' . __('Select...', 'wp-socket-directory') . '</option>';
                if (isset($field_config['options'])) {
                    foreach ($field_config['options'] as $option_value => $option_label) {
                        $selected = selected($value, $option_value, false);
                        echo '<option value="' . esc_attr($option_value) . '" ' . $selected . '>' . esc_html($option_label) . '</option>';
                    }
                }
                echo '</select>';
                break;
                
            case 'checkbox':
                $checked = checked($value, '1', false);
                echo '<input type="checkbox" id="' . esc_attr($field_key) . '" name="' . esc_attr($field_key) . '" value="1" ' . $checked . ' />';
                break;
        }
        
        echo '</div>';
    }
    
    public function save_meta_fields($post_id) {
        if (!isset($_POST['wp_socket_directory_meta_nonce']) || 
            !wp_verify_nonce($_POST['wp_socket_directory_meta_nonce'], 'wp_socket_directory_meta_box')) {
            return;
        }
        
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        $meta_fields = $this->get_socket_meta_fields();
        
        foreach ($meta_fields as $field_key => $field_config) {
            if (isset($_POST[$field_key])) {
                $value = $_POST[$field_key];
                
                // Sanitize based on field type
                switch ($field_config['type']) {
                    case 'url':
                        $value = esc_url_raw($value);
                        break;
                    case 'email':
                        $value = sanitize_email($value);
                        break;
                    case 'number':
                        $value = floatval($value);
                        break;
                    case 'textarea':
                        $value = sanitize_textarea_field($value);
                        break;
                    default:
                        $value = sanitize_text_field($value);
                        break;
                }
                
                update_post_meta($post_id, $field_key, $value);
            } else {
                // Handle unchecked checkboxes
                if ($field_config['type'] === 'checkbox') {
                    update_post_meta($post_id, $field_key, '0');
                }
            }
        }
    }
}