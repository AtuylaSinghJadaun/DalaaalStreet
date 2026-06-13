import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hfdoklohhsklrbqdzwyt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZG9rbG9oaHNrbHJicWR6d3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDY2MzEsImV4cCI6MjA5Njc4MjYzMX0.RvtDjWiRy9iE8jDLekmycRCl2KsymuXMkd7vk_1l4CM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
