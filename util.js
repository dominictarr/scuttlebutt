var map = require('iterate').map

exports.createID = 
function createID () {
  return map(3, function (i) {
    return Math.random().toString(16).substring(2).toUpperCase()
  }).join('')
}

/*
this is just copied from crdt

this is NOT a wholly accurate representation of the time.
since js only measures time as ms, if you call Date.now()
twice quickly, it's possible to get two identical time stamps.

subsequent calls to timestamp() are ALWAYS strictly ordered.

which is the important part.

maybe call this something other than timestamp?

what about 'close-enough' since that's what it is.

also, it may be a very good idea to add something to syncronize
network time.

I'm guessing you ping your time stamps back in time, and make the minimal adjustment so that all messages are measured to 
arrive on one machine after the time they claim to make left the other machine.

will need to spin up a cluster to test this.
*/

exports.timestamp = timestamp

var _last = 0
var _count = 1
var LAST
function timestamp () {
  var t = Date.now()
  var _t = t
  if(_last == t) {
//    while(_last == _t)
    _t += ((_count++)/1000) 
  } 
  else _count = 1 

  _last = t

  if(_t === LAST)
    throw new Error('LAST:' + LAST + ',' + _t)
  LAST = _t
  return _t
}

exports.filter = function (update, sources) {
  var ts = update[2]
  var source = update[3]
  return (!sources || !sources[source] || sources[source] < ts)
}
