/* eslint-env node */
/* global require, module */
const express = require('express')
const router = express.Router()
const pool = require('../database/connection')

// 確保功能位置表存在
const ensureFeatureLocationsTable = async () => {
  try {
    console.log('[AI Features] 開始檢查/創建功能位置表...')

    await pool.query(
      `CREATE TABLE IF NOT EXISTS public.feature_locations (
        id SERIAL PRIMARY KEY,
        feature_name VARCHAR(255) NOT NULL UNIQUE,
        feature_name_zh VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        route_path VARCHAR(500),
        icon_name VARCHAR(100),
        keywords TEXT[],
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    console.log('[AI Features] 功能位置表已確保存在')

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_feature_locations_keywords 
       ON public.feature_locations USING GIN(keywords)`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_feature_locations_category 
       ON public.feature_locations(category)`,
    )
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_feature_locations_is_active 
       ON public.feature_locations(is_active)`,
    )
    console.log('[AI Features] 功能位置表索引已確保存在')

    // 初始化一些基本功能位置数据
    await initializeDefaultFeatures()
  } catch (error) {
    console.error('[AI Features] 創建功能位置表或索引失敗：', error)
    throw error
  }
}

// 初始化預設功能位置資料
const initializeDefaultFeatures = async () => {
  try {
    const defaultFeatures = [
      {
        feature_name: 'discussions',
        feature_name_zh: '討論區',
        category: '社交',
        description: '瀏覽和參與旅遊討論區貼文',
        route_path: '/discussions',
        icon_name: 'MessageSquare',
        keywords: ['討論', '討論區', '貼文', '發文', '留言', '評論', 'forum', 'discussion'],
      },
      {
        feature_name: 'travelers',
        feature_name_zh: '找旅伴',
        category: '社交',
        description: '尋找或發布免費的找旅伴行程',
        route_path: '/travelers',
        icon_name: 'Users',
        keywords: ['找旅伴', '旅伴', '揪團', '免費行程', 'traveler', 'group'],
      },
      {
        feature_name: 'featured',
        feature_name_zh: '精選行程',
        category: '行程',
        description: '瀏覽付費的精選行程（由商家提供）',
        route_path: '/featured',
        icon_name: 'Star',
        keywords: ['精選', '付費行程', '商家', '旅行社', 'featured', 'vendor'],
      },
      {
        feature_name: 'my-itinerary',
        feature_name_zh: '我的行程',
        category: '行程',
        description: '管理個人行程規劃，類似 Google 日曆',
        route_path: '/my-itinerary',
        icon_name: 'Calendar',
        keywords: ['我的行程', '行程規劃', '日曆', 'itinerary', 'plan'],
      },
      {
        feature_name: 'profile',
        feature_name_zh: '個人頁面',
        category: '個人',
        description: '查看和管理個人資料、許願池、虛擬護照',
        route_path: '/profile',
        icon_name: 'User',
        keywords: ['個人', '個人頁面', '資料', 'profile', '許願池', '護照'],
      },
      {
        feature_name: 'swipes',
        feature_name_zh: '滑卡配對',
        category: '社交',
        description: '類似 Tinder 的滑卡配對功能，尋找旅伴',
        route_path: '/swipes',
        icon_name: 'Heart',
        keywords: ['配對', '滑卡', 'swipe', 'match', '配對系統'],
      },
      {
        feature_name: 'cart',
        feature_name_zh: '購物車',
        category: '購物',
        description: '查看購物車中的行程',
        route_path: '/cart',
        icon_name: 'ShoppingCart',
        keywords: ['購物車', 'cart', '結帳'],
      },
      {
        feature_name: 'orders',
        feature_name_zh: '我的訂單',
        category: '購物',
        description: '查看已購買的精選行程訂單',
        route_path: '/orders',
        icon_name: 'Package',
        keywords: ['訂單', 'order', '購買記錄'],
      },
      {
        feature_name: 'favorites',
        feature_name_zh: '我的收藏',
        category: '個人',
        description: '查看按讚的內容列表',
        route_path: '/favorites',
        icon_name: 'Heart',
        keywords: ['收藏', '按讚', 'favorite', 'like'],
      },
      {
        feature_name: 'collections',
        feature_name_zh: '收藏夾',
        category: '個人',
        description: '使用自訂標籤分類收藏的內容',
        route_path: '/collections',
        icon_name: 'Folder',
        keywords: ['收藏夾', '標籤', '分類', 'collection', 'tag'],
      },
    ]

    for (const feature of defaultFeatures) {
      await pool.query(
        `INSERT INTO public.feature_locations 
         (feature_name, feature_name_zh, category, description, route_path, icon_name, keywords, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (feature_name) DO UPDATE SET
         feature_name_zh = EXCLUDED.feature_name_zh,
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         route_path = EXCLUDED.route_path,
         icon_name = EXCLUDED.icon_name,
         keywords = EXCLUDED.keywords,
         updated_at = CURRENT_TIMESTAMP`,
        [
          feature.feature_name,
          feature.feature_name_zh,
          feature.category,
          feature.description,
          feature.route_path,
          feature.icon_name,
          feature.keywords,
          true,
        ],
      )
    }
    console.log('[AI Features] 預設功能位置資料已初始化')
  } catch (error) {
    console.error('[AI Features] 初始化預設功能位置資料失敗：', error)
  }
}

