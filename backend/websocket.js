/* eslint-env node */
/* global require, module, console, setInterval, clearInterval */
const { WebSocketServer } = require('ws')
const url = require('url')

const clients = new Map()
const heartbeatIntervals = new Map()

function initWebSocket(server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  })

  wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true)
    const uid = parameters.query.uid

    if (!uid) {
      ws.close(1008, 'Missing UID')
      return
    }

    if (clients.has(uid)) {
      const oldWs = clients.get(uid)
      const oldInterval = heartbeatIntervals.get(oldWs)
      if (oldInterval) {
        clearInterval(oldInterval)
        heartbeatIntervals.delete(oldWs)
      }
      oldWs.close()
    }

    clients.set(uid, ws)

    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping()
      }
    }, 30000)
    heartbeatIntervals.set(ws, heartbeatInterval)

    ws.send(JSON.stringify({
      type: 'connected',
      uid,
      timestamp: new Date().toISOString()
    }))

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString())
        handleMessage(uid, data, ws)
      } catch (error) {
      }
    })

    ws.on('close', () => {
      clients.delete(uid)
      const interval = heartbeatIntervals.get(ws)
      if (interval) {
        clearInterval(interval)
        heartbeatIntervals.delete(ws)
      }
    })

    ws.on('error', (error) => {
    })

    ws.on('pong', () => {
    })
  })

  return wss
}

function handleMessage(senderUid, data, ws) {
  const { type } = data

  switch (type) {
    case 'register':
      break

    case 'chat_message':
      handleChatMessage(senderUid, data)
      break

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }))
      break

    default:
  }
}

function handleChatMessage(senderUid, data) {
  const { receiver_uid, content, timestamp, sender_name, sender_avatar } = data

  if (!receiver_uid) {
    return
  }

  if (receiver_uid === senderUid) {
    return
  }

  const receiverWs = clients.get(receiver_uid)
  
  if (receiverWs && receiverWs.readyState === receiverWs.OPEN) {
    receiverWs.send(JSON.stringify({
      type: 'chat_message',
      sender_uid: senderUid,
      sender_name,
      sender_avatar,
      content,
      timestamp: timestamp || new Date().toISOString()
    }))
  }
}

function broadcast(data) {
  const message = JSON.stringify(data)
  let sentCount = 0
  
  clients.forEach((ws, uid) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message)
      sentCount++
    }
  })
}

function sendToUser(uid, data) {
  const ws = clients.get(uid)
  
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data))
    return true
  }
  
  return false
}

function getOnlineCount() {
  return clients.size
}

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

