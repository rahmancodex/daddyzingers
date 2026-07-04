
UPDATE menu_items SET image_url = '/menu/' || split_part(image_url, '/', 5) WHERE image_url LIKE '/__l5e/%';
UPDATE menu_categories SET image_url = '/menu/' || split_part(image_url, '/', 5) WHERE image_url LIKE '/__l5e/%';
UPDATE promo_banners SET desktop_image_url = '/menu/' || split_part(desktop_image_url, '/', 5) WHERE desktop_image_url LIKE '/__l5e/%';
UPDATE promo_banners SET mobile_image_url = '/menu/' || split_part(mobile_image_url, '/', 5) WHERE mobile_image_url LIKE '/__l5e/%';
