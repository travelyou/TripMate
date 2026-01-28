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
    return false
  }
  return true
}

function isLocalDatabase() {
  const preferLocal = process.env.DB_PREFER_LOCAL === 'true' || process.env.DB_PREFER_LOCAL === '1'

  const dbHost = process.env.DB_HOST
  const connectionString = process.env.DB_URL || process.env.DATABASE_URL

  let hasLocalConfig = false
  if (connectionString) {
    hasLocalConfig = connectionString.includes('localhost') ||
                     connectionString.includes('127.0.0.1') ||
                     connectionString.includes('::1')
  } else if (dbHost) {
    const localHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0']
    hasLocalConfig = localHosts.includes(dbHost.toLowerCase())
  }

  if (preferLocal && hasLocalConfig) {
    return true
  }

  return hasLocalConfig
}

async function createPool() {
  debugLog('connection.js:55', 'createPool entry', { timestamp: Date.now() }, 'A')
  if (!checkEnvVars()) {
    throw new Error('缺少必要的環境變數')
  }

  const isDev = process.env.NODE_ENV === 'development'
  const connectionString = process.env.DB_URL || process.env.DATABASE_URL
  const preferLocal = process.env.DB_PREFER_LOCAL === 'true' || process.env.DB_PREFER_LOCAL === '1'
  const isLocal = isLocalDatabase()

  if (connectionString) {

    try {
      const poolConfig = {
        connectionString: connectionString,
        ssl: isLocal ? false : {
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
        if (!process.env.DB_CONNECT_TIMEOUT_MS) {
          poolConfig.connectionTimeoutMillis = isDev ? 20000 : 30000
        }
      }

      const pool = new Pool(poolConfig)

      await pool.query('SELECT 1')
      await pool.query('SET search_path TO public, travelers, discussion')

      pool.on('connect', async (client) => {
        try {
          await client.query('SET search_path TO public, travelers, discussion')
        } catch (err) {
        }
        debugLog('connection.js:198', 'Pool connect event', { timestamp: Date.now() }, 'A,B,C')
      })

      pool.on('error', (err) => {
        debugLog(
          'connection.js:205',
          'Pool error event',
          { code: err.code, message: err.message, errno: err.errno, syscall: err.syscall },
          'A,B,C',
        )
      })

      return pool
    } catch (error) {
    }
  }

  if (
    process.env.DB_HOST &&
    (process.env.DB_HOST.includes(':') || process.env.DB_HOST.includes('/'))
  ) {
  }

  const dbHost = process.env.DB_HOST

  const disablePreflight = process.env.DB_PREFLIGHT_DISABLED === '1'

  const isNeonPooler = typeof dbHost === 'string' && dbHost.includes('-pooler')

  if (typeof dbHost === 'string' && dbHost.includes(':')) {
    throw new Error(
      'DB_HOST 格式不支援（包含 ":"）。此專案已設定為僅使用 IPv4，請改用 IPv4 的 DB_HOST（例如 IPv4 位址或可解析出 A 記錄的主機名）。',
    )
  }

  if (!disablePreflight) {
    const dnsStartTime = Date.now()
    debugLog(
      'connection.js:92',
      'DNS resolution start',
      { host: dbHost, startTime: dnsStartTime },
      'C',
    )
    let resolvedIp = null
    try {
      const addrs4 = await dnsResolve4(dbHost)
      if (!addrs4?.length) throw new Error('查無 IPv4 A 記錄')
      resolvedIp = addrs4[0]
      debugLog(
        'connection.js:97',
        'DNS resolution success',
        { ip: resolvedIp, duration: Date.now() - dnsStartTime },
        'C',
      )
    } catch (e) {
      try {
        const lookedUp = await dnsLookup(dbHost, { family: 4 })
        resolvedIp = lookedUp.address
        debugLog(
          'connection.js:103',
          'DNS lookup fallback success',
          { ip: resolvedIp, duration: Date.now() - dnsStartTime },
          'C',
        )
      } catch (e2) {
        const msg = e?.message || e2?.message || '未知 DNS 錯誤'
        throw new Error(`僅 IPv4 模式下 DNS 解析失敗：${msg}（請確認 DB_HOST 有 IPv4 A 記錄）`)
      }
    }

    const dbPort = parseInt(process.env.DB_PORT) || 5432
    const tcpTestStartTime = Date.now()
    debugLog(
      'connection.js:110',
      'TCP connection test start',
      { ip: resolvedIp, port: dbPort },
      'F,H',
    )
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
      debugLog(
        'connection.js:173',
        'TCP connection test success',
        { duration: Date.now() - tcpTestStartTime },
        'F,H',
      )
    } catch (tcpError) {
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
    }
  }
  const poolConfig = {
    host: dbHost,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
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

  poolConfig.family = 4
  poolConfig.lookup = (hostname, options, callback) => {
    if (resolvedIp && hostname === dbHost) {
      return callback(null, resolvedIp, 4)
    }
    return dns.lookup(
      hostname,
      { ...(options || {}), family: 4, all: false },
      (err, address, family) => {
        if (err) {
          if (resolvedIp) {
            return callback(null, resolvedIp, 4)
          }
          return callback(err)
        }
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
      }
    }
  }

  const dbSslRaw = (process.env.DB_SSL ?? (isLocal ? 'false' : 'true')).toString().toLowerCase()
  const useSsl = dbSslRaw !== 'false' && dbSslRaw !== '0' && dbSslRaw !== 'no'

  if (isNeonPooler) {
    if (useSsl) {
      poolConfig.ssl = {
        rejectUnauthorized: false,
        servername: dbHost,
      }
      debugLog(
        'connection.js:151',
        'SSL config set for pooler',
        { servername: dbHost, rejectUnauthorized: false },
        'B',
      )
    }

    if (!process.env.DB_CONNECT_TIMEOUT_MS) {
      poolConfig.connectionTimeoutMillis = isDev ? 20000 : 120000
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
  const pool = new Pool(poolConfig)
  debugLog(
    'connection.js:193',
    'Pool object created',
    { duration: Date.now() - poolCreateStartTime },
    'D',
  )

  pool.on('connect', async (client) => {
    try {
      await client.query('SET search_path TO public, travelers, discussion')
    } catch (err) {
    }
    debugLog('connection.js:198', 'Pool connect event', { timestamp: Date.now() }, 'A,B,C')
  })

  pool.on('error', (err) => {
    debugLog(
      'connection.js:205',
      'Pool error event',
      { code: err.code, message: err.message, errno: err.errno, syscall: err.syscall },
      'A,B,C',
    )
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
        pool = await createPool()

        debugLog(
          'connection.js:243',
          'Pool created, query test skipped (already tested in createPool)',
          { duration: Date.now() - attemptStartTime },
          'A',
        )
        await pool.query('SET search_path TO public, travelers, discussion')

        debugLog(
          'connection.js:248',
          'Search_path set',
          { totalDuration: Date.now() - attemptStartTime },
          'A,B,C',
        )

        poolInstance = pool
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

        try {
          if (pool) await pool.end()
        } catch {
        }

        const retryable = shouldRetryConnectionError(error)
        if (!retryable || attempt === maxAttempts) {
          throw error
        }

        const delay = Math.min(15000, baseDelayMs * attempt)
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
