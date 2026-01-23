/* eslint-env node */
/* global require, process, module */
const { Pool } = require('pg')
require('dotenv').config()
const dns = require('dns')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')
const net = require('net')

const dnsLookup = promisify(dns.lookup)
const dnsResolve4 = promisify(dns.resolve4)

dns.setDefaultResultOrder('ipv4first')

const DEBUG_LOG_PATH = path.join(process.cwd(), '.cursor', 'debug.log')
const DEBUG_ENABLED = process.env.DB_DEBUG_LOG === '1'
function debugLog(location, message, data, hypothesisId) {
  if (!DEBUG_ENABLED) return
  try {
    const logDir = path.dirname(DEBUG_LOG_PATH)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    const logEntry =
      JSON.stringify({
        location,
        message,
        data,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId,
      }) + '\n'
    fs.appendFileSync(DEBUG_LOG_PATH, logEntry, 'utf8')
  } catch {
    // ignore
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getNestedErrorCodes(err) {
  const codes = new Set()
  if (err?.code) codes.add(err.code)
  if (Array.isArray(err?.errors)) {
    for (const e of err.errors) {
      if (e?.code) codes.add(e.code)
    }
  }
  return [...codes]
}

function shouldRetryConnectionError(err) {
  const codes = getNestedErrorCodes(err)
  return codes.some((c) =>
    [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'EAI_AGAIN',
      'ENOTFOUND',
    ].includes(c),
  )
}

function checkEnvVars() {
  if (process.env.DB_URL || process.env.DATABASE_URL) {
    return true
  }

  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
  const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName])

  if (missingEnvVars.length > 0) {
    console.error('缺少環境變數：', missingEnvVars.join(', '))
    console.error('請確認 backend/.env 文件存在且包含所有必要的配置。')
    console.error('或者提供 DB_URL。')
    return false
  }
  return true
}

