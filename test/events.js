
var ReliableEventEmitter = require('../events')
var assert = require('assert')

var A = new ReliableEventEmitter()
var B = new ReliableEventEmitter()

function log (data) {
  console.log(this.id, data)

}

function old (data) {
  console.log('OLD', data,
    this.sources[data[2]])
}

var _a = [], _b = []

A.on('a', log)
A.on('a', function (data) { _a.push(data) })

B.on('a', log)
B.on('a', function (data) { _b.push(data) })

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
