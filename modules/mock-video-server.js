#!/usr/bin/env node
const program=require('commander');
const zmq	= require('zmq');

//static char *registerUrl = "ipc:///tmp/mjpg-streamer-register.ipc";
//static char *cameraUrl = "ipc:///tmp/mjpg-streamer-%s.ipc";
const registerURL = "ipc:///tmp/mjpg-streamer-register.ipc";
const cameraURL="ipc:///tmp/mjpg-streamer-video0.ipc";

program
  .option('-i, --input <input>', 'Input Module')
  .option('-o, --output <output>', ' Out Module')
  .parse(process.argv);
console.dir(program);
var input = program.input.split(" ");
var output = program.output.split(" ");
var flags = input.concat(output);
var options = {};
flags.forEach(function(arg,index,array){

  switch (arg) {
    case '-r':
      options.resolution = array[index+1];
      break;
    case '-f':
      options.framerate = array[index+1];
      break;
    case '-p':
      options.port = array[index+1];
      break;
  }
  if (arg.indexOf('output_http.so')>0){
    options.http = true;
  }
  if (arg.indexOf('output_zmq.so')>0){
    options.zmq = true;
  }    
    
});

var http = require('http'),
  fs = require('fs'),
  path = require('path')
var response;
var mockImages = [];
var lastImageIndex = 0;
var formats = [
  'jpg',
  'jpeg'
];
var sessions = [];
var imagePath = path.join(__filename, '..', '..', 'mock-images');
var boundary = 'thereMayBeSharks';

function isImage(element, index, array) {
  var ext = element.split('.').pop().toLowerCase();
  return formats.indexOf(ext)>0;
}

function writeFrame(res, data) {
  // typeof data is Buffer
  res.write('Content-Type: image/jpeg\nContent-Length: ' + data.length + '\n\n');
  res.write(data);
  res.write('\n--' + boundary + '\n');
}
console.log('starting mjpg-streamer compatible video streamer on port: ' + options.port);

if (options.http){
  http.createServer(function(req, res) {
    if (req.url === '/?action=stream') {
      res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace;boundary="' + boundary + '"',
        'Connection': 'keep-alive',
        'Expires': 'Fri, 01 Jan 1991 00:00:00 GMT',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.write('--' + boundary + '\n');
      res.write('--' + boundary + '\n');
      // after this, start writing the video frames with writeFrame()
      sessions.push(function(data){
         writeFrame(res,data);
      });
    } else if (req.url === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });
      res.write('<html><body><img src=\'/?action=stream\'></body></html>');
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  }).listen(options.port, function() {
    capture();
  });
}

if (options.zmq){
  var zmqPub= zmq.socket( 'pub' );
  var regServer = zmq.socket('req')
  zmqPub.bind( cameraURL );
  regServer.connect(registerURL );
  
  regServer.bind( "ipc:///tmp/mjpg-streamer-register.ipc" );
  regServer.send(JSON.stringify({type:'camera_registration',name:'video0',url:'ipc:///tmp/mjpg-streamer-video0.ipc'}));

  sessions.push(function(data){
    zmqPub.send(data);    
  })
  capture();
 
}

function grab(sessions) {
  var nextImageIndex = lastImageIndex + 1;
  if (nextImageIndex >= mockImages.length) {
    nextImageIndex = 0;
  }
  var file = path.join(imagePath, mockImages[nextImageIndex]);
  fs.readFile(file, function(err, image) {
    if (err)
      return console.error('error reading file', file, err);
    sessions.forEach(function(writefn) {
        writefn(image);
    });
  });
  lastImageIndex = nextImageIndex;
}

var capturing=false;
function capture() {
  if (capturing){
    return;
  }
  capturing=true;
  var fullpath = imagePath;
  if (!fs.existsSync(fullpath)) {
    console.error('Could not find path: ' + fullpath);
    return;
  }
  mockImages = fs.readdirSync(fullpath);
  if (mockImages) {
    mockImages = mockImages.filter(isImage).sort();
  }
  if (mockImages.length === 0) {
    console.error('Cound\'t find any mock images in path: ' + imagePath);
    return;
  }
  // loop based on delay in milliseconds
  setInterval(function(){grab(sessions)}, 1000 / options.framerate);

};

Array.prototype.contains = function(obj) {
  var i = this.length;
  while (i--) {
    if (this[i] === obj) {
      return true;
    }
  }
  return false;
};
