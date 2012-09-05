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
  var key = data[0], ts = data[2], source = data[3]

  if(  !Array.isArray(data) 
    || data.length < 4 
    || 'string'    !== typeof key
    || 'string'    !== typeof source
    || 'number'    !== typeof ts
  ) 
    return false

  return true
}

inherits (Scuttlebutt, EventEmitter)

function Scuttlebutt (opts) {
  if(!(this instanceof Scuttlebutt)) return new Scuttlebutt(opts)
  var id = 'string' === typeof opts ? opts : opts && opts.id
  this.sources = {}
  this.id = id || u.createID()
  if(opts) {
    this._sign = opts.sign
    this._verify = opts.verify
  }
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

  var self = this
  function didVerification (err, verified) {

    // I'm not sure how what should happen if a async verification
    // errors. if it's an key not found - that is a verification fail,
    // not a error. if it's genunie error, really you should queue and 
    // try again? or replay the message later
    // -- this should be done my the security plugin though, not scuttlebutt.

    if(err)
      self.emit('error', err)

    if(!verified)
      return EventEmitter.prototype.emit.call(self, 'unverified_data', update)

    // check if this message is older than
    // the value we already have.
    // do nothing if so
    // emit an 'old-data' event because i'll want to track how many
    // unnecessary messages are sent.

    if(self.applyUpdate(update))
      emit.call(self, '_update', update)

  }

  if(source !== this.id) {
    if(this._verify)
      this._verify(update, didVerification)
    else
      didVerification(null, true)
  } else {
    if(this._sign) {
      //could make this async easily enough.
      update[4] = this._sign(update)
    }
    didVerification(null, true)
  }

  return true
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