async function createPool() {
  // #region agent log
  debugLog('connection.js:55', 'createPool entry', { timestamp: Date.now() }, 'A')
  // #endregion
  if (!checkEnvVars()) {
    throw new Error('缺少必要的環境變數')
  }

  const isDev = process.env.NODE_ENV === 'development'
  const connectionString = process.env.DB_URL || process.env.DATABASE_URL

  if (connectionString) {
    console.log('使用連接字符串模式（DB_URL/DATABASE_URL）')
    console.log('連接字符串來源:', process.env.DB_URL ? 'DB_URL' : 'DATABASE_URL')

    try {
      const poolConfig = {
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        connectionTimeoutMillis:
          parseInt(process.env.DB_CONNECT_TIMEOUT_MS) || (isDev ? 20000 : 30000),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS) || (isDev ? 20000 : 60000),
        max: parseInt(process.env.DB_POOL_MAX) || 3,
        keepAlive: true,
        keepAliveInitialDelayMillis: parseInt(process.env.DB_KEEPALIVE_DELAY_MS) || 10000,
        maxLifetime: parseInt(process.env.DB_MAX_LIFETIME_MS) || 3600000,
      }

      const isPooler = connectionString.includes('-pooler')
      if (isPooler) {
        console.log('✅ 檢測到連接池端點（Connection Pooling）')
        if (!process.env.DB_CONNECT_TIMEOUT_MS) {
          poolConfig.connectionTimeoutMillis = isDev ? 20000 : 30000
          console.log(
            `  連接超時已設置為 ${poolConfig.connectionTimeoutMillis / 1000} 秒（連接池端點需要更長時間）`,
          )
        }
      }

      const pool = new Pool(poolConfig)

      console.log('測試連接字符串連接...')
      await pool.query('SELECT 1')
      // 設置 search_path
      await pool.query('SET search_path TO public, travelers, discussion')
      console.log('✅ search_path 已設置: public, travelers, discussion')
      console.log('連接字符串連接成功！')

      pool.on('connect', async (client) => {
        console.log('資料庫連接成功！')
        // 設置 search_path 包含 travelers 和 discussion schema
        try {
          await client.query('SET search_path TO public, travelers, discussion')
          console.log('✅ search_path 已設置: public, travelers, discussion')
        } catch (err) {
          console.warn('⚠️ 設置 search_path 失敗:', err.message)
        }
        debugLog('connection.js:198', 'Pool connect event', { timestamp: Date.now() }, 'A,B,C')
      })

      pool.on('error', (err) => {
        console.error('資料庫連接池錯誤：', err.message)
        console.error('錯誤代碼：', err.code)
        debugLog(
          'connection.js:205',
          'Pool error event',
          { code: err.code, message: err.message, errno: err.errno, syscall: err.syscall },
          'A,B,C',
        )
        if (err.code === 'ENOTFOUND') {
          console.error('無法解析資料庫主機名，請檢查連接字符串是否正確')
        } else if (err.code === '28000') {
          console.error('Neon 連接錯誤：可能是 SNI 或 endpoint 配置問題')
        }
        if (err.detail) console.error('錯誤詳情：', err.detail)
        if (err.hint) console.error('提示：', err.hint)
      })

      return pool
    } catch (error) {
      console.error('連接字符串連接失敗：', error.message)
      console.error('嘗試回退到分離配置模式...')
      // 如果连接字符串失败，继续使用分离配置
    }
  }

  // 使用分离配置模式
  console.log('📋 使用分離配置模式（DB_HOST, DB_PORT, etc.）')
  console.log('資料庫連接配置：')
  console.log('  DB_HOST:', process.env.DB_HOST)
  console.log('  DB_PORT:', process.env.DB_PORT)
  console.log('  DB_NAME:', process.env.DB_NAME)
  console.log('  DB_USER:', process.env.DB_USER)
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '已設置' : '未設置')
  console.log(
    '  連接池模式:',
    process.env.USE_POOLING === 'true' || process.env.USE_POOLING === '1' ? '啟用' : '停用',
  )

  if (
    process.env.DB_HOST &&
    (process.env.DB_HOST.includes(':') || process.env.DB_HOST.includes('/'))
  ) {
    console.error('警告：DB_HOST 包含端口或路徑，這是不正確的！')
  }

  const dbHost = process.env.DB_HOST

  const disablePreflight = process.env.DB_PREFLIGHT_DISABLED === '1'

  if (disablePreflight) {
    console.log('DB preflight (DNS/TCP) disabled (DB_PREFLIGHT_DISABLED=1)')
  }

  const isNeonPooler = typeof dbHost === 'string' && dbHost.includes('-pooler')

  if (isNeonPooler) {
    console.log('檢測到 Neon 連接池端點（Connection Pooling）')
  }

  if (typeof dbHost === 'string' && dbHost.includes(':')) {
    throw new Error(
      'DB_HOST 格式不支援（包含 ":"）。此專案已設定為僅使用 IPv4，請改用 IPv4 的 DB_HOST（例如 IPv4 位址或可解析出 A 記錄的主機名）。',
    )
  }

  if (!disablePreflight) {
    // #region agent log
    const dnsStartTime = Date.now()
    debugLog(
      'connection.js:92',
      'DNS resolution start',
      { host: dbHost, startTime: dnsStartTime },
      'C',
    )
    // #endregion
    let resolvedIp = null
    try {
      const addrs4 = await dnsResolve4(dbHost)
      if (!addrs4?.length) throw new Error('查無 IPv4 A 記錄')
      resolvedIp = addrs4[0]
      console.log(`DNS A 記錄可用（IPv4）：${resolvedIp}`)
      // #region agent log
      debugLog(
        'connection.js:97',
        'DNS resolution success',
        { ip: resolvedIp, duration: Date.now() - dnsStartTime },
        'C',
      )
      // #endregion
    } catch (e) {
      try {
        const lookedUp = await dnsLookup(dbHost, { family: 4 })
        resolvedIp = lookedUp.address
        console.log(`DNS lookup 可用（IPv4）：${resolvedIp}`)
        // #region agent log
        debugLog(
          'connection.js:103',
          'DNS lookup fallback success',
          { ip: resolvedIp, duration: Date.now() - dnsStartTime },
          'C',
        )
        // #endregion
      } catch (e2) {
        const msg = e?.message || e2?.message || '未知 DNS 錯誤'
        throw new Error(`僅 IPv4 模式下 DNS 解析失敗：${msg}（請確認 DB_HOST 有 IPv4 A 記錄）`)
      }
    }

    const dbPort = parseInt(process.env.DB_PORT) || 5432
    // #region agent log
    const tcpTestStartTime = Date.now()
    debugLog(
      'connection.js:110',
      'TCP connection test start',
      { ip: resolvedIp, port: dbPort },
      'F,H',
    )
    // #endregion
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket()
        const timeout = 10000
        let resolved = false

        socket.setTimeout(timeout)
        socket.once('connect', () => {
          if (!resolved) {
            resolved = true
            socket.destroy()
            resolve()
          }
        })
        socket.once('timeout', () => {
          if (!resolved) {
            resolved = true
            socket.destroy()
            reject(new Error('TCP connection timeout'))
          }
        })
        socket.once('error', (err) => {
          if (!resolved) {
            resolved = true
            reject(err)
          }
        })
        socket.connect(dbPort, resolvedIp)
      })
      // #region agent log
      debugLog(
        'connection.js:173',
        'TCP connection test success',
        { duration: Date.now() - tcpTestStartTime },
        'F,H',
      )
      // #endregion
      console.log(`TCP 連接測試成功：${resolvedIp}:${dbPort}`)
    } catch (tcpError) {
      // #region agent log
      debugLog(
        'connection.js:177',
        'TCP connection test failed',
        {
          error: tcpError.message,
          code: tcpError.code,
          errno: tcpError.errno,
          duration: Date.now() - tcpTestStartTime,
        },
        'F,H',
      )
      // #endregion
      console.error(`TCP 連接測試失敗：${tcpError.message}`)
      console.error(`錯誤代碼：${tcpError.code || 'N/A'}`)
      console.error(`這可能表示網路路由或防火牆問題`)
      if (isNeonPooler) {
        console.error(`檢測到連接池端點，但本地環境可能無法連接`)
        console.error(`建議解決方案：`)
        console.error(`1. 檢查網路連接和防火牆設置`)
        console.error(`2. 嘗試使用非連接池端點（在 DB_HOST 中去掉 -pooler 後綴）`)
        console.error(`3. 確認 Neon 連接池端點是否允許從當前 IP 連接`)
        console.error(`4. 如果是在本地開發，考慮使用非連接池端點`)
      }
      console.warn(`警告：TCP 測試失敗，但將繼續嘗試連接資料庫...`)
    }
  }
  const poolConfig = {
    host: dbHost,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // 注意：對於 Neon 連接池，不能使用 options 參數
    // 我們將在連接建立後通過 SET search_path 命令設置（見 pool.on('connect') 事件）
    connectionTimeoutMillis: isNeonPooler
      ? parseInt(process.env.DB_CONNECT_TIMEOUT_MS) || (isDev ? 20000 : 120000)
      : parseInt(process.env.DB_CONNECT_TIMEOUT_MS) || (isDev ? 20000 : 60000),
    idleTimeoutMillis: isNeonPooler
      ? parseInt(process.env.DB_IDLE_TIMEOUT_MS) || (isDev ? 20000 : 60000)
      : parseInt(process.env.DB_IDLE_TIMEOUT_MS) || (isDev ? 20000 : 30000),
    max: parseInt(process.env.DB_POOL_MAX) || 3,
    keepAlive: true,
    keepAliveInitialDelayMillis: parseInt(process.env.DB_KEEPALIVE_DELAY_MS) || 10000,
    maxLifetime: parseInt(process.env.DB_MAX_LIFETIME_MS) || 3600000,
  }
  // #region agent log
  debugLog(
    'connection.js:120',
    'poolConfig created',
    {
      connectionTimeout: poolConfig.connectionTimeoutMillis,
      idleTimeout: poolConfig.idleTimeoutMillis,
      max: poolConfig.max,
      isNeonPooler,
      hasSSL: !!poolConfig.ssl,
    },
    'A,D',
  )
  // #endregion

  poolConfig.family = 4
  poolConfig.lookup = (hostname, options, callback) => {
    if (resolvedIp && hostname === dbHost) {
      console.log(`使用已解析的 IP 地址：${resolvedIp}（主機名：${hostname}）`)
      return callback(null, resolvedIp, 4)
    }
    return dns.lookup(
      hostname,
      { ...(options || {}), family: 4, all: false },
      (err, address, family) => {
        if (err) {
          console.warn(`DNS lookup 失敗（${hostname}）：${err.message}，嘗試使用已解析的 IP`)
          if (resolvedIp) {
            return callback(null, resolvedIp, 4)
          }
          return callback(err)
        }
        console.log(`DNS lookup 成功：${address}（主機名：${hostname}）`)
        callback(null, address, family || 4)
      },
    )
  }

  if (typeof dbHost === 'string' && dbHost.endsWith('.neon.tech')) {
    if (!isNeonPooler) {
      const firstLabel = dbHost.split('.')[0] || ''
      const endpointId = firstLabel

      if (endpointId) {
        poolConfig.options = `endpoint=${endpointId}`
        console.log(`Neon: 已自動注入 endpoint options（endpoint=${endpointId}）以確保相容性`)
      }
    } else {
      console.log(`Neon 連接池：使用 SNI 自動處理，不設置 endpoint option`)
    }
  }

  const dbSslRaw = (process.env.DB_SSL ?? 'true').toString().toLowerCase()
  const useSsl = dbSslRaw !== 'false' && dbSslRaw !== '0' && dbSslRaw !== 'no'

  if (isNeonPooler) {
    console.log('✅ 使用 Neon 連接池模式')
    if (useSsl) {
      poolConfig.ssl = {
        rejectUnauthorized: false,
        servername: dbHost,
      }
      console.log(`SSL 配置：servername=${dbHost}`)
      debugLog(
        'connection.js:151',
        'SSL config set for pooler',
        { servername: dbHost, rejectUnauthorized: false },
        'B',
      )
    }

    if (!process.env.DB_CONNECT_TIMEOUT_MS) {
      poolConfig.connectionTimeoutMillis = isDev ? 20000 : 120000
      console.log(`連接超時已設置為 120 秒（連接池端點需要更長時間）`)
      debugLog(
        'connection.js:190',
        'connectionTimeout set to 120000 for pooler',
        { timeout: 120000 },
        'A',
      )
    }
  } else if (useSsl) {
    poolConfig.ssl = { rejectUnauthorized: false, servername: dbHost }
  }

  const poolCreateStartTime = Date.now()
  debugLog(
    'connection.js:189',
    'Pool creation start',
    {
      config: JSON.stringify({
        host: poolConfig.host,
        port: poolConfig.port,
        database: poolConfig.database,
        user: poolConfig.user,
        hasPassword: !!poolConfig.password,
        connectionTimeout: poolConfig.connectionTimeoutMillis,
        hasSSL: !!poolConfig.ssl,
      }),
    },
    'D,E',
  )
  // #endregion
  const pool = new Pool(poolConfig)
  debugLog(
    'connection.js:193',
    'Pool object created',
    { duration: Date.now() - poolCreateStartTime },
    'D',
  )
  // #endregion

  pool.on('connect', async (client) => {
    console.log('資料庫連接成功！')
    // 設置 search_path 包含 travelers 和 discussion schema
    try {
      await client.query('SET search_path TO public, travelers, discussion')
      console.log('✅ search_path 已設置: public, travelers, discussion')
    } catch (err) {
      console.warn('⚠️ 設置 search_path 失敗:', err.message)
    }
    debugLog('connection.js:198', 'Pool connect event', { timestamp: Date.now() }, 'A,B,C')
    // #endregion
  })

  pool.on('error', (err) => {
    console.error('資料庫連接池錯誤：', err.message)
    console.error('錯誤代碼：', err.code)
    debugLog(
      'connection.js:205',
      'Pool error event',
      { code: err.code, message: err.message, errno: err.errno, syscall: err.syscall },
      'A,B,C',
    )
    // #endregion
    if (err.code === 'ENOTFOUND') {
      console.error('無法解析資料庫主機名，請檢查 DB_HOST 是否正確')
    } else if (err.code === '28000') {
      console.error('Neon 連接錯誤：可能是 SNI 或 endpoint 配置問題')
    }
    if (err.detail) console.error('錯誤詳情：', err.detail)
    if (err.hint) console.error('提示：', err.hint)
  })

  return pool
}

