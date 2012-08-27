
var gossip = require('../model')
var i = require('iterate')
var assert = require('assert')
var timestamp = require('../timestamp')
var createID = require('../id')

function test(name, test) {
  console.log('#', name)
  test(gossip())
}

test('updates appear in histroy', function (g) {
  var key = 'key'
  var value = Math.random()
  var source = 'source' //gossip.createID()
  var ts = timestamp()

  
  assert.equal(g._update(key, value, source, ts)
    , true
    , '_update returns true to indicate update applied')

  assert.equal(g.get(key), value)

  assert.deepEqual(g.histroy(), [['key', value, source, ts]])
 
  var value2 = Math.random()
  //older timestamps are not appled.
  assert.equal(g._update(key, value2, source, ts - 1)
    , false
    , '_update returns false to indicate update did not apply')
  
  //the second update was older, so must not be in the histroy
  assert.deepEqual(g.histroy(), [['key', value, source, ts]])

  assert.equal(g.get(key), value)
})

test('can filter histroy with {sources: timestamps}', function (g) {
  var A  = createID()
  var B  = createID()
  var C  = createID()
  var ts = timestamp()

  g._update('A', 'aaa', A, ts)
  g._update('B', 'bbb', B, ts)
  g._update('C', 'ccc', C, ts)

  //filter should only return timestamps that are after
  //the given timestamps.
  var filter = {}
  filter[A] = ts
  filter[B] = ts
  filter[C] = ts

  assert.deepEqual(
    g.histroy(filter)
    , [])

  filter[B] = ts - 1

   assert.deepEqual(
    g.histroy(filter)
    , [['B', 'bbb', B, ts]]) 

  //if an item is not available, it 
 
  filter[C] = null
   assert.deepEqual(
    g.histroy(filter)
    , [ ['B', 'bbb', B, ts]
      , ['C', 'ccc', C, ts]]) 
  
})

