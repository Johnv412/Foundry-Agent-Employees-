<?php
/**
 * Admin Interface for Socket Directory
 * Handles admin dashboard, socket switching, and configuration
 */

if (!defined('ABSPATH')) {
    exit;
}

class Directory_Admin_Interface {
    
    private $socket_manager;
    
    public function __construct() {
        $this->socket_manager = new Business_Socket_Manager();
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post', array($this, 'save_meta_boxes'));
        add_action('admin_init', array($this, 'admin_init'));
        add_action('admin_notices', array($this, 'admin_notices'));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            __('Socket Directory', 'wp-socket-directory'),
            __('Socket Directory', 'wp-socket-directory'),
            'manage_options',
            'socket-directory',
            array($this, 'admin_dashboard'),
            'dashicons-networking',
            30
        );
        
        add_submenu_page(
            'socket-directory',
            __('Socket Manager', 'wp-socket-directory'),
            __('Socket Manager', 'wp-socket-directory'),
            'manage_options',
            'socket-manager',
            array($this, 'socket_manager_page')
        );
        
        add_submenu_page(
            'socket-directory',
            __('Import/Export', 'wp-socket-directory'),
            __('Import/Export', 'wp-socket-directory'),
            'manage_options',
            'socket-import-export',
            array($this, 'import_export_page')
        );
        
        add_submenu_page(
            'socket-directory',
            __('Analytics', 'wp-socket-directory'),
            __('Analytics', 'wp-socket-directory'),
            'manage_options',
            'socket-analytics',
            array($this, 'analytics_page')
        );
        
