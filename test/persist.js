//need a stream that ends after it has syncronized two scuttlebutts.

var EE = require('../events')
var assert = require('assert')
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
    console.log('ARY', ary)
    es.from(ary).pipe(b.createWriteStream(/*{wrapper: 'raw'}*/))
  }))

b.on('_update', mac('_update').times(3))

a.on('message', mac(console.log).times(3))

var l = 3
while(l--) {
  a.emit('message', 'hello_' + new Date())
}

a.dispose() //end all streams



