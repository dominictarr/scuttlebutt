//really simple data replication.

var EventEmitter = require('events').EventEmitter
var i = require('iterate')
var timestamp = require('./timestamp')
var duplex = require('duplex')
var inherits = require('util').inherits

var createID = require('./id')

exports = 
module.exports = Scuttlebutt

exports.createID = createID
exports.timestamp = timestamp

function validate (data) {
  //must be an 4 element array
  //string, *, string, number
  //log a message and ignore if invalid.
  function error () {
    console.error('invalid update', data)
  }
  var key = data[0], source = data[2], ts = data[3]

  /*console.log(!Array.isArray(data) 
    , data.length !== 4 
    , 'string'    !== typeof key
    , 'string'    !== typeof source
    , 'number'    !== typeof ts
  )*/

  if(  !Array.isArray(data) 
    || data.length !== 4 
    || 'string'    !== typeof key
    || 'string'    !== typeof source
    || 'number'    !== typeof ts
  ) 
    return error(), false
  return true
}

inherits (Scuttlebutt, EventEmitter)

function Scuttlebutt (id) {
  if(!(this instanceof Scuttlebutt)) return new Scuttlebutt(id)
  var emitter = this
  
  emitter.timestamps = {}
  emitter.sources = {}
  emitter.id = id = id || createID()
}

var sb = Scuttlebutt.prototype


sb.localUpdate = function (key, value) {
  this._update(key, value, this.id, timestamp())
  return this
}

//checks whether this update is valid.

sb._update = function (key, value, source, ts) {
  var emitter = this
  var cur = this.timestamps[key]
  var latest = this.sources[source]
  var update = [].slice.call(arguments)

  //if this message is older for it's source,
  //ignore it. it's out of order.
  //each node must emit it's changes in order!

  if(latest && latest >= ts)
    return this.emit('old_data', update), false

  this.sources[source] = ts

  //check if this message is older than
  //the value we already have.
  //do nothing if so
  //emit an 'old-data' event because i'll want to track how many
  //unnecessary messages are sent.
  if(cur && cur > ts)
   return this.emit('old-data', [key, value, source, ts]), false

  //move this out?
  //this.store[key] = update

  //key, value, timestamp, source
  this.emit('data', update)
  this.emit('update', key, value, source, ts)
  return true
}

sb.createStream = function () {
  var self = this
  //the sources for the remote end.
  var sources = {}
  var d = duplex()
    .on('write', function (data) {
    //if it's an array, it's an update.
    //if it's an object, it's a scuttlebut digest.
      if(Array.isArray(data) && validate(data))
        return self._update.apply(self, data)
      if('object' === typeof data && data) {
        //when the digest is recieved from the other end,
        //send the histroy.
        //merge with the current list of sources.
        sources = data
        i.each(self.histroy(sources), d.emitData.bind(d)) 
        this.emit('sync')
      } 
    }).on('ended', function () { d.emitEnd() })
    .on('close', function () {
      self.removeListener('update', onUpdate)
    })
 
  function onUpdate (key, value, source, ts) {
    if(sources[source] && sources[source] >= ts)
      return //the other end has already seen this message. 
    d.emit('data', [key, value, source, ts])
    //update source
    sources[source] = ts
  }
  d.emitData(self.sources)
  
  self.on('update', onUpdate)
  return d
}

sb.filter = function (e, filter) {
  var source = e[2]
  var ts = e[3]
  return (!filter || !filter[source] || filter[source] < ts)
}

sb.histroy = function (filter) {
  var self = this
  var h = []
  i.each(this.store, function (e) {
    if(self.filter(e, filter))
      h.push(e)
  })
  return h
}
