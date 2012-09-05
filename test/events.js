
var ReliableEventEmitter = require('../events')
var assert = require('assert')
var mac = require('macgyver')()

process.on('exit', mac.validate)

function allow (update, cb) {
  return cb(null, true)
}

var insecure = {
  sign: Math.random, verify: allow
}

var A = new ReliableEventEmitter({ id: 'a', security: insecure })
var B = new ReliableEventEmitter({ id: 'b', security: insecure })

function log (data) {
  console.log('LOG', this.id, data)
}

function old (data) {
  console.log('OLD', data,
    this.sources[data[2]])
}

var _a = [], _b = []

A.on('a', log)
A.on('a', mac(function (data) { _a.push(data) }).times(6))

B.on('a', log)
B.on('a', mac(function (data) { _b.push(data) }).times(6))

A.emit('a', 'aardvark')
A.emit('a', 'antelope')
A.emit('a', 'anteater')

B.emit('a', 'armadillo')
B.emit('a', 'alligator')
B.emit('a', 'amobea')

var s
(s = A.createStream()).pipe(B.createStream()).pipe(s)

process.nextTick(function () {
  assert.deepEqual(_a.sort(), _b.sort())
  console.log(_a.sort())
})
