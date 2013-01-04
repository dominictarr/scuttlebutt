var tape = require('tape')

var Model = require('../model')

tape('unstream', function (t) {

  var m = new Model()

  var s = m.createStream()

  m.on('unstream', function (n) {
    t.equal(n, 0)
    t.end()
  })

  s.end()

})


tape('unstream x2', function (t) {

  var m = new Model()

  var N = 2
  var s = m.createStream()
  var z = m.createStream()

  m.on('unstream', function (n) {
    t.equal(n, --N)
    if(!N) t.end()
  })

  s.end()
  z.end()
})

tape('unstream dispose', function (t) {

  var m = new Model()

  var N = 2
  var s = m.createStream()
  var z = m.createStream()

  m.on('unstream', function (n) {
    t.equal(n, --N)
    if(!N) t.end()
  })

  m.dispose()
})

