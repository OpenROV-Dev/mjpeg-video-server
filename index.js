#!/usr/bin/env node

//To eliminate hard coding paths for require, we are modifying the NODE_PATH to include
//out lib folder
var oldpath = '';
if (process.env['NODE_PATH']!==undefined){
  oldpath = process.env['NODE_PATH'];
}

//just in case already been set leave it alone
process.env['NODE_PATH']=__dirname+'/modules:'+oldpath;
require('module').Module._initPaths();

var program=require("commander");

var _device;
program
  .arguments('<device>')
  .usage('[options <device>]')
  .option('-r, --resolution <resolution>', 'Video resolution (default: 1920x1080)','1920x1080')
  .option('-f, --framerate <framerate>',' Video framerate (default: 30)',parseInt,30)
  .option('-p, --port <port>','Webserver http port (default:8090)',parseInt,8090)
  .option('-l, --location <location>' , 'Camera mounted location (default: forward)','forward')
  .option('-u, --url <url>','A URL relative to the the server that the camera feed can be access','/rov/forward-camera')
  .option('-m, --mock <mock>','Run a fake camera feed',false)
  .option('-z, --zeromq <zeromq>', 'Use ZeroMQ on <zeromq> as an output plugin', 'ipc:///tmp/mjpg-streamer.ipc')
  .action(function(device){
    _device = device;
   })
  .parse(process.argv);

var validator = require('validateOptions');

var options=program;
options.device = _device;
if (options.device == undefined){
  options.device = '/dev/video0';
}

      // var camera=require('camera.js');
      // camera.MJPGCameraFound(options.device,function(){
      //     monitor.start();
      // });


var subPath = '/home/roboto/devel/camera/mjpg-streamer/tmp/mjpg-streamer_install/usr/local';
var launch_options = [subPath +'/bin/mjpg_streamer',
    '-i',
    subPath+'/lib/input_uvc.so -r ' + options.resolution + ' -f ' + options.framerate + ' -d ' + options.device,
    '-o'];

if (options.zeromq) {
  launch_options.push( subPath+'/lib/output_zmq.so -o ' + options.zeromq);
}
else {
  launch_options.push( subPath+'/lib/output_http.so -p ' + options.port );
}

if (options.mock){
  launch_options[0]=require.resolve('mock-video-server.js');
}
var respawn = require('respawn')

const infinite=-1;
var monitor = respawn(launch_options,{
  name: 'mjpeg',
  maxRestarts: infinite,
  sleep: 1000,
});

console.error(launch_options);

var beacon_timer = null;
monitor.on('spawn',function(){
  var announcement = {service:'mjpeg-video',port:options.port,addresses:['127.0.0.1'],txtRecord:{resolution: options.resolution, framerate: options.framerate, videoMimeType: 'video/x-motion-jpeg', cameraLocation: options.location, relativeServiceUrl:options.url}};
  var jannouncement =  JSON.stringify(announcement);
  console.error(jannouncement);
  if (beacon_timer !== null){
    clearInterval(beacon_timer);
  }
  beacon_timer=setInterval(function(){
      console.error(jannouncement);
  },5000);
});

monitor.on('exit', function() {
  console.error('exit');
});

monitor.on('stop',function(){
  console.error("mjpg-streamer stop");
});

monitor.on('stderr',function(data){
  if (data===undefined) return;
  console.error(data.toString('utf-8'));
});

validator(program,function(err){
  if (options.mock){
    monitor.start();
    return;
  }
  if (err) {
     console.log("Options error: " + err + "\n" + options.device);
     process.exit(1);
  } else {
     var camera=require('camera.js');
     camera.MJPGCameraFound(options.device,function(){
       monitor.start();
     });
  }
});