        add_submenu_page(
            'socket-directory',
            __('Settings', 'wp-socket-directory'),
            __('Settings', 'wp-socket-directory'),
            'manage_options',
            'socket-settings',
            array($this, 'settings_page')
        );
    }
    
    public function add_meta_boxes() {
        add_meta_box(
            'socket-business-details',
            __('Business Details', 'wp-socket-directory'),
            array($this, 'business_details_meta_box'),
            'business_listing',
            'normal',
            'high'
        );
        
        add_meta_box(
            'socket-location-info',
            __('Location Information', 'wp-socket-directory'),
            array($this, 'location_meta_box'),
            'business_listing',
            'side',
            'default'
        );
        
        add_meta_box(
            'socket-contact-info',
            __('Contact Information', 'wp-socket-directory'),
            array($this, 'contact_meta_box'),
            'business_listing',
            'side',
            'default'
        );
    }
    
    public function business_details_meta_box($post) {
        $this->socket_manager->render_meta_box($post);
    }
    
    public function location_meta_box($post) {
        wp_nonce_field('wp_socket_directory_location_meta', 'wp_socket_directory_location_nonce');
        
        $latitude = get_post_meta($post->ID, 'latitude', true);
        $longitude = get_post_meta($post->ID, 'longitude', true);
        $address = get_post_meta($post->ID, 'address', true);
        $city = get_post_meta($post->ID, 'city', true);
        $state = get_post_meta($post->ID, 'state', true);
        $zip_code = get_post_meta($post->ID, 'zip_code', true);
        
        ?>
        <table class="form-table">
            <tr>
                <th><label for="address"><?php _e('Address', 'wp-socket-directory'); ?></label></th>
                <td><input type="text" id="address" name="address" value="<?php echo esc_attr($address); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="city"><?php _e('City', 'wp-socket-directory'); ?></label></th>
                <td><input type="text" id="city" name="city" value="<?php echo esc_attr($city); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="state"><?php _e('State', 'wp-socket-directory'); ?></label></th>
                <td><input type="text" id="state" name="state" value="<?php echo esc_attr($state); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="zip_code"><?php _e('ZIP Code', 'wp-socket-directory'); ?></label></th>
                <td><input type="text" id="zip_code" name="zip_code" value="<?php echo esc_attr($zip_code); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="latitude"><?php _e('Latitude', 'wp-socket-directory'); ?></label></th>
                <td><input type="number" id="latitude" name="latitude" value="<?php echo esc_attr($latitude); ?>" step="0.000001" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="longitude"><?php _e('Longitude', 'wp-socket-directory'); ?></label></th>
                <td><input type="number" id="longitude" name="longitude" value="<?php echo esc_attr($longitude); ?>" step="0.000001" class="regular-text" /></td>
            </tr>
        </table>
        
        <p>
            <button type="button" id="geocode-address" class="button"><?php _e('Get Coordinates from Address', 'wp-socket-directory'); ?></button>
        </p>
        <?php
    }
    
    public function contact_meta_box($post) {
        wp_nonce_field('wp_socket_directory_contact_meta', 'wp_socket_directory_contact_nonce');
        
        $phone = get_post_meta($post->ID, 'phone', true);
        $email = get_post_meta($post->ID, 'email', true);
        $website = get_post_meta($post->ID, 'website', true);
        $social_facebook = get_post_meta($post->ID, 'social_facebook', true);
        $social_twitter = get_post_meta($post->ID, 'social_twitter', true);
        $social_instagram = get_post_meta($post->ID, 'social_instagram', true);
        
        ?>
        <table class="form-table">
            <tr>
                <th><label for="phone"><?php _e('Phone', 'wp-socket-directory'); ?></label></th>
                <td><input type="tel" id="phone" name="phone" value="<?php echo esc_attr($phone); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="email"><?php _e('Email', 'wp-socket-directory'); ?></label></th>
                <td><input type="email" id="email" name="email" value="<?php echo esc_attr($email); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="website"><?php _e('Website', 'wp-socket-directory'); ?></label></th>
                <td><input type="url" id="website" name="website" value="<?php echo esc_attr($website); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="social_facebook"><?php _e('Facebook', 'wp-socket-directory'); ?></label></th>
                <td><input type="url" id="social_facebook" name="social_facebook" value="<?php echo esc_attr($social_facebook); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="social_twitter"><?php _e('Twitter', 'wp-socket-directory'); ?></label></th>
                <td><input type="url" id="social_twitter" name="social_twitter" value="<?php echo esc_attr($social_twitter); ?>" class="regular-text" /></td>
            </tr>
            <tr>
                <th><label for="social_instagram"><?php _e('Instagram', 'wp-socket-directory'); ?></label></th>
                <td><input type="url" id="social_instagram" name="social_instagram" value="<?php echo esc_attr($social_instagram); ?>" class="regular-text" /></td>
            </tr>
        </table>
        <?php
    }
    
    public function save_meta_boxes($post_id) {
        // Save business details (handled by socket manager)
        $this->socket_manager->save_meta_fields($post_id);
        
        // Save location information
        if (isset($_POST['wp_socket_directory_location_nonce']) && 
            wp_verify_nonce($_POST['wp_socket_directory_location_nonce'], 'wp_socket_directory_location_meta')) {
            
            $location_fields = array('address', 'city', 'state', 'zip_code', 'latitude', 'longitude');
            foreach ($location_fields as $field) {
                if (isset($_POST[$field])) {
                    $value = $_POST[$field];
                    if (in_array($field, array('latitude', 'longitude'))) {
                        $value = floatval($value);
                    } else {
                        $value = sanitize_text_field($value);
                    }
                    update_post_meta($post_id, $field, $value);
                }
            }
        }
        
        // Save contact information
        if (isset($_POST['wp_socket_directory_contact_nonce']) && 
            wp_verify_nonce($_POST['wp_socket_directory_contact_nonce'], 'wp_socket_directory_contact_meta')) {
            
            $contact_fields = array('phone', 'email', 'website', 'social_facebook', 'social_twitter', 'social_instagram');
            foreach ($contact_fields as $field) {
                if (isset($_POST[$field])) {
                    $value = $_POST[$field];
                    if ($field === 'email') {
                        $value = sanitize_email($value);
                    } elseif (in_array($field, array('website', 'social_facebook', 'social_twitter', 'social_instagram'))) {
                        $value = esc_url_raw($value);
                    } else {
                        $value = sanitize_text_field($value);
                    }
                    update_post_meta($post_id, $field, $value);
                }
            }
        }
    }
    
    public function admin_dashboard() {
        $current_socket = $this->socket_manager->get_current_socket();
        $socket_config = $this->socket_manager->get_socket_config();
        
        // Get statistics
        $total_businesses = wp_count_posts('business_listing')->publish;
        $recent_businesses = get_posts(array(
            'post_type' => 'business_listing',
            'numberposts' => 5,
            'orderby' => 'date',
            'order' => 'DESC'
        ));
        
        ?>
        <div class="wrap">
            <h1><?php _e('Socket Directory Dashboard', 'wp-socket-directory'); ?></h1>
            
            <div class="socket-dashboard-widgets">
                <div class="socket-widget">
                    <h3><?php _e('Current Socket', 'wp-socket-directory'); ?></h3>
                    <div class="socket-status">
                        <span class="socket-type"><?php echo esc_html($socket_config['name']); ?></span>
                        <span class="socket-indicator active"></span>
                    </div>
                    <p><?php printf(__('Schema Type: %s', 'wp-socket-directory'), $socket_config['schema_type']); ?></p>
                    <a href="<?php echo admin_url('admin.php?page=socket-manager'); ?>" class="button button-primary">
                        <?php _e('Switch Socket', 'wp-socket-directory'); ?>
                    </a>
                </div>
                
                <div class="socket-widget">
                    <h3><?php _e('Business Statistics', 'wp-socket-directory'); ?></h3>
                    <div class="socket-stats">
                        <div class="stat-item">
                            <span class="stat-number"><?php echo $total_businesses; ?></span>
                            <span class="stat-label"><?php _e('Total Businesses', 'wp-socket-directory'); ?></span>
                        </div>
                    </div>
                    <a href="<?php echo admin_url('edit.php?post_type=business_listing'); ?>" class="button">
                        <?php _e('Manage Businesses', 'wp-socket-directory'); ?>
                    </a>
                </div>
                
                <div class="socket-widget">
                    <h3><?php _e('Recent Businesses', 'wp-socket-directory'); ?></h3>
                    <ul class="recent-businesses">
                        <?php foreach ($recent_businesses as $business): ?>
                            <li>
                                <a href="<?php echo get_edit_post_link($business->ID); ?>">
                                    <?php echo esc_html($business->post_title); ?>
                                </a>
                                <span class="business-date"><?php echo date('M j', strtotime($business->post_date)); ?></span>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                    <a href="<?php echo admin_url('post-new.php?post_type=business_listing'); ?>" class="button button-secondary">
                        <?php _e('Add New Business', 'wp-socket-directory'); ?>
                    </a>
                </div>
                
                <div class="socket-widget">
                    <h3><?php _e('Quick Actions', 'wp-socket-directory'); ?></h3>
                    <div class="quick-actions">
                        <a href="<?php echo admin_url('admin.php?page=socket-import-export'); ?>" class="button">
                            <?php _e('Import Businesses', 'wp-socket-directory'); ?>
                        </a>
                        <a href="<?php echo admin_url('admin.php?page=socket-analytics'); ?>" class="button">
                            <?php _e('View Analytics', 'wp-socket-directory'); ?>
                        </a>
                        <a href="<?php echo admin_url('admin.php?page=socket-settings'); ?>" class="button">
                            <?php _e('Settings', 'wp-socket-directory'); ?>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    public function socket_manager_page() {
        if (isset($_POST['switch_socket'])) {
            check_admin_referer('socket_switch', 'socket_switch_nonce');
            
            $new_socket = sanitize_text_field($_POST['socket_type']);
            $result = $this->socket_manager->switch_socket($new_socket);
            
            if (is_wp_error($result)) {
                add_settings_error('socket_manager', 'socket_switch_error', $result->get_error_message());
            } else {
                add_settings_error('socket_manager', 'socket_switch_success', 
                    sprintf(__('Successfully switched to %s socket', 'wp-socket-directory'), $new_socket), 'updated');
            }
        }
        
        $current_socket = $this->socket_manager->get_current_socket();
        $all_sockets = $this->socket_manager->get_all_socket_configs();
        
        ?>
        <div class="wrap">
            <h1><?php _e('Socket Manager', 'wp-socket-directory'); ?></h1>
            
            <?php settings_errors('socket_manager'); ?>
            
            <div class="socket-manager-content">
                <div class="current-socket">
                    <h2><?php _e('Current Socket', 'wp-socket-directory'); ?></h2>
                    <div class="socket-info">
                        <h3><?php echo esc_html($all_sockets[$current_socket]['name']); ?></h3>
                        <p><strong><?php _e('Schema Type:', 'wp-socket-directory'); ?></strong> <?php echo esc_html($all_sockets[$current_socket]['schema_type']); ?></p>
                        <p><strong><?php _e('Post Types:', 'wp-socket-directory'); ?></strong> <?php echo implode(', ', $all_sockets[$current_socket]['post_types']); ?></p>
                        <p><strong><?php _e('Taxonomies:', 'wp-socket-directory'); ?></strong> <?php echo implode(', ', $all_sockets[$current_socket]['taxonomies']); ?></p>
                    </div>
                </div>
                
                <div class="socket-switcher">
                    <h2><?php _e('Switch Socket', 'wp-socket-directory'); ?></h2>
                    <form method="post" action="">
                        <?php wp_nonce_field('socket_switch', 'socket_switch_nonce'); ?>
                        
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Select Socket Type', 'wp-socket-directory'); ?></th>
                                <td>
                                    <?php foreach ($all_sockets as $socket_key => $socket_config): ?>
                                        <label>
                                            <input type="radio" name="socket_type" value="<?php echo esc_attr($socket_key); ?>" 
                                                   <?php checked($current_socket, $socket_key); ?> />
                                            <strong><?php echo esc_html($socket_config['name']); ?></strong>
                                            <br />
                                            <span class="description">
                                                <?php printf(__('Schema: %s | Fields: %d', 'wp-socket-directory'), 
                                                    $socket_config['schema_type'], count($socket_config['meta_fields'])); ?>
                                            </span>
                                        </label>
                                        <br /><br />
                                    <?php endforeach; ?>
                                </td>
                            </tr>
                        </table>
                        
                        <?php submit_button(__('Switch Socket', 'wp-socket-directory'), 'primary', 'switch_socket'); ?>
                    </form>
                </div>
            </div>
        </div>
        <?php
    }
    
    public function import_export_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Import/Export Businesses', 'wp-socket-directory'); ?></h1>
            
            <div class="import-export-tabs">
                <div class="tab-content">
                    <div class="import-section">
                        <h2><?php _e('Import Businesses', 'wp-socket-directory'); ?></h2>
                        <p><?php _e('Upload a JSON file containing business data to import.', 'wp-socket-directory'); ?></p>
                        
                        <form method="post" enctype="multipart/form-data" id="import-form">
                            <?php wp_nonce_field('business_import', 'import_nonce'); ?>
                            
                            <table class="form-table">
                                <tr>
                                    <th scope="row"><?php _e('Import File', 'wp-socket-directory'); ?></th>
                                    <td>
                                        <input type="file" name="import_file" accept=".json" required />
                                        <p class="description"><?php _e('Select a JSON file to import business listings.', 'wp-socket-directory'); ?></p>
                                    </td>
                                </tr>
                            </table>
                            
                            <?php submit_button(__('Import Businesses', 'wp-socket-directory'), 'primary', 'import_businesses'); ?>
                        </form>
                    </div>
                    
                    <div class="export-section">
                        <h2><?php _e('Export Businesses', 'wp-socket-directory'); ?></h2>
                        <p><?php _e('Download all business listings as a JSON file.', 'wp-socket-directory'); ?></p>
                        
                        <form method="post">
                            <?php wp_nonce_field('business_export', 'export_nonce'); ?>
                            <?php submit_button(__('Export Businesses', 'wp-socket-directory'), 'secondary', 'export_businesses'); ?>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    public function analytics_page() {
        global $wpdb;
        
        // Get business statistics
        $total_businesses = wp_count_posts('business_listing')->publish;
        
        $businesses_by_month = $wpdb->get_results(
            "SELECT DATE_FORMAT(post_date, '%Y-%m') as month, COUNT(*) as count 
             FROM {$wpdb->posts} 
             WHERE post_type = 'business_listing' AND post_status = 'publish' 
             GROUP BY month 
             ORDER BY month DESC 
             LIMIT 12"
        );
        
        ?>
        <div class="wrap">
            <h1><?php _e('Directory Analytics', 'wp-socket-directory'); ?></h1>
            
            <div class="analytics-widgets">
                <div class="analytics-widget">
                    <h3><?php _e('Business Growth', 'wp-socket-directory'); ?></h3>
                    <canvas id="business-growth-chart" width="400" height="200"></canvas>
                </div>
                
                <div class="analytics-widget">
                    <h3><?php _e('Socket Distribution', 'wp-socket-directory'); ?></h3>
                    <div class="socket-stats">
                        <p><?php printf(__('Total Businesses: %d', 'wp-socket-directory'), $total_businesses); ?></p>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
        // Basic chart implementation would go here
        jQuery(document).ready(function($) {
            // Chart.js implementation for business growth
        });
        </script>
        <?php
    }
    
    public function settings_page() {
        if (isset($_POST['save_settings'])) {
            check_admin_referer('socket_settings', 'settings_nonce');
            
            // Save settings logic here
            add_settings_error('socket_settings', 'settings_saved', 
                __('Settings saved successfully', 'wp-socket-directory'), 'updated');
        }
        
        ?>
        <div class="wrap">
            <h1><?php _e('Socket Directory Settings', 'wp-socket-directory'); ?></h1>
            
            <?php settings_errors('socket_settings'); ?>
            
            <form method="post" action="">
                <?php wp_nonce_field('socket_settings', 'settings_nonce'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php _e('Google Maps API Key', 'wp-socket-directory'); ?></th>
                        <td>
                            <input type="text" name="google_maps_api_key" value="<?php echo esc_attr(get_option('socket_google_maps_api_key', '')); ?>" class="regular-text" />
                            <p class="description"><?php _e('Required for geolocation features and maps.', 'wp-socket-directory'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('Default Search Radius', 'wp-socket-directory'); ?></th>
                        <td>
                            <input type="number" name="default_search_radius" value="<?php echo esc_attr(get_option('socket_default_search_radius', 25)); ?>" min="1" max="100" />
                            <span><?php _e('miles', 'wp-socket-directory'); ?></span>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(__('Save Settings', 'wp-socket-directory'), 'primary', 'save_settings'); ?>
            </form>
        </div>
        <?php
    }
    
    public function admin_init() {
        // Handle import/export actions
        if (isset($_POST['import_businesses'])) {
            $this->handle_import();
        }
        
        if (isset($_POST['export_businesses'])) {
            $this->handle_export();
        }
    }
    
    private function handle_import() {
        check_admin_referer('business_import', 'import_nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Insufficient permissions'));
        }
        
        // Import handling logic would go here
        add_action('admin_notices', function() {
            echo '<div class="notice notice-success"><p>' . 
                 __('Import completed successfully.', 'wp-socket-directory') . 
                 '</p></div>';
        });
    }
    
    private function handle_export() {
        check_admin_referer('business_export', 'export_nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('Insufficient permissions'));
        }
        
        // Export handling logic would go here
        $businesses = get_posts(array(
            'post_type' => 'business_listing',
            'post_status' => 'publish',
            'numberposts' => -1
        ));
        
        $export_data = array();
        foreach ($businesses as $business) {
            $export_data[] = array(
                'name' => $business->post_title,
                'description' => $business->post_content,
                'meta' => get_post_meta($business->ID)
            );
        }
        
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="businesses-export-' . date('Y-m-d') . '.json"');
        echo json_encode($export_data, JSON_PRETTY_PRINT);
        exit;
    }
    
    public function admin_notices() {
        $current_socket = $this->socket_manager->get_current_socket();
        
        if (!get_option('socket_google_maps_api_key')) {
            ?>
            <div class="notice notice-warning">
                <p>
                    <?php _e('Google Maps API key is not configured. Geolocation features may not work properly.', 'wp-socket-directory'); ?>
                    <a href="<?php echo admin_url('admin.php?page=socket-settings'); ?>">
                        <?php _e('Configure now', 'wp-socket-directory'); ?>
                    </a>
                </p>
            </div>
            <?php
        }
    }
}