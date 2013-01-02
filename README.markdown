# scuttlebutt

A base-class for real-time replication.

[![travis](https://secure.travis-ci.org/dominictarr/scuttlebutt.png?branch=master)](https://travis-ci.org/dominictarr/scuttlebutt)

[![browser support](http://ci.testling.com/dominictarr/scuttlebutt.png)](http://ci.testling.com/dominictarr/scuttlebutt)

This seems like a silly name, but I assure you, this is real science. 
Read this: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf 

Or, if you're lazy: http://en.wikipedia.org/wiki/Scuttlebutt (laziness will get you nowhere, btw)

## Usage

Scuttlebutt is intended to be subclassed into a variety of data-models.

Two implementations are provided as examples [scuttlebutt/model](#scuttlebuttmodel) and
[scuttlebutt/events](#scuttlebuttevents)

subclasses:

  * [crdt](https://github.com/dominictarr/crdt) higher-level, with sets and sequences.
  * [r-array](https://github.com/dominictarr/r-array) Replicatable Array.
  * [r-edit](https://github.com/dominictarr/r-edit) Collaborative Text Editing.
  * [append-only](https://github.com/Raynos/append-only) news feed.
  * [scuttlebucket](https://github.com/dominictarr/scuttlebucket) combine multiple scuttlebutts into one.
  * [expiry-model](https://github.com/Raynos/expiry-model) memory capped model with expiring keys.

### Replication

Any Scuttlebutt subclass is replicated with createStream.

``` js
var s = new Scuttlebutt()
var z = new Scuttlebutt()
var zs = z.createStream()

zs.pipe(s.createStream()).pipe(zs)
```

Subclasses must implement at least `history` and `applyUpdate`.

### Persistence

Persist by saving to at least one writable stream.

``` js
var Model = require('scuttlebutt/model') //or some other subclass...
var fs = require('fs')
var m = new Model()

//stream FROM disk.
fs.createReadStream(file).pipe(m.createWriteStream())

//stream TO disk.
m.on('sync', function () {
  m.createReadStream().pipe(fs.createWriteStream(file))
})
```
Use `on('sync',...` to wait until the persisted state is in the file
before writing to disk.
(Make sure you rotate files, else there is an edge case where if the process
crashes before the history has been written some data will be lost
/*this is where link to module for that will go*/)

You may use [kv](https://github.com/dominictarr/kv) to get streams 
to local storage.

## API

### Scuttlebutt#history(sources)

`sources` is a hash of source_ids: timestamps. 
History must return an array of all known events from all sources
That occur after the given timestamps for each source.

The array MUST be in order by timestamp.

``` js
{ A: 0,
  B: 2,
  C: 3 }
```

### Scuttlebutt#applyUpdate (update)

Possibly apply a given update to the subclasses model.
Return 'true' if the update was applied. (See scuttlebutt/model.js
for an example of a subclass that does not apply every update.)

### Scuttlebutt#createStream (opts)

Create a duplex stream to replicate with a remote endpoint.

The stream returned here emits a special `'header'` event with the id of the
local and remote nodes and the vector clock. You can set metadata on the header
object using `opts.meta`.

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

### scuttlebutt/events

A reliable event emmitter. Multiple instances of an emitter
may be connected to each other and will remember events,
so that they may be resent after a disconnection or crash.

With this approach it is also possible to persist events to disk,
making them durable over crashes.

``` js
var Emitter = require('scuttlebutt/events')
var emitter = new Emitter()
```

#### emit (event, data)

Emit an event. Only one argument is permitted.

#### on (event, listener)

Add an event listener.

### scuttlebutt/model

A replicateable `Model` object.

``` js
var Model = require('scuttlebutt/model')
var model = new Model()
```


#### get (key)

Get a property.

#### set (key, value)

Set a property.

#### on('update', function (key, value, source))

Emmitted when a property changes. 
If `source !== this.id`
then it was a remote update.

## Protocol

Messages are sent in this format:

``` js
[change, timestamp, source]
```

`source` is the id of the node which originated this message.
Timestamp is the time when the message was created. 
This message is created using `Scuttlebutt#localUpdate(key, value)`.

When two `Scuttlebutts` are piped together, they both exchange their current list
of sources. This is an object of `{source_id: latest_timestamp_for_source_id}`
After receiving this message, `Scuttlebutt` sends any messages not yet 
known by the other end. This is the heart of Scuttlebutt Reconciliation.

## Security

Scuttlebutt has an (optional) heavy duty security model using public keys. 
This enables a high level of security even in peer-to-peer applications.
You can be sure that a given message is from the node that sent it, 
even if you did not receive the messasge from them directly.

## Enabling Security

``` js
var model = require('scuttlebutt/model')
var security = require('scuttlebutt/security')
var keys = {}
var m = new Model(security(keys, PRIVATE, PUBLIC))
```

## Security API

When security is enabled, each scuttlebutt message is signed with a private key.
It is then possible for any scuttlebutt instance to be confidant about the
authenticity of the message by verifying it against the source's public key.

This is possible even if the verifying node received the message from an intermediate node.

Security is activated by passing in a security object to the contructor of a scuttlebutt
subclass. 

Use the included implementation:

``` js
var security = require('scuttlebutt/security')(keys, PRIVATE, PUBLIC)
var Model = require('scuttlebutt/model')

var m = new Model(security)
```

See 
[scuttlebutt/security.js](https://github.com/dominictarr/scuttlebutt/blob/master/security.js)
for a simple example implementation.

`sign(update)` should sign the `update` with the instance's private key.
`verify(update, cb)` should verify the update, using public key associated with the
`source` field in the update. Verification may be asyncronous. `verify` must callback
`cb(err, boolean)` where boolean indicates whether or not the signature is valid.
Only callback in error in the most extreme circumstances. 
If there was no known key for the required source then that should be treated as a 
verification failure. If it is not possible to reach the key database (or whatever)
then the request should be retried until it is available. 

> Note: although the API supports asyncronous verification, 
> it's probably a good idea to load keys into memory so that messages can be verified
> and signed syncronously.

`createId()` returns a new id for the current node. This is used in the example security 
implementation to return a id that is a hash of the public key. This makes it impossible
for rogue nodes to attempt to associate a old node id with a new public key.

## Generating Keys.

Generate an ssh private key, and a PEM encoded public key.
```
ssh-keygen -f $KEYNAME -b $LENGTH -N $PASSWORD -q
ssh-keygen -e -f $KEYNAME.pub -m PEM > $KEYNAME.pem

```
`$LENGTH` must be `>= 786`, shorter is faster but less secure.
password may be empty `''`.

`$KEYNAME` is the private key, and `$KEYNAME.pem` is the public key
to use with Scuttlebutt.

