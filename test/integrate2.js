require('tape')('integrate 2', function (t) {
var gossip = require('../model')

var g1 = gossip()
var g2 = gossip()
var g3 = gossip()

function sync(g, h) {
  var s = g.createStream({wrapper: 'raw'})
  var r = h.createStream({wrapper: 'raw'})
  g.on('old_data', function (d) {
    console.log('old_data', d, g.id, h.id)
  })
  g.on('update', function () {
    console.log(g.id, 'key', g.get('key'))
  })
  s.pipe(r).pipe(s)
  s.resume()
  r.resume()
}

sync(g1, g2)
sync(g2, g3)
sync(g3, g1)

var value = Math.random()

g1.set('key', value)

t.equal(g3.get('key'), g1.get('key'))
t.equal(g2.get('key'), g1.get('key'))

t.end()
})
