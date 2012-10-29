var assert = require('assert')
var mac = require('macgyver')()
process.on('exit', mac.validate)

var Model = require('scuttlebutt/model')

var a = new Model()
var b = new Model()
var c = new Model()

var as = a.createStream()
var bs = b.createStream()
var cs = c.createStream()

as.on('header', mac(function (h) {
  assert.equal(h.id, b.id)
}).once())

var ix = 0
bs.on('header', mac(function (h) {
  assert.equal(h.id, ix === 0 ? a.id : c.id)
  ix ++
}).times(2))

cs.on('header', mac(function (h) {
  assert.equal(h.id, b.id)
}).once())

as.pipe(bs).pipe(as)
bs.pipe(cs).pipe(bs)
