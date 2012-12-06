require('tape')('integrate 1', function (t) {

var gossip = require('../model')
var assert = require('assert')

var g1 = gossip()
var g2 = gossip()
var s1, s2
(s1 = g1.createStream())
  .pipe(s2 = g2.createStream()).pipe(s1)

s1.on('data', console.log.bind(console, "s1"))
s2.on('data', console.log.bind(console, "s2"))

//I like to have streams that work sync.
//if you can do that, you know it's tight.
s1.resume()
s2.resume()

//process.nextTick(function () {

var value = Math.random()

g1.set('key', value)

t.equal(g2.get('key'), g1.get('key'))
t.end()
})
