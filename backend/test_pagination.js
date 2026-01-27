const axios = require('axios')

async function testPagination() {
  console.log('🧪 測試貼文分頁功能\n')

  try {
    // 測試 1: 預設（無參數）
    console.log('📋 測試 1: 預設參數')
    const test1 = await axios.get('http://localhost:3000/api/vendors/vendor001/posts')
    console.log(`✅ 回傳格式:`, test1.data.pagination ? '有分頁資訊' : '❌ 缺少分頁資訊')
    console.log(`   資料數量: ${test1.data.data?.length || test1.data.length}`)
    if (test1.data.pagination) {
      console.log(`   分頁: ${test1.data.pagination.page}/${test1.data.pagination.totalPages}`)
      console.log(`   總數: ${test1.data.pagination.total}`)
    }
    console.log()

    // 測試 2: 第一頁（5筆）
    console.log('📋 測試 2: 第一頁，每頁5筆')
    const test2 = await axios.get('http://localhost:3000/api/vendors/vendor001/posts?page=1&limit=5')
    console.log(`✅ 資料數量: ${test2.data.data.length}`)
    console.log(`   分頁: ${test2.data.pagination.page}/${test2.data.pagination.totalPages}`)
    console.log(`   hasMore: ${test2.data.pagination.hasMore}`)
    console.log()

    // 測試 3: 第二頁（5筆）
    console.log('📋 測試 3: 第二頁，每頁5筆')
    const test3 = await axios.get('http://localhost:3000/api/vendors/vendor001/posts?page=2&limit=5')
    console.log(`✅ 資料數量: ${test3.data.data.length}`)
    console.log(`   分頁: ${test3.data.pagination.page}/${test3.data.pagination.totalPages}`)
    console.log(`   hasMore: ${test3.data.pagination.hasMore}`)
    console.log()

    console.log('✅ 所有測試完成！')
  } catch (error) {
    console.error('❌ 測試失敗:', error.response?.data || error.message)
  }
}

testPagination()