// GET: 根據關鍵字搜尋功能位置
router.get('/search', async (req, res) => {
  try {
    await ensureFeatureLocationsTable()

    const { query, category } = req.query

    if (!query) {
      return res.status(400).json({
        success: false,
        error: '請提供搜尋關鍵字',
      })
    }

    let sql = `
      SELECT 
        id,
        feature_name,
        feature_name_zh,
        category,
        description,
        route_path,
        icon_name,
        keywords
      FROM public.feature_locations
      WHERE is_active = true
        AND (
          feature_name_zh ILIKE $1
          OR description ILIKE $1
          OR $2 = ANY(keywords)
          OR EXISTS (
            SELECT 1 FROM unnest(keywords) AS keyword
            WHERE keyword ILIKE $1
          )
        )
    `

    const params = [`%${query}%`, query.toLowerCase()]

    if (category) {
      sql += ' AND category = $3'
      params.push(category)
    }

    sql += ' ORDER BY category, feature_name_zh LIMIT 10'

    const result = await pool.query(sql, params)

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    console.error('[AI Features] 搜尋功能位置失敗：', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// GET: 獲取所有功能位置（用於 AI 系統提示詞）
router.get('/all', async (req, res) => {
  try {
    await ensureFeatureLocationsTable()

    const result = await pool.query(
      `SELECT 
        feature_name,
        feature_name_zh,
        category,
        description,
        route_path,
        keywords
      FROM public.feature_locations
      WHERE is_active = true
      ORDER BY category, feature_name_zh`,
    )

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    console.error('[AI Features] 獲取所有功能位置失敗：', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// POST: 創建或更新功能位置（管理用）
router.post('/', async (req, res) => {
  try {
    await ensureFeatureLocationsTable()

    const {
      feature_name,
      feature_name_zh,
      category,
      description,
      route_path,
      icon_name,
      keywords,
    } = req.body

    if (!feature_name || !feature_name_zh) {
      return res.status(400).json({
        success: false,
        error: 'feature_name 和 feature_name_zh 為必填欄位',
      })
    }

    const result = await pool.query(
      `INSERT INTO public.feature_locations 
       (feature_name, feature_name_zh, category, description, route_path, icon_name, keywords)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (feature_name) DO UPDATE SET
       feature_name_zh = EXCLUDED.feature_name_zh,
       category = EXCLUDED.category,
       description = EXCLUDED.description,
       route_path = EXCLUDED.route_path,
       icon_name = EXCLUDED.icon_name,
       keywords = EXCLUDED.keywords,
       updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        feature_name,
        feature_name_zh,
        category || null,
        description || null,
        route_path || null,
        icon_name || null,
        keywords || [],
      ],
    )

    res.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error) {
    console.error('[AI Features] 創建功能位置失敗：', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

module.exports = router

