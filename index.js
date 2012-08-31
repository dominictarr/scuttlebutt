//really simple data replication.

var EventEmitter = require('events').EventEmitter
var i = require('iterate')
var duplex = require('duplex')
var inherits = require('util').inherits
var serializer = require('stream-serializer')
var u = require('./util')
var ReadableStream = require('readable-stream')

exports = 
module.exports = Scuttlebutt

exports.createID = u.createID
exports.updateIsRecent = u.filter
exports.filter = u.filter
exports.timestamp = u.timestamp

function dutyOfSubclass() {
  throw new Error('method must be implemented by subclass')
}

function validate (data) {
  //must be an 4 element array
  //string, *, string, number
  //log a message and ignore if invalid.
  function error () {
    console.error('invalid update', data)
  }
  var key = data[0], ts = data[2], source = data[3]

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

var emit = EventEmitter.prototype.emit

sb.applyUpdate = dutyOfSubclass
sb.history      = dutyOfSubclass

sb.localUpdate = function (key, value) {
  this._update([key, value, u.timestamp(), this.id])
  return this
}

//checks whether this update is valid.

sb._update = function (update) {
  var ts = update[2]
  var source = update[3]

  //if this message is old for it's source,
  //ignore it. it's out of order.
  //each node must emit it's changes in order!
  
  var latest = this.sources[source]
  if(latest && latest >= ts)
    return emit.call(this, 'old_data', update), false

  this.sources[source] = ts

  //check if this message is older than
  //the value we already have.
  //do nothing if so
  //emit an 'old-data' event because i'll want to track how many
  //unnecessary messages are sent.
  if(this.applyUpdate(update)) {
    emit.call(this, '_update', update)
    return true
  }

  //key, value, timestamp, source
  return false
}

sb.createStream = function (opts) {
  var self = this
  //the sources for the remote end.
  var sources = {}, other
  var d = duplex()
  var outer = serializer(opts && opts.wrapper)(d)
  outer.inner = d
  d
    .on('write', function (data) {
    //if it's an array, it's an update.
    //if it's an object, it's a scuttlebut digest.
      if(Array.isArray(data)) {
        if(validate(data))
          return self._update(data)
      }
      else if('object' === typeof data && data) {
        //when the digest is recieved from the other end,
        //send the history.
        //merge with the current list of sources.
        sources = data
        i.each(self.history(sources), d.emitData.bind(d))
        outer.emit('sync')
      }
    }).on('ended', function () { d.emitEnd() })
    .on('close', function () {
      self.removeListener('data', onUpdate)
    })

  function onUpdate (update) { //key, value, source, ts) {
    if(!u.filter(update, sources))
      return

    //if I put this after source[source]= ... it breaks tests
    d.emitData(update)

    //really, this should happen before emitting.
    var ts = update[2]
    var source = update[3]
    sources[source] = ts
  }
  d.emitData(self.sources)
  self.on('_update', onUpdate)
  return outer
}

//createReadStream -- for persisting.

sb.createReadStream = function (opts) {
  opts = opts || {}

  //write this.id
  //then write the histroy.
  //then, if opts.tail
  //listen for updates, else emit 'end'

  var out = this.history()
  out.unshift(this.id)

  var wrapper = ({
    json: function (e) { return JSON.stringify(e) + '\n' },
    raw: function (e) { return e }
  }) [opts.wrapper || 'json']

  var rs = new ReadableStream()
  rs.read = function () {
    var data = out.shift()
    console.log('>>', data)
    if(!data && !opts.tail)
      return this.emit('end'), null
    
    return wrapper(data)
  }

  if(opts.tail) {
    this.on('_update', function (update) {
      out.push(update)
      rs.emit('readable')
    })
  }

  return rs
}

sb.createWriteStream = function (opts) {
  opts = opts || {}
  var Stream = require('stream')
  var ws = new Stream()
  var self = this, first = true
  ws.writable = true
  ws.write = function (data) {
    if(!this.writable) return
    if('string' === typeof data)
      return self.id = data, true
    first = false
    self.applyUpdate(data)
    return true
  }
  ws.end = function () {
    this.writable = false
    self.sync = true
    self.emit('sync')
  }
  ws.destroy = function () {
    this.writable = false
    this.emit('close')
  }

  return serializer(opts.wrapper)(ws)
}
