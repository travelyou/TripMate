const authenticate = (req, res, next) => {
  const token = req.headers.authorization

  req.user = {
    uid: 'dev_test_user_id_001',
    email: 'dev@test.com',
    name: '開發測試員',
  }

  next()
}

module.exports = { authenticate }
