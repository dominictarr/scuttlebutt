exports.createId = 
function () {
  return [1,1,1].map(function () {
    return Math.random().toString(16).substring(2).toUpperCase()
  }).join('')
}

exports.filter = function (update, sources) {
  var ts = update[2]
  var source = update[3]
  return (!sources || !sources[source] || sources[source] < ts)
}
