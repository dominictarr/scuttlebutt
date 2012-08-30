
var gossip = require('../model')
var i = require('iterate')
var assert = require('assert')
var timestamp = require('../util').timestamp
var createID = require('../util').createID

function test(name, test) {
  console.log('#', name)
  test(gossip())
}

test('updates appear in histroy', function (g) {
  var key = 'key'
  var value = Math.random()
  var source = 'source' //gossip.createID()
  var ts = timestamp()

  
  assert.equal(g.write([key, value, source, ts])
    , true
    , 'write returns true to indicate update applied')

  console.log(g.store)
  assert.equal(g.get(key), value)

  assert.deepEqual(g.history(), [['key', value, source, ts]])
 
  var value2 = Math.random()
  //older timestamps are not appled.
  assert.equal(g.write([key, value2, source, ts - 1])
    , false
    , 'write returns false to indicate update did not apply')
  
  //the second update was older, so must not be in the history
  assert.deepEqual(g.history(), [['key', value, source, ts]])

  assert.equal(g.get(key), value)
})

test('can filter histroy with {sources: timestamps}', function (g) {
  var A  = createID()
  var B  = createID()
  var C  = createID()
  var ts = timestamp()

  g.write(['A', 'aaa', A, ts])
  g.write(['B', 'bbb', B, ts])
  g.write(['C', 'ccc', C, ts])

  //filter should only return timestamps that are after
  //the given timestamps.
  var filter = {}
  filter[A] = ts
  filter[B] = ts
  filter[C] = ts

  assert.deepEqual(
    g.history(filter)
    , [])

  filter[B] = ts - 1

   assert.deepEqual(
    g.history(filter)
    , [['B', 'bbb', B, ts]])

  //if an item is not available, it
 
  filter[C] = null
   assert.deepEqual(
    g.history(filter)
    , [ ['B', 'bbb', B, ts]
      , ['C', 'ccc', C, ts]])
  
})

