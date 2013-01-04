
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