let poolInstance = null
let initPromise = null
let initError = null

async function initializePool() {
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    const isDev = process.env.NODE_ENV === 'development'
    const maxAttempts = parseInt(process.env.DB_CONNECT_MAX_ATTEMPTS) || (isDev ? 2 : 3)
    const baseDelayMs = parseInt(process.env.DB_CONNECT_RETRY_BASE_DELAY_MS) || (isDev ? 500 : 2000)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let pool = null
      try {
        const attemptStartTime = Date.now()
        debugLog(
          'connection.js:239',
          'Connection attempt start',
          { attempt, maxAttempts, startTime: attemptStartTime },
          'A',
        )
        // #endregion
        pool = await createPool()

        debugLog(
          'connection.js:243',
          'Pool created, query test skipped (already tested in createPool)',
          { duration: Date.now() - attemptStartTime },
          'A',
        )
        // #endregion
        // 設置 search_path
        await pool.query('SET search_path TO public, travelers, discussion')
        console.log('✅ search_path 已設置: public, travelers, discussion')

        debugLog(
          'connection.js:248',
          'Search_path set',
          { totalDuration: Date.now() - attemptStartTime },
          'A,B,C',
        )
        // #endregion

        poolInstance = pool
        console.log('資料庫連接池已初始化（且已驗證可查詢）')
        return pool
      } catch (error) {
        initError = error
        const codes = getNestedErrorCodes(error)

        debugLog(
          'connection.js:258',
          'Connection attempt failed',
          {
            attempt,
            maxAttempts,
            errorName: error?.name,
            errorCode: error?.code,
            errorMessage: error?.message,
            codes,
            isAggregateError: error?.name === 'AggregateError',
            hasErrors: !!error?.errors,
            errors: error?.errors?.map((e) => ({
              code: e.code,
              message: e.message,
              errno: e.errno,
              syscall: e.syscall,
              address: e.address,
              port: e.port,
            })),
          },
          'A,B,C,D,E',
        )
        // #endregion
        console.error(
          `資料庫連接池初始化失敗（第 ${attempt}/${maxAttempts} 次）：`,
          error?.message || '(no message)',
        )
        console.error('資料庫連接池初始化失敗（完整錯誤物件）：', error)
        console.error(
          '資料庫錯誤欄位：',
          JSON.stringify(
            {
              name: error?.name,
              code: error?.code,
              nestedCodes: codes,
              errno: error?.errno,
              syscall: error?.syscall,
              address: error?.address,
              port: error?.port,
              severity: error?.severity,
              detail: error?.detail,
              hint: error?.hint,
              routine: error?.routine,
              where: error?.where,
            },
            null,
            2,
          ),
        )
        if (error?.stack) console.error('stack:', error.stack)

        try {
          if (pool) await pool.end()
        } catch {
          // ignore
        }

        const retryable = shouldRetryConnectionError(error)
        if (!retryable || attempt === maxAttempts) {
          throw error
        }

        const delay = Math.min(15000, baseDelayMs * attempt)
        console.log(`資料庫連線失敗可重試，${delay}ms 後重試...`)
        await sleep(delay)
      }
    }

    const finalError = initError || new Error('資料庫連接池初始化失敗（未知原因）')
    const errorMessage = finalError.message || '未知錯誤'
    const errorCode = finalError.code || ''
    const errorDetails = finalError.errors
      ? finalError.errors.map((e) => `${e.code || ''}: ${e.message || ''}`).join('; ')
      : ''

    const fullMessage = `資料庫連接池初始化失敗：${errorMessage}${errorCode ? ` (${errorCode})` : ''}${errorDetails ? ` - ${errorDetails}` : ''}`
    const error = new Error(fullMessage)
    error.originalError = finalError
    error.code = errorCode
    throw error
  })()

  return initPromise
}

