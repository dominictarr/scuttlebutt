var Scuttlebutt = require('./')
var inherits = require('util').inherits
var each = require('iterate').each
var u = require('./util')
var EventEmitter = require('events').EventEmitter

module.exports = ReliableEventEmitter

inherits(ReliableEventEmitter, Scuttlebutt)

function ReliableEventEmitter (id) {
  if(!(this instanceof ReliableEventEmitter)) return new ReliableEventEmitter(id)
  Scuttlebutt.call(this, id)
}

var emit = EventEmitter.prototype.emit
var emitter = ReliableEventEmitter.prototype

emitter.emit = function (event) {
  var args = [].slice.call(arguments)
  if(event == 'newListener')
    return emit.apply(this, args)
  return this.localUpdate.apply(this, args)
}

emitter.applyUpdate = function (update) {
  var key = update[0]
  this.events = this.events || {}
  this.events[key] = this.events[key] || []
  this.events[key].push(update)
  //emit the event.
  emit.apply(this, update)
  return true
}


emitter.history = function (filter) {
  var self = this
  var h = []
  this.events = this.events || {}
  each(this.events, function (es) {
    each(es, function (e) {
      if(u.filter(e, filter))
        h.push(e)
    })
  })
  return h.sort(function (a, b) {
    //sort my timestamps.
    // so will be A1 B1 A2 B2,
    // not A1 A2 B1 B2
    return a[2] - b[2]
  })
}


