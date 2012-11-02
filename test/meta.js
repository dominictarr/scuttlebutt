var assert = require('assert')
var mac = require('macgyver')()
process.on('exit', mac.validate)

var Model = require('../model')

var a = new Model()
var b = new Model()
var c = new Model()

var as = a.createStream({ meta: 'A' })
var bs = b.createStream({ meta: 'B' })
var cs = c.createStream({ meta: 'C' })

as.on('header', mac(function (h) {
  assert.equal(h.id, b.id)
  assert.equal(h.meta, 'B')
}).once())

var ix = 0
bs.on('header', mac(function (h) {
  assert.equal(h.id, ix === 0 ? a.id : c.id)
  assert.equal(h.meta, ix === 0 ? 'A' : 'C')
  ix ++
}).times(2))

cs.on('header', mac(function (h) {
  assert.equal(h.id, b.id)
  assert.equal(h.meta, 'B')
}).once())

as.pipe(bs).pipe(as)
bs.pipe(cs).pipe(bs)
