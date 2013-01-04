require('tape')('model', function (t) {
var Model = require('../model')
var mac   = require('macgyver')().autoValidate()

var a = new Model()

var expected = {
  key: Math.random()
}

a.on('change', mac(function (key, value) {
  t.ok(expected[key] !== undefined)
  t.equal(value, expected[key])
  next()
}).atLeast(1))

a.on('change:key', mac(function (value) {
  t.equal(value, expected.key)
  next()
}).once())

a.set('key', expected.key)

  var n = 2
  function next () {
    if(--n) return
    t.end()
  }

})
