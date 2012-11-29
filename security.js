var crypto = require('crypto')

//
//security is pluggable - or can be left out.
//
//there is a sign method, and a verify method (which may be async)
//hmm, after thinking through some possible attacks, 
//https://github.com/dominictarr/scuttlebutt/issues/6
//I've realized that it is necessary to let the security plugin set
//the ID. hmm, that means there will need to be an async initialization step...
//
//The security will either need to shell out to `ssh-keygen` or to read a key pair 
//from the file system. hmm, There should only be a single instance of security per 
//process (except when testing), so maybe init security, then pass it to a new scuttlebutt)
//there may be many scuttlebutt instances but they should use the same key pair.
//
//that is up to security - maybe init the security when the app starts - indeed,
//probably generate the key during installation, and then `readFileSync()`
//
//Yup, because we don't want to be regenerating that stuff live.
//
// we do need the security to be able to set the key though!

//exactly what init api the security plugin wants to use is it's own business.
//it doesn't have to pass keys in like this...

var algorithm = 'RSA-SHA1'
var format = 'base64'
var hashAlg = 'SHA1'

module.exports = function (keys, 
  //THIS IS SERIOUS BUSINESS!
  PRIVATE, PUBLIC
  //THEREFORE THE CAPS MUST BE LOCKED
  ) {
  return {
    sign: function (update) {
      var data = JSON.stringify(update)
      return crypto.createSign(algorithm).update(data).sign(PRIVATE, format)
    },
    verify: function (update, cb) {
      var _update = update.slice()
      var sig = _update.pop()
      var id  = update[2]
      var data = JSON.stringify(_update)
      var key = keys[id]
      if(!key) return cb(null, false)
      cb(null, crypto.createVerify(algorithm).update(data).verify(key, sig, format))
    },
    createId: function () {
      //hash of public key.
      return crypto.createHash(hashAlg).update(PUBLIC).digest(format)
    },
    publicKey: PUBLIC
  }
}

