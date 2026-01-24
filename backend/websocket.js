/* eslint-env node */
/* global require, module, console, setInterval, clearInterval */
const { WebSocketServer } = require('ws')
const url = require('url')

// 存儲所有連接的用戶
const clients = new Map() // uid -> ws
const heartbeatIntervals = new Map() // ws -> interval

/**
 * 初始化 WebSocket 服務器
 * @param {http.Server} server - HTTP 服務器實例
 */
function initWebSocket(server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  })

  console.log('✅ WebSocket 服務器已啟動在 /ws')

  wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true)
    const uid = parameters.query.uid

    if (!uid) {
      console.warn('⚠️ WebSocket 連接失敗：缺少 UID')
      ws.close(1008, 'Missing UID')
      return
    }

    console.log(`🔗 用戶 ${uid} WebSocket 已連接`)

    // 如果該用戶已有連接，關閉舊連接
    if (clients.has(uid)) {
      const oldWs = clients.get(uid)
      const oldInterval = heartbeatIntervals.get(oldWs)
      if (oldInterval) {
        clearInterval(oldInterval)
        heartbeatIntervals.delete(oldWs)
      }
      oldWs.close()
    }

    // 保存新連接
    clients.set(uid, ws)

    // 設置心跳檢測（每30秒）
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping()
      }
    }, 30000)
    heartbeatIntervals.set(ws, heartbeatInterval)

    // 發送連接成功訊息
    ws.send(JSON.stringify({
      type: 'connected',
      uid,
      timestamp: new Date().toISOString()
    }))

    // 處理接收到的訊息
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString())
        handleMessage(uid, data, ws)
      } catch (error) {
        console.error('❌ WebSocket 訊息解析失敗:', error)
      }
    })

    // 處理連接關閉
    ws.on('close', () => {
      console.log(`🔌 用戶 ${uid} WebSocket 已斷開`)
      clients.delete(uid)
      const interval = heartbeatIntervals.get(ws)
      if (interval) {
        clearInterval(interval)
        heartbeatIntervals.delete(ws)
      }
    })

    // 處理錯誤
    ws.on('error', (error) => {
      console.error(`❌ WebSocket 錯誤 (用戶 ${uid}):`, error.message)
    })

    // 處理 pong 響應
    ws.on('pong', () => {
      // 心跳響應，連接正常
    })
  })

  return wss
}

/**
 * 處理 WebSocket 訊息
 * @param {string} senderUid - 發送者 UID
 * @param {Object} data - 訊息數據
 * @param {WebSocket} ws - WebSocket 連接
 */
function handleMessage(senderUid, data, ws) {
  const { type } = data

  switch (type) {
    case 'register':
      // 用戶註冊（已在連接時處理）
      console.log(`✅ 用戶 ${senderUid} 註冊成功`)
      break

    case 'chat_message':
      // 轉發聊天訊息
      handleChatMessage(senderUid, data)
      break

    case 'ping':
      // 心跳檢測
      ws.send(JSON.stringify({ type: 'pong' }))
      break

    default:
      console.warn(`⚠️ 未知的訊息類型: ${type}`)
  }
}

/**
 * 處理聊天訊息
 * @param {string} senderUid - 發送者 UID
 * @param {Object} data - 訊息數據
 */
function handleChatMessage(senderUid, data) {
  const { receiver_uid, content, timestamp, sender_name, sender_avatar } = data

  if (!receiver_uid) {
    console.warn('⚠️ 聊天訊息缺少接收者 UID')
    return
  }

  // 檢查接收者是否在線
  const receiverWs = clients.get(receiver_uid)
  
  if (receiverWs && receiverWs.readyState === receiverWs.OPEN) {
    // 轉發訊息給接收者
    receiverWs.send(JSON.stringify({
      type: 'chat_message',
      sender_uid: senderUid,
      sender_name,
      sender_avatar,
      content,
      timestamp: timestamp || new Date().toISOString()
    }))
    console.log(`📨 訊息已轉發：${senderUid} -> ${receiver_uid}`)
  } else {
    console.log(`📭 接收者 ${receiver_uid} 不在線，訊息未即時送達`)
  }
}

/**
 * 廣播訊息給所有連接的用戶
 * @param {Object} data - 要廣播的數據
 */
function broadcast(data) {
  const message = JSON.stringify(data)
  let sentCount = 0
  
  clients.forEach((ws, uid) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message)
      sentCount++
    }
  })
  
  console.log(`📢 廣播訊息已發送給 ${sentCount} 個用戶`)
}

/**
 * 發送訊息給特定用戶
 * @param {string} uid - 用戶 UID
 * @param {Object} data - 要發送的數據
 * @returns {boolean} - 是否發送成功
 */
function sendToUser(uid, data) {
  const ws = clients.get(uid)
  
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data))
    return true
  }
  
  return false
}

/**
 * 獲取在線用戶數量
 * @returns {number} - 在線用戶數量
 */
function getOnlineCount() {
  return clients.size
}

/**
 * 檢查用戶是否在線
 * @param {string} uid - 用戶 UID
 * @returns {boolean} - 是否在線
 */
function isUserOnline(uid) {
  const ws = clients.get(uid)
  return ws && ws.readyState === ws.OPEN
}

module.exports = {
  initWebSocket,
  broadcast,
  sendToUser,
  getOnlineCount,
  isUserOnline
}

