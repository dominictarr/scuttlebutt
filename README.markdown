# scuttlebutt

<img src=https://secure.travis-ci.org/dominictarr/scuttlebutt.png?branch=master>

A base class that makes implementing 
datastructures for real-time  replication easy.

This seems like a silly name, but I assure you, this is real science. 
read this: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf

or if you are lazy: http://en.wikipedia.org/wiki/Scuttlebutt (lazyness will get you nowhere, btw)


## Usage

Users may implement a subclass of thier own data model.
two implementations are provided [scuttlebutt/model](#scuttlebuttmodel) and
[scuttlebutt/events](#scuttlebuttevents)

also [crdt](https://github.com/dominictarr/crdt) for a subclass with a more
high-level data model.

### Replication

Any Scuttlebutt subclass is replicated with createStream.

``` js
var s = new Scuttlebutt()
var z = new Scuttlebutt()
var zs = z.createStream()

zs.pipe(s.createStream()).pipe(zs)
```

subclasses must implement at least `history` and `applyUpdate`

### Persistence

persist by saving to at least one writable stream.

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
use `on('sync',...` to wait until the persisted state is in the file
before writing to disk.
(make sure you rotate files, else there is a edge case where if the process
crashes before the histroy has been written then some data will be lost)

## API

### Scuttlebutt#histroy(sources)

`sources` is a hash of source_ids: timestamps. 
history must return an array of all known events from all sources
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

### scuttlebutt/events

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

### scuttlebutt/model

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

## Protocol

Messages are sent in this format:

``` js
[key, value, timestamp, source]
```

`source` is the id of the node which originated this message.
timestamp is the time when the message was created. 
this message is created using `Scuttlebutt#localUpdate(key, value)`

When two `Scuttlebutts` are piped together, they both exchange their current list
of sources. this is an object of `{source_id: latest_timestamp_for_source_id}`
after receiving this message, `Scuttlebutt` sends any messages not yet 
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
It is then possible for any Scuttlebutt instance to be confidant about the
authenticity of the message by verifying it against the source's public key.

This is possible even if the verifying node received the message from in intermediate node.

Security is activated by passing in a security object to the contructor of a Scuttlebutt
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
only callback in error in the most extreme circumstances. 
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

generate an ssh private key, and a PEM encoded public key.
```
ssh-keygen -f $KEYNAME -b $LENGTH -N $PASSWORD -q
ssh-keygen -e -f $KEYNAME.pub -m PEM > $KEYNAME.pem

```
`$LENGTH` must be `>= 786`, shorter is faster but less secure.
password may be empty `''`.

`$KEYNAME` is the private key, and `$KEYNAME.pem` is the public key
to use with Scuttlebutt.

