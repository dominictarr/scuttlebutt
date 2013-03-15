require('tape')('model', function (t) {
var Model = require('../model')
var mac   = require('macgyver')().autoValidate()

var a = new Model()

var expected = {
  key: Math.random()
}

t.deepEqual({}, a.toJSON())

a.once('change', mac(function (key, value) {
  t.ok(expected[key] !== undefined)
  t.equal(value, expected[key])
  t.deepEqual(a.toJSON(), expected)
  next()
}).atLeast(1))

a.once('change:key', mac(function (value) {
  t.equal(value, expected.key)
  next()
}).once())


  var n = 2
  function next () {
    if(--n) return

    a.set('key', null)
    t.equal(a.get('key'), null)
    t.deepEqual(a.toJSON(), {})

    t.end()
  }

a.set('key', expected.key)


})

