require('tape')('sync', function (t) {
//need a stream that ends after it has syncronized two scuttlebutts.

var EE = require('../events')
var assert = require('assert')
var es = require('event-stream')
var mac = require('macgyver')().autoValidate()

var a = new EE()
var b = new EE()
var synced = false
var as = a.createStream({end: true, wrapper: 'json', name: 'a'})
var bs = b.createStream({end: true, wrapper: 'json', name: 'b'})

as.on('sync', mac(function () {
  console.log('A SYNC!')
  synced = true
  t.deepEqual(a.history(), b.history())
 }).once())

bs.on('sync', mac(function () {
  console.log('B SYNC!')
  next(function () {
    t.deepEqual(a.history(), b.history())
  })
 }).once())

as.on('end', function () {
  console.log('A.END()')
})

bs.on('end', function () {
  console.log('B.END()')
})


a.emit('event', 1)
a.emit('event', 2)
a.emit('event', 3)

b.emit('event', 4)
b.emit('event', 5)
b.emit('event', 6)

t.equal(synced, false)

as.pipe(es.log('AB>')).pipe(bs).pipe(es.log('BA>')).pipe(as)

var next = process.nextTick

next(function () {

  console.log(a.history())
  console.log(b.history())

  t.deepEqual(a.history(), b.history())
  t.end()
})

})
