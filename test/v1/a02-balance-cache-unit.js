/*
  Unit tests for the balance-cache.js library.
*/

// Public npm libraries
const assert = require('chai').assert

// Local libraries
const { BalanceCache } = require('../../src/util/balance-cache')

// Mock of _balanceFromElectrumx()
const _balanceFromElectrumx = () => 1

describe('#balance-cache', () => {
  let uut

  beforeEach(() => {
    uut = new BalanceCache({ getBalanceFunc: _balanceFromElectrumx })
  })

  afterEach(() => {
    clearInterval(uut.gcTimerHandle)
  })

  describe('#put', () => {
    it('should throw an error if input is not a string', async () => {
      try {
        uut.put(1234, 1234)

        assert.fail('Unexpected code path')
      } catch (err) {
        assert.equal(err.message, 'addr must be a string')
      }
    })
  })

  describe('#get', () => {
    it('should retrieve the result from the cache', async () => {
      // Prepare test data
      uut.put('a', 10)

      const result = await uut.get('a')
      // console.log('result: ', result)

      assert.equal(result, 10)
    })

    it('should retrieve the result from Fulcrum', async () => {
      const result = await uut.get('a')
      // console.log('result: ', result)

      assert.equal(result, 1)
    })
  })

  describe('#garbageCollection', () => {
    it('should delete entries that are older than the threashold', () => {
      // Prepare test data
      uut.put('a', 1)
      uut.put('b', 2)
      uut.put('c', 3)
      uut.cache.b.timestamp = 1650244872204

      uut.garbageCollection()

      assert.equal(uut.cache.b, undefined)
      assert.equal(uut.cache.a.balance, 1)
      assert.equal(uut.cache.c.balance, 3)
    })
  })
})
