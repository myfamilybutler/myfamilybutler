-- Run this in your Supabase Dashboard -> SQL Editor

-- 1. Check if the user exists and is an admin
SELECT id, linked_email, display_name, is_admin, phone_number 
FROM users 
WHERE linked_email = 'info@myfamilybutler.com';

-- 2. If you need to MAKE them an admin, run this:
-- UPDATE users 
-- SET is_admin = true 
-- WHERE linked_email = 'info@myfamilybutler.com';