module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      if (poolInstance) {
        const value = poolInstance[prop]
        return typeof value === 'function' ? value.bind(poolInstance) : value
      }

      if (initError) {
        const errorMessage = initError.message || '未知錯誤'
        const errorCode = initError.code || ''
        const errorDetails = initError.errors
          ? initError.errors.map((e) => `${e.code || ''}: ${e.message || ''}`).join('; ')
          : ''

        const fullMessage = `資料庫連接池初始化失敗：${errorMessage}${errorCode ? ` (${errorCode})` : ''}${errorDetails ? ` - ${errorDetails}` : ''}`
        const error = new Error(fullMessage)
        error.originalError = initError
        error.code = errorCode
        throw error
      }

      const asyncMethods = ['query', 'connect', 'end']
      if (asyncMethods.includes(prop)) {
        return async function (...args) {
          await initializePool()
          const method = poolInstance[prop]
          if (typeof method !== 'function') return method

          if (prop === 'query') {
            const maxAttempts = parseInt(process.env.DB_QUERY_MAX_ATTEMPTS) || 3
            const baseDelayMs = parseInt(process.env.DB_QUERY_RETRY_BASE_DELAY_MS) || 500

            let lastErr
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              try {
                return await method.apply(poolInstance, args)
              } catch (e) {
                lastErr = e
                const retryable = shouldRetryConnectionError(e)
                if (!retryable || attempt === maxAttempts) throw e

                const delay = Math.min(3000, baseDelayMs * attempt)
                console.warn(
                  `[DB] query 失敗可重試（第 ${attempt}/${maxAttempts} 次，codes=${getNestedErrorCodes(e).join(',') || 'n/a'}），${delay}ms 後重試...`,
                )
                await sleep(delay)
              }
            }
            throw lastErr
          }

          return method.apply(poolInstance, args)
        }
      }

      throw new Error('資料庫連接池尚未初始化，請稍後再試或檢查環境變數')
    },
  },
)
