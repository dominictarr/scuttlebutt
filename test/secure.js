var crypto = require('crypto')
var fs = require('fs')
var assert = require('assert')
var mac = require('macgyver')()

//var PRIVATE = fs.readFileSync(__dirname + '/keys/test.pem')
//var PUBLIC  = fs.readFileSync(__dirname + '/keys/test-cert.pem')

var PRIVATE = fs.readFileSync(__dirname + '/keys/test_rsa')
var PUBLIC  = fs.readFileSync(__dirname + '/keys/test_rsa.pem')

var keys = {
  'me': PUBLIC
}
function getKey(id) {
  return keys[id]
}

var sign = mac(function sign (update) {
  var data = JSON.stringify(update)
  return crypto.createSign('RSA-SHA1').update(data).sign(PRIVATE, 'base64')
}).atLeast(1)

var verify = mac(function verify (update, cb) {
  var _update = update.slice()
  var sig = _update.pop()
  var id  = update[3]
  var data = JSON.stringify(_update)
  var key = getKey(id)
  if(!key) return false
  cb(null, crypto.createVerify('RSA-SHA1').update(data).verify(key, sig, 'base64'))
  
}).atLeast(1)


//check the verify and sing methods are correct.

var update = ['id', 'value', Date.now(), 'me']
update.push(sign(update))
var verified = verify(update)
assert.strictEqual(verified, true)

var Emitter = require('../events')

var e = new Emitter({sign: sign, verify: verify, id: 'me'})
var d = new Emitter({sign: null, verify: verify, id: 'me too'})

//emitting from f should be ignored. because the signature is no good.
var f = new Emitter({sign: Math.random, verify: verify, id: 'other guy'})

e.emit('hello', {world: true})

var es = e.createStream()

es.pipe(d.createStream()).pipe(es)

//this should be the signed update.
d.on('hello', console.log)

var fs = f.createStream()

fs.pipe(d.createStream()).pipe(fs)

//should be the next update
var n = 0
d.on('unverified_data', mac(function (update) {
  assert.equal(update[3], 'other guy')
  assert.equal(update[1], 'ignore me')
  assert.equal(update[0], 'hello')

}).once())

f.emit('hello', 'ignore me')

e.on('hello', mac(function (value) {
  assert.deepEqual(value, {world: true})
}).once())

