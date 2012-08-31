
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

  
  assert.equal(g._update([key, value, ts, source])
    , true
    , 'write returns true to indicate update applied')

  console.log(g.store)
  assert.equal(g.get(key), value)

  assert.deepEqual(g.history(), [['key', value, ts, source]])
 
  var value2 = Math.random()
  //older timestamps are not appled.
  assert.equal(g._update([key, value2, ts - 1, source])
    , false
    , 'write returns false to indicate update did not apply')
  
  //the second update was older, so must not be in the history
  assert.deepEqual(g.history(), [['key', value, ts, source]])

  assert.equal(g.get(key), value)
})

test('can filter histroy with {sources: timestamps}', function (g) {
  var A  = createID()
  var B  = createID()
  var C  = createID()
  var ts = timestamp()

  g._update(['A', 'aaa', ts, A])
  g._update(['B', 'bbb', ts, B])
  g._update(['C', 'ccc', ts, C])

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
    , [['B', 'bbb', ts, B]])

  //if an item is not available, it
 
  filter[C] = null
   assert.deepEqual(
    g.history(filter)
    , [ ['B', 'bbb', ts, B]
      , ['C', 'ccc', ts, C]])
  
})

