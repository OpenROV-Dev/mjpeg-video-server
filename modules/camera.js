//TODO: Move platform specific commands to external script
const videoVerifyCommand = 'v4l2-ctl --list-formats-ext -d /dev/video0 | grep -q "Pixel Format: \'MJPG\'"';

var exec = require('child_process').exec;


module.exports = {
  MJPGCameraFound: function(callback) {
    var child = exec(videoVerifyCommand, function(err, stdout, stderr) {
      if (!err) {
        callback();
      }
    });
  }

}
