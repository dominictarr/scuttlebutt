var crypto = require('crypto')
var fs = require('fs')
var assert = require('assert')

var PRIVATE = fs.readFileSync(__dirname + '/keys/test.pem')
var PUBLIC  = fs.readFileSync(__dirname + '/keys/test-cert.pem')

var keys = {
  'me': PUBLIC
}
function getKey(id) {
  return keys[id]
}

function sign (update) {
  var data = JSON.stringify(update)
  return crypto.createSign('RSA-SHA256').update(data).sign(PRIVATE, 'base64')
}

function verify (update) {
  var _update = update.slice()
  var sig = _update.pop()
  var id  = update[3]
  var data = JSON.stringify(_update)
  console.log(_update, sig)
  var key = getKey(id)
  if(!key) return false
  return crypto.createVerify('RSA-SHA256').update(data).verify(key, sig, 'base64')
}

var update = ['id', 'value', Date.now(), 'me']

update.push(sign(update))
console.log(update)

var verified = verify(update)
console.log(verified)

assert.strictEqual(verified, true)

var Emitter = require('../events')

var e = new Emitter({sign: sign, verify: verify, id: 'me'})
var d = new Emitter({sign: null, verify: verify, id: 'me too'})

//emitting from f should be ignored. because the signature is no good.
var f = new Emitter({sign: Math.random, verify: verify, id: 'other guy'})

e.emit('hello', {world: true})

console.log(e)
console.log(e.history())

var es = e.createStream()

es.pipe(d.createStream()).pipe(es)

//this should be the signed update.
d.on('hello', console.log)

var fs = f.createStream()

fs.pipe(d.createStream()).pipe(fs)

//should be the next update
d.on('unverified_data', console.log)

f.emit('hello', 'ignore me')

e.on('hello', function () {
  console.log(e.history())
})

