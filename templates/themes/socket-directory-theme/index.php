<?php
/**
 * Main template file for Socket Directory Theme
 * 
 * @package SocketDirectoryTheme
 * @version 1.0.0
 */

get_header(); ?>

<main class="site-main">
    <div class="container">
        
        <?php if (is_home() || is_front_page()): ?>
            <!-- Homepage Hero Section -->
            <section class="hero-section">
                <div class="hero-content">
                    <h1><?php echo get_socket_hero_title(); ?></h1>
                    <p><?php echo get_socket_hero_description(); ?></p>
                    
                    <div class="hero-search">
                        <?php get_template_part('template-parts/search-form'); ?>
                    </div>
                </div>
            </section>
        <?php endif; ?>
        
        <div class="content-area">
            <div class="primary-content">
                
                <?php if (!is_home() && !is_front_page()): ?>
                    <!-- Breadcrumbs for non-homepage -->
                    <div class="breadcrumbs">
                        <?php get_template_part('template-parts/breadcrumbs'); ?>
                    </div>
                <?php endif; ?>
                
                <?php if (have_posts()): ?>
                    
                    <?php if (is_home() || is_front_page()): ?>
                        <!-- Homepage content -->
                        <section class="business-listings">
                            <h2><?php echo get_socket_listings_title(); ?></h2>
                            
                            <!-- Directory Search and Filters -->
                            <?php get_template_part('template-parts/directory-search'); ?>
                            
                            <!-- Featured Businesses -->
                            <div class="featured-businesses">
                                <?php
                                $featured_businesses = get_featured_businesses(6);
                                if ($featured_businesses->have_posts()):
                                ?>
                                    <h3>Featured <?php echo get_current_socket_name(); ?></h3>
                                    <div class="business-grid">
                                        <?php while ($featured_businesses->have_posts()): $featured_businesses->the_post(); ?>
                                            <?php get_template_part('template-parts/business-card'); ?>
                                        <?php endwhile; ?>
                                    </div>
                                    <?php wp_reset_postdata(); ?>
                                <?php endif; ?>
                            </div>
                        </section>
                        
                    <?php elseif (is_post_type_archive('business_listing')): ?>
                        <!-- Business listings archive -->
                        <section class="business-archive">
                            <header class="archive-header">
                                <h1><?php post_type_archive_title(); ?></h1>
                                <?php if (get_the_archive_description()): ?>
                                    <div class="archive-description">
                                        <?php the_archive_description(); ?>
                                    </div>
                                <?php endif; ?>
                            </header>
                            
                            <!-- Directory Search and Filters -->
                            <?php get_template_part('template-parts/directory-search'); ?>
                            
                            <div class="business-listings-container">
                                <div id="socket-directory-results" class="socket-directory-results">
                                    <!-- Results loaded via AJAX -->
                                </div>
                            </div>
                        </section>
                        
                    <?php else: ?>
                        <!-- Standard post loop -->
                        <?php while (have_posts()): the_post(); ?>
                            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                                
                                <?php if (has_post_thumbnail()): ?>
                                    <div class="post-thumbnail">
                                        <?php the_post_thumbnail('large'); ?>
                                    </div>
                                <?php endif; ?>
                                
                                <header class="entry-header">
                                    <?php if (is_singular()): ?>
                                        <h1 class="entry-title"><?php the_title(); ?></h1>
                                    <?php else: ?>
                                        <h2 class="entry-title">
                                            <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                                        </h2>
                                    <?php endif; ?>
                                    
                                    <?php if (!is_page()): ?>
                                        <div class="entry-meta">
                                            <?php get_template_part('template-parts/entry-meta'); ?>
                                        </div>
                                    <?php endif; ?>
                                </header>
                                
                                <div class="entry-content">
                                    <?php
                                    if (is_singular()) {
                                        the_content();
                                    } else {
                                        the_excerpt();
                                    }
                                    ?>
                                </div>
                                
                                <?php if (is_singular() && get_post_type() === 'business_listing'): ?>
                                    <!-- Business-specific content -->
                                    <?php get_template_part('template-parts/business-details'); ?>
                                <?php endif; ?>
                                
                            </article>
                        <?php endwhile; ?>
                        
                        <?php if (!is_singular()): ?>
                            <!-- Pagination -->
                            <div class="pagination-wrapper">
                                <?php
                                the_posts_pagination(array(
                                    'prev_text' => '&laquo; Previous',
                                    'next_text' => 'Next &raquo;',
                                ));
                                ?>
                            </div>
                        <?php endif; ?>
                        
                    <?php endif; ?>
                    
                <?php else: ?>
                    <!-- No posts found -->
                    <div class="no-posts-found">
                        <h2>Nothing Found</h2>
                        <p>It looks like nothing was found at this location. Try using the search form below.</p>
                        <?php get_search_form(); ?>
                    </div>
                <?php endif; ?>
                
            </div>
            
            <!-- Sidebar -->
            <aside class="sidebar">
                <?php get_sidebar(); ?>
            </aside>
            
        </div>
        
        <?php if (is_home() || is_front_page()): ?>
            <!-- Homepage additional sections -->
            <section class="homepage-features">
                <div class="features-grid">
                    <div class="feature-item">
                        <h3>Find Local <?php echo get_current_socket_name(); ?></h3>
                        <p>Discover the best <?php echo strtolower(get_current_socket_name()); ?> in your area with our comprehensive directory.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Verified Reviews</h3>
                        <p>Read authentic reviews from real customers to make informed decisions.</p>
                    </div>
                    <div class="feature-item">
                        <h3>Easy Booking</h3>
                        <p>Book appointments, order online, or contact businesses directly with one click.</p>
                    </div>
                </div>
            </section>
            
            <!-- Recent businesses -->
            <?php
            $recent_businesses = new WP_Query(array(
                'post_type' => 'business_listing',
                'posts_per_page' => 3,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            
            if ($recent_businesses->have_posts()):
            ?>
                <section class="recent-businesses">
                    <h2>Recently Added</h2>
                    <div class="business-grid">
                        <?php while ($recent_businesses->have_posts()): $recent_businesses->the_post(); ?>
                            <?php get_template_part('template-parts/business-card'); ?>
                        <?php endwhile; ?>
                    </div>
                </section>
                <?php wp_reset_postdata(); ?>
            <?php endif; ?>
        <?php endif; ?>
        
    </div>
</main>

<?php get_footer(); ?>