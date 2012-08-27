var Scuttlebutt = require('./index')
var inherits = require('util').inherits
var each = require('iterate').each

module.exports = Model

inherits(Model, Scuttlebutt)

function Model (id) {
  if(!(this instanceof Model)) return new Model(id)
  Scuttlebutt.call(this, id)

  var store = this.store = {}

  this.on('data', function (update) {
    store[update[0]] = update
  })
}

var m = Model.prototype

m.set = function (k, v) {
  return this.localUpdate(k, v)
}

m.get = function (k) {
  if(this.store[k])
    return this.store[k][1]
}

m.histroy = function (filter) {
  var self = this
  var h = []
  each(this.store, function (e) {
    if(self.filter(e, filter))
      h.push(e)
  })
  return h
}

