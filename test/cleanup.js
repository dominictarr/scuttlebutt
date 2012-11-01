
var Events = require('../events')
var assert = require('assert')
var e = new Events()

//test that _update listeners are cleaned up!

var l = 20
function cs () {
  console.log('cs', l, e.listeners('_update').length)
  var s = e.createStream()

  if(l--)
    process.nextTick(function () {
      s.end()
      cs()
      assert(e.listeners('_update').length <= 2)
    })
}

cs()
