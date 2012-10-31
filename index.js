
//really simple data replication.

var EventEmitter = require('events').EventEmitter
var i = require('iterate')
var duplex = require('duplex')
var inherits = require('util').inherits
var serializer = require('stream-serializer')
var u = require('./util')
var ReadableStream = require('readable-stream')
var timestamp = require('monotonic-timestamp')

exports = 
module.exports = Scuttlebutt

exports.createID = u.createID
exports.updateIsRecent = u.filter
exports.filter = u.filter
exports.timestamp = timestamp

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

var emit = EventEmitter.prototype.emit

inherits (Scuttlebutt, EventEmitter)

function Scuttlebutt (opts) {

  if(!(this instanceof Scuttlebutt)) return new Scuttlebutt(opts)
  var id = 'string' === typeof opts ? opts : opts && opts.id
  this.sources = {}

  if(opts && opts.sign && opts.verify) {
    // id should be camelcased "Id" not "ID".
    // as it's a abbreviation, not an acronym.
    this.id      = opts.id || opts.createId()
    this._sign   = opts.sign
    this._verify = opts.verify
  } else {
    this.id = id || u.createId()
  }
}

var sb = Scuttlebutt.prototype

var emit = EventEmitter.prototype.emit

sb.applyUpdate = dutyOfSubclass
sb.history      = dutyOfSubclass

sb.localUpdate = function (key, value) {
  this._update([key, value, timestamp(), this.id])
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
      return emit.call(self, 'error', err)

    if(!verified)
      return emit.call(self, 'unverified_data', update)

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


//TODO remove legacy duplex usage
// emitData() -> _data()

sb.createStream = function (opts) {
  var self = this
  //the sources for the remote end.
  var sources = {}, other

  var syncSent = false, syncRecv = false

  var d = duplex()
  d.name = opts && opts.name
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
      //suppose we want to disconnect after we have synced?
      else if('object' === typeof data && data) {
        //when the digest is recieved from the other end,
        //send the history.
        //merge with the current list of sources.
        sources = data.clock
        i.each(self.history(sources), d.emitData.bind(d))

        outer.emit('header', data)
        d.emitData('SYNC')
        //when we have sent all history
        outer.emit('sync')
        syncSent = true
        //when we have recieved all histoyr
        //emit 'synced' when this stream has synced.
        if(syncRecv) outer.emit('synced')
      }
      else if('string' === typeof data && data == 'SYNC') {
        syncRecv = true
        if(syncSent) outer.emit('synced')
      }
    }).on('ended', function () {
      //d.emitEnd()
    })
    .on('close', function () {
      self.removeListener('data', onUpdate)
    })

  if(opts && opts.tail === false) {
    outer.on('sync', function () {
      process.nextTick(function () {
        d.emitEnd()
      })
    })
  }
  function onUpdate (update) { //key, value, source, ts
    if(!u.filter(update, sources))
      return

    //if I put this after source[source]= ... it breaks tests
    d.emitData(update)

    //really, this should happen before emitting.
    var ts = update[2]
    var source = update[3]
    sources[source] = ts
  }
  d.emitData({ id : self.id, clock : self.sources })
  
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

  var tail = opts.tail !== false //default to tailing

  var wrapper = ({
    json: function (e) { return JSON.stringify(e) + '\n' },
    raw: function (e) { return e }
  }) [opts.wrapper || 'json']

  var rs = new ReadableStream()
  rs.read = function () {
    var data = out.shift()

    if(!data && !tail) {
      return this.emit('end'), null
    }
    if(!data)
      return null
    
    return wrapper(data)
  }

  rs.end = function () {
    tail = false
    rs.emit('readable')    
    //rs.destroy()
  }

  function onUpdate (update) {
    out.push(update)
    rs.emit('readable')
  }

  if(tail) {
    this.on('_update', onUpdate)
  }
  var self = this
  rs.destroy = function () {
    rs.removeListener('_update', onUpdate)
    rs.emit('close')
    //should this emit end?
    //this is basically close,
    //does readable-stream actually support this?
    return this
  }

  this.once('dispose', function () {
    tail = false //close the stream soon.
    rs.end()
  })

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
    self._update(data)
    return true
  }
  ws.end = function () {
    this.writable = false
    self.sync = true
    //there are probably bugs in persisting when there are lots of streams.
    //TODO: figure out what they are! then fix them!
    emit.call(self, 'sync')
  }
  ws.destroy = function () {
    this.writable = false
    this.emit('close')
  }
  return serializer(opts.wrapper)(ws)
}

sb.dispose = function () {
  emit.call(this, 'dispose')
}
