//really simple data replication.

var EventEmitter = require('events').EventEmitter
var i = require('iterate')
var duplex = require('duplex')
var inherits = require('util').inherits

var u = require('./util')
exports = 
module.exports = Scuttlebutt

exports.createID = u.createID
exports.timestamp = u.timestamp

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
  this.sources = {}
  this.id = id = id || u.createID()
}

var sb = Scuttlebutt.prototype

sb.localUpdate = function (key, value) {
  this._update([key, value, this.id, u.timestamp()])
  return this
}

//checks whether this update is valid.

sb._update = function (update) {
  var key = update[0]
  var value = update[1]
  var source = update[2]
  var ts = update[3]

  //if this message is old for it's source,
  //ignore it. it's out of order.
  //each node must emit it's changes in order!

  var latest = this.sources[source]
  if(latest && latest >= ts)
    return this.emit('old_data', update), false

  this.sources[source] = ts

  //check if this message is older than
  //the value we already have.
  //do nothing if so
  //emit an 'old-data' event because i'll want to track how many
  //unnecessary messages are sent.
  if(this._localUpdate(update)) {
    this.emit('data', update)
    this.emit('update', key, value, source, ts)
    return true
  }

  //key, value, timestamp, source
  return false
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
        return self._update(data)
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
 
  function onUpdate (update) { //key, value, source, ts) {
    if(!u.filter(update, sources))
      return

    //update source _for this stream_

    d.emit('data', update) //[key, value, source, ts])

    //really, this should happen before emitting.
    var source = update[2]
    var ts = update[3]
    sources[source] = ts
  }
  d.emitData(self.sources)
  
  self.on('data', onUpdate)
  return d
}


sb.histroy = function (filter) {
  var self = this
  var h = []
  i.each(this.store, function (e) {
    if(u.filter(e, filter))
      h.push(e)
  })
  return h
}

