var Scuttlebutt = require('./')
var inherits = require('util').inherits
var each = require('iterate').each
var u = require('./util')
var EventEmitter = require('events').EventEmitter

module.exports = ReliableEventEmitter

inherits(ReliableEventEmitter, Scuttlebutt)

function ReliableEventEmitter (opts) {
  if(!(this instanceof ReliableEventEmitter)) return new ReliableEventEmitter(opts)
  Scuttlebutt.call(this, opts)
}

var emit = EventEmitter.prototype.emit
var emitter = ReliableEventEmitter.prototype

emitter.emit = function (event) {
  if(event === '__proto__')
    throw new Error('__proto__ is illegal event name')
  var args = [].slice.call(arguments)
  if(event == 'newListener')
    return emit.apply(this, args)
  return this.localUpdate(args)
}

var on = EventEmitter.prototype.on

emitter.on = function (event, listener) {
  if(event === '__proto__')
    throw new Error('__proto__ is invalid event')
  return on.call(this, event, listener)
}

emitter.applyUpdate = function (update) {
  var key = update[0][0]
  this.events = this.events || {}
  this.events[key] = this.events[key] || []
  this.events[key].push(update)
  //emit the event.
  emit.apply(this, update[0])
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
  return u.sort(h)
}


