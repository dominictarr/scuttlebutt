var tape = require('tape')

var gossip = require('../model')
var i = require('iterate')

var timestamp = require('monotonic-timestamp')

var createId = require('../util').createId

function test(name, test) {
  console.log('#', name)
  tape(name, function (t) {
    test(gossip(), t)
  })
}

test('updates appear in histroy', function (g, t) {
  var key = 'key'
  var value = Math.random()
  var source = 'source' //gossip.createID()
  var ts = timestamp()

  
  t.equal(g._update([[key, value], ts, source])
    , true
    , 'update returns true to indicate was not old')

  console.log(g.store)
  t.equal(g.get(key), value)

  t.deepEqual(g.history(), [[['key', value], ts, source]])
 
  var value2 = Math.random()
  //older timestamps are not appled.
  t.equal(g._update([[key, value2], ts - 1, source])
    , false
    , 'write returns false to indicate update did not apply')
  
  //the second update was older, so must not be in the history
  t.deepEqual(g.history(), [[['key', value], ts, source]])

  t.equal(g.get(key), value)

  t.end()
})

test('can filter histroy with {sources: timestamps}', function (g, t) {
  var A  = '#A'
  var B  = '#B'
  var C  = '#C'
  var ts = timestamp()

  g._update([['A', 'aaa'], ts, A])
  g._update([['B', 'bbb'], ts, B])
  g._update([['C', 'ccc'], ts, C])

  //filter should only return timestamps that are after
  //the given timestamps.
  var filter = {}
  filter[A] = ts
  filter[B] = ts
  filter[C] = ts

  t.deepEqual(
    g.history(filter)
    , [])

  filter[B] = ts - 1

   t.deepEqual(
    g.history(filter)
    , [[['B', 'bbb'], ts, B]])

  //if an item is not available, it
 
  filter[C] = null
   t.deepEqual(
    g.history(filter)
    , [ [['B', 'bbb'], ts, B]
      , [['C', 'ccc'], ts, C]])
  
  t.end()
})

