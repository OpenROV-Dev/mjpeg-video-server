//TODO: Move platform specific commands to external script
const videoVerifyCommandTemplate = 'v4l2-ctl --list-formats-ext -d /dev/video0 | grep -q "Pixel Format: \'MJPG\'"';

var exec = require('child_process').exec;


module.exports = {
  MJPGCameraFound: function(device,callback) {
    videoVerifyCommand = videoVerifyCommandTemplate;
    if (device !== null){
      videoVerifyCommand=videoVerifyCommand.replace('/dev/video0',device);
    }
    var child = exec(videoVerifyCommand, function(err, stdout, stderr) {
      if (!err) {
        callback();
      }
    });
  }

}
