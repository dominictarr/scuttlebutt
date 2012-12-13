require('tape')('header', function (t) {

var mac = require('macgyver')().autoValidate()

var Model = require('../model')

var a = new Model()
var b = new Model()
var c = new Model()

var as = a.createStream()
var bs = b.createStream()
var cs = c.createStream()

var n = 3

as.on('header', mac(function (h) {
  t.equal(h.id, b.id)
  end()
}).once())

var ix = 0
bs.on('header', mac(function (h) {
  t.equal(h.id, ix === 0 ? a.id : c.id)
  ix ++
  end()
}).times(2))

cs.on('header', mac(function (h) {
  t.equal(h.id, b.id)
  end()
}).once())

as.pipe(bs).pipe(as)
bs.pipe(cs).pipe(bs)

function end () {
  if(--n) return
  t.end()
}

})
