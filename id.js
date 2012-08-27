var map = require('iterate').map

module.exports = 
function createID () {
  return map(3, function (i) {
    return Math.random().toString(16).substring(2).toUpperCase()
  }).join('')
}

