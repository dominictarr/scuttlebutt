var test = require('tape')
var Model = require('../model')

test('keys', function (t) {

  var m = Model()

  m.set('a', 1)
  m.set('o', 2)
  m.set('e', 3)
  m.set('u', 4)
  m.set('i', 5)

  t.deepEqual(m.keys(), 'aoeui'.split(''))
  var s = 0

  m.each(function (v) {
    console.log(v)
      s = s + v
  })

  t.equal(s, 1+2+3+4+5)

  t.end()

})
