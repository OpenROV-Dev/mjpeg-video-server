module.exports = function(options,callback){
  var fs = require('fs');

  fs.exists(options.device, function (exists){
    if (!exists){
      callback(new Error('Device not found.'));
      return;
    }
    callback();
  });
}
