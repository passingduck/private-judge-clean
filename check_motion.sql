-- Check if motion exists and RLS status
SELECT 
  'Motions table RLS' as check_type,
  relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'motions';

SELECT 
  'Motion record' as check_type,
  id, room_id, title, status
FROM public.motions
WHERE room_id = 'b98febe6-00b6-48dd-ac1a-3a36a94c12e1';
