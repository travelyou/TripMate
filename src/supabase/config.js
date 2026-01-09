// src/supabase/config.js
import { createClient } from '@supabase/supabase-js'

// Supabase 配置
// 從 Supabase Dashboard → Project Settings → API 獲取
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL // 你的 Supabase Project URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY // 你的 Supabase Anon Key

// 創建 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

