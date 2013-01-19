require('tape')('persist', function (t) {
//need a stream that ends after it has syncronized two scuttlebutts.

var EE = require('../events')
var es = require('event-stream')
var mac = require('macgyver')()

mac.autoValidate()

var a = new EE()
var b = new EE()

var ary = []

a.createReadStream(/*{wrapper: 'raw'}*/)
  .pipe(es.log('>>'))
  .on('end', mac('end').once())
  .pipe(es.writeArray(function (_, ary) {
    es.from(ary).pipe(b.createWriteStream(/*{wrapper: 'raw'}*/))
    .on('close', mac(function () {
      t.deepEqual(a.history(), b.history())
      t.end()

      console.log('ARY', b.history())
    }).once())
  }))

b.on('_update', mac('_update').times(3))

a.on('message', mac(function (m) { console.log(m) }).times(3))

var l = 3
while(l--) {
  a.emit('message', 'hello_' + new Date())
}

a.dispose() //end all streams

})
