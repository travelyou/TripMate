const axios = require('axios')

async function testPagination() {
  try {
    const test1 = await axios.get('http://localhost:3000/api/vendors/vendor001/posts')
    if (test1.data.pagination) {
    }

    const test2 = await axios.get('http://localhost:3000/api/vendors/vendor001/posts?page=1&limit=5')

    const test3 = await axios.get('http://localhost:3000/api/vendors/vendor001/posts?page=2&limit=5')

  } catch (error) {
  }
}

testPagination()
