# scuttlebutt

<img src=https://secure.travis-ci.org/dominictarr/scuttlebutt.png?branch=master>

A base class that makes implementing 
datastructures for real-time  replication easy.

This seems like a silly name, but I assure you, this is real science. 
read this: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf

or if you are lazy: http://en.wikipedia.org/wiki/Scuttlebutt (lazyness will get you nowhere, btw)

## Usage

subclasses must implement at least `histroy` and `applyUpdate`

### Scuttlebutt#histroy(sources)

`sources` is a hash of source_ids: timestamps. 
histroy must return an array of all known events from all sources
That occur after the given timestamps for each source.

The array MUST be in order by timestamp.

``` js
{ A: 0,
  B: 2,
  C: 3 }
```

### Scuttlebutt#applyUpdate (update)

Possibly apply a given update to the subclasses model.
return true if the update was applied. (see scuttlebutt/model.js
for an example of a subclass that does not apply every update)

#### Examples

``` js

var Model = require('scuttlebutt/model')

var a = new Model()
var b = new Model()

a.set(key, value)

b.on('update', console.log)

var s = a.createStream()
s.pipe(b.createStream()).pipe(s)
```

### scuttlebutt subclasses

Any Scuttlebutt subclass is replicated with createStream.

``` js
var s = new Scuttlebutt()
var z = new Scuttlebutt()
var zs = z.createStream()

zs.pipe(s.createStream()).pipe(zs)
```

### scuttlebutt/ReliableEventEmitter

A Reliable event emmitter. Multiple instances of an emitter
may be connected to each other and will remember events,
so that they may be resent after a disconnection or crash.

With this approach it is also possible to persist events to disk,
making them durable over crashes.

``` js
var Emitter = require('scuttlebutt/events')
var emitter = new Emitter()
```

#### emit (event, data)

emit an event. only one argument is permitted.

#### on (event, listener)

add an event listener.

### scuttlebutt/Model

A replicateable `Model` object.

``` js
var Model = require('scuttlebutt/model')
var model = new Model()
```


#### get (key)

Get a property

#### set (key, value)

Set a property

#### on('update', function (key, value, source))

Emmitted when a property changes. 
If `source !== this.id`
then it was a remote update.


