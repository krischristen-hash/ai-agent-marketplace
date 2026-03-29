import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://latoisacellcgrlvcpjz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdG9pc2FjZWxsY2dybHZjcGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDY4OTgsImV4cCI6MjA5MDM4Mjg5OH0.wuibE6munsQ40uTS3S4Aw33aY0k_6dtl1GFzjuIAVXo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export default supabase
