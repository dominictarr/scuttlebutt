
var Model = require('../model')
var tape = require('tape')

tape('clone() -> another instance', function (t) {
  var a = new Model()
  var b = a.clone()
  t.equal(b.constructor, Model)
  t.end()
})

tape('clone() -> deepEqual history', function (t) {
  var a = new Model()
  a.set('foo', 'bar')
  var b = a.clone()

  t.deepEqual(b.history(), a.history())
  t.end()

})

tape('clone() -> updates apply to both instances', function (t) {
  var a = new Model()
  a.set('foo', 'bar')

  var b = a.clone()
  t.deepEqual(b.history(), a.history())

  b.set('quux', 'zaff')
  t.deepEqual(b.history(), a.history())

  t.end()
})


tape('clone() -> dispose triggers unclone event', function (t) {
  var a = new Model(), uncloned = false
  a.set('foo', 'bar')

  var b = a.clone()
  t.deepEqual(b.history(), a.history())

  t.equal(a._clones, 1)

  b.set('quux', 'zaff')
  t.deepEqual(b.history(), a.history())
  
  a.on('unclone', function (clones) {
    uncloned = true
    t.equal(clones, 0, 'should have zero clones')
  })

  b.dispose()

  t.equal(uncloned, true)
  t.equal(a._clones, 0)
  t.end()
})
