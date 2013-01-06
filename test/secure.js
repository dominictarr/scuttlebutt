require('tape')('secure', function (t) {
//don't run test in the browser, because don't have readFileSync
if(process.title === 'browser') return t.end()

var crypto = require('crypto')
var fs = require('fs')
var mac = require('macgyver')()

var PRIVATE = fs.readFileSync(__dirname + '/keys/test1')
var PUBLIC  = fs.readFileSync(__dirname + '/keys/test1.pem')

var PRIVATE2 = fs.readFileSync(__dirname + '/keys/test2')
var PUBLIC2  = fs.readFileSync(__dirname + '/keys/test2.pem')

var keys = {}

var ids = {}

function getKey(id) {
  return keys[id]
}

var security = require('../security')
var secure = security(keys, PRIVATE, PUBLIC)
var secure2 = security(keys, PRIVATE2, PUBLIC2)
var me_id
keys[me_id = secure.createId()] = PUBLIC

var sign = secure.sign = mac(secure.sign).atLeast(1)

var verify = secure.verify = mac(secure.verify).atLeast(1)

//check the verify and sing methods are correct.

var update = [['id', 'value'], Date.now(), me_id]
update.push(sign(update))
var isVerified = false
verify(update, function (err, verified) {
  t.strictEqual(verified, true)
  isVerified = true
})
t.ok(isVerified)

var Emitter = require('../events')

var e = new Emitter(secure)
ids.e = e.id
var d = new Emitter(security(keys, '', ''))

//emitting from f should be ignored. because the signature is no good.
var f = new Emitter(secure2)
ids.f = f.id

e.emit('hello', {world: true})

var es = e.createStream()

es.pipe(d.createStream()).pipe(es)

//this should be the signed update.
d.on('hello', mac(function (message) {
  console.log(message)
  t.deepEqual(message, {world: true})
//  assert.equal(id, ids.e)
  t.end()
}).once())

var fs = f.createStream()

fs.pipe(d.createStream()).pipe(fs)

//should be the next update
var n = 0
d.on('unverified_data', mac(function (update) {
  t.equal(update[2], ids.f)
  t.equal(update[0][1], 'ignore me')
  t.equal(update[0][0], 'hello')
}).once())

f.emit('hello', 'ignore me')
})
