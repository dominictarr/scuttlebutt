//really simple data replication.

var EventEmitter = require('events').EventEmitter
var i = require('iterate')
var timestamp = require('./timestamp')
var duplex = require('duplex')


function createID () {
  return i.map(3, function (i) {
    return Math.random().toString(16).substring(2).toUpperCase()
  }).join('')
}

module.exports = Model

Model.createID = createID
Model.timestamp = timestamp

function Model (id) {
  var emitter = new EventEmitter()
  
  emitter.store = {}
  emitter.timestamps = {}
  emitter.sources = {}
  emitter.id = id = id || createID()
  emitter.set = function (k, v) {
    emitter._update(k, v, id, timestamp())
  }
  emitter.get = function (k) {
    if(emitter.store[k])
      return emitter.store[k][1]
  }
  emitter._update = function (key, value, source, ts) {
    var cur = emitter.timestamps[key]
    var latest = emitter.sources[source]
    var update = [].slice.call(arguments)
    console.log('UPDATE', emitter.id, update)
    //if this message is older for it's source,
    //ignore it. it's out of order.
    //each node must emit it's changes in order!
    if(latest && latest >= ts)
      return emitter.emit('old_data', update), false
 
    emitter.sources[source] = ts

    //check if this message is older than
    //the value we already have.
    //do nothing if so
    //emit an 'old-data' event because i'll want to track how many
    //unnecessary messages are sent.
    if(cur && cur > ts)
     return emitter.emit('old-data', [key, value, source, ts]), false

    emitter.store[key] = update
    //key, value, 
    emitter.emit('data', update)
    emitter.emit('update', key, value, source, ts)

    return true

    }

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

  emitter.createStream = function () {
    //the sources for the remote end.
    var sources = {}
    var d = duplex()
      .on('write', function (data) {
      //if it's an array, it's an update.
      //if it's an object, it's a scuttlebut digest.
        if(Array.isArray(data) && validate(data))
          return emitter._update.apply(emitter, data)
        if('object' === typeof data && data) {
          //when the digest is recieved from the other end,
          //send the histroy.
          //merge with the current list of sources.

          sources = data
          i.each(emitter.histroy(data), d.emitData.bind(d)) 

          this.emit('sync')
        } 
      }).on('ended', function () { d.emitEnd() })
      .on('close', function () {
        emitter.removeListener('update', onUpdate)
      })
   
    function onUpdate (key, value, source, ts) {
      if(sources[source] && sources[source] >= ts)
        return //the other end has already seen this message. 
      d.emit('data', [key, value, source, ts])
      //update source
      sources[source] = ts
    }
    d.emitData(emitter.sources)
    
    emitter.on('update', onUpdate)
    return d
  }

  emitter.filter = function (e, filter) {
    var source = e[2]
    var ts = e[3]
    return (!filter || !filter[source] || filter[source] < ts)   }

  emitter.histroy = function (filter) {
    var h = []
    i.each(emitter.store, function (e) {
      if(emitter.filter(e, filter))
        h.push(e)
    })
    return h
  }

  return emitter
}
