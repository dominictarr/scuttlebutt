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

Apply a given update to the subclasses model.
If the subclass decides not to apply the update,
then return false.

## Examples

``` js

var Model = require('scuttlebutt/model')

var a = new Model()
var b = new Model()

a.set(key, value)

b.on('update', console.log)

var s = a.createStream()
s.pipe(b.createStream()).pipe(s)
```

### scuttlebutt/Model

A replicateable `Model` object.

#### Model#get (key)

Get a property

#### Model#set (key, value)

Set a property

#### Model#on('update', key, value, source)

Emmitted when a property changes. 
If `source !== this.id`
then it was a remote update.

### scuttlebutt/ReliableEventEmitter

