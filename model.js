var Scuttlebutt = require('./index')
var inherits = require('util').inherits
var each = require('iterate').each
var u = require('./util')

module.exports = Model

inherits(Model, Scuttlebutt)

function Model (opts) {
  if(!(this instanceof Model)) return new Model(opts)
  Scuttlebutt.call(this, opts)
  this.store = {}
}

var m = Model.prototype

m.set = function (k, v) {
  return this.localUpdate([k, v])
}

m.get = function (k) {
  if(this.store[k])
    return this.store[k][0][1]
}

//return this history since sources.
//sources is a hash of { ID: TIMESTAMP }

m.applyUpdate = function (update) {
  var key = update[0][0]
  //ignore if we already have a more recent value
  if('undefined' !== typeof this.store[key]
    && this.store[key][1] > update[1])
    return this.emit('_remove', update)

  if(this.store[key]) this.emit('_remove', this.store[key])

  this.store[key] = update
  this.emit.apply(this, ['update'].concat(update))
  this.emit('change', key, update[0][1])
  this.emit('change:'+key, update[0][1])

  return true
}

m.history = function (sources) {
  var self = this
  var h = []
  each(this.store, function (e) {
    if(u.filter(e, sources))
      h.push(e)
  })
  return h
}

m.toJSON = function () {
  var o = {}
  for (var k in this.store)
    o[k] = this.get(k)
  return o
}
