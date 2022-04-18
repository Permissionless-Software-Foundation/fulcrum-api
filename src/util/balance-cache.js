/*
  This library creates an in-memory cache to reduce the load on ElectrumX from
  rapid, redundent requests for balances on the same address.

  The need for this library arose through observations of the usage logs of
  api.fullstack.cash. The vast majority of requests are to a the single POST
  /v5/electrumx/balance endpoint. This library is used to reduce load on
  Fulcrum by serving up the cached results if requests for the same address
  happen too fast.

  The cache is a simple key-value store, where the key is the address.
*/

// Global npm libraries
const axios = require('axios')

// Local libraries
// const config = require('../../config')

// Constants - Change these for your own installation.
const ONE_MINUTE = 60000 // one minute in milliseconds
// const MAX_CACHE_SIZE = 1000
// const GC_PERIOD = 30000 // Garbage Collection period

let _this

// This creates a cache-object, which represents an address balance.
class Entry {
  constructor (inObj) {
    const { addr, balance } = inObj

    const now = new Date()

    this.addr = addr
    this.balance = balance
    this.timestamp = now.getTime()
  }
}

class BalanceCache {
  constructor (localConfig = {}) {
    // Input validation
    this.getBalanceFunc = localConfig.getBalanceFunc
    if (!this.getBalanceFunc) {
      throw new Error('Must pass a getBalanceFunc')
    }

    // Encapsulate dependencies
    // this.config = config
    this.axios = axios

    // State
    this.cache = {}
    this.cacheCnt = 0
    // this.maxCacheSize = MAX_CACHE_SIZE

    // Start garbage collection timer.
    this.gcTimerHandle = setInterval(this.garbageCollection, ONE_MINUTE)

    _this = this
  }

  put (addr, balance) {
    if (typeof addr !== 'string') throw new Error('addr must be a string')

    const value = new Entry({ addr, balance })
    this.cache[addr] = value
    this.cacheCnt++

    return true
  }

  // Get the tx data from Electrumx if it's not already in the cache.
  async get (addr) {
    const entry = this.cache[addr]

    // If the data existed in the cache, this function is done.
    if (entry) {
      return entry.balance
    }

    // If balance is not in the cache, then retrieve it from Fulcrum.
    const balance = await this.getBalanceFunc(addr)
    // console.log('balance: ', balance)

    // Add the balance to the cache.
    this.put(addr, balance)

    return balance
  }

  // Periodically clear the cache of entries that have expired.
  garbageCollection () {
    try {
      let now = new Date()

      console.log(`Balance cache has ${_this.cacheCnt} entries. ${now.toLocaleString()}`)

      // If cacheCnt is zero, then exit.
      if (!_this.cacheCnt) return

      now = now.getTime()
      const oneMinuteAgo = now - ONE_MINUTE

      const entries = Object.entries(_this.cache)
      // console.log(`entries: ${JSON.stringify(entries, null, 2)}`)

      // Loop through each entry in the cache.
      for (let i = 0; i < entries.length; i++) {
        const thisAddr = entries[i][0]
        const thisEntry = entries[i][1]

        // If the timestamp is older than the timestamp threshold, delete
        // the entry from the cache.
        if (thisEntry.timestamp < oneMinuteAgo) {
          delete _this.cache[thisAddr]
          _this.cacheCnt--
        }
      }
    } catch (err) {
      console.error('Error in garbageCollection(): ', err)
      // Do not throw error. This is a top-level function.
    }
  }
}

module.exports = { BalanceCache, Entry }
