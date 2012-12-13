require('tape')('meta', function (t) {
var mac = require('macgyver')().autoValidate()

var Model = require('../model')

var a = new Model()
var b = new Model()
var c = new Model()

var as = a.createStream({ meta: 'A' })
var bs = b.createStream({ meta: 'B' })
var cs = c.createStream({ meta: 'C' })

as.on('header', mac(function (h) {
  t.equal(h.id, b.id)
  t.equal(h.meta, 'B')
}).once())

var ix = 0
bs.on('header', mac(function (h) {
  t.equal(h.id, ix === 0 ? a.id : c.id)
  t.equal(h.meta, ix === 0 ? 'A' : 'C')
  ix ++
}).times(2))

cs.on('header', mac(function (h) {
  t.equal(h.id, b.id)
  t.equal(h.meta, 'B')
  t.end()
}).once())

as.pipe(bs).pipe(as)
bs.pipe(cs).pipe(bs)

})
