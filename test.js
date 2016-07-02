#!/usr/bin/env node


const io      = require('socket.io-client');
const ss      = require('socket.io-stream');
var BinaryClient  = require('binaryjs').BinaryClient


var defaults =
{
  port: 8090,
  wspath: "/mjpeg-video"
};

var videoServer = io.connect( 'http://localhost:' + defaults.port, { path: defaults.wspath, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 10 } );

  videoServer.on( "video-deviceRegistration", function( update )
  {
    console.log( "Got device update" );
    console.log(update);
    // self.deps.globalEventLoop.emit('video-deviceRegistration',update);
  } );

var fpsCounter = 0;

setInterval(function() {
  console.log('FPS ' + fpsCounter);
  fpsCounter = 0;
}, 1000);

  var videoChannels;
  var clientId = Date.now();
  videoServer.on('mjpeg-video.channel.announcement', function(camera, data) {
    console.log('mjpeg-video.channel.announcement');    
    if (videoChannels == undefined) {
      videoChannels = [];
      for (var i = 0; i< 5; i++) {
        var channel = io.connect( 'http://localhost:' + data.port, { path: data.txtRecord.wspath, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 10 } );
        channel.on('connect', function(_socket) {
          var _socket = this;
          videoChannels[i] = _socket;
          _socket.emit('register', clientId, function() {
            var _ss = ss(_socket);
            _ss.on('x-motion-jpeg.data', function(stream, data) {
              console.log('got stream ');
              var _stream = stream;
              _stream.on('data', function(streamData) {
                fpsCounter++;
              })
            });
          })


        })

      }
    }
    // if (video2 == undefined) {
    //   video2 = io.connect( 'http://localhost:' + data.port, { path: data.txtRecord.wspath, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 10 } );
    //   ss(video2).on('x-motion-jpeg.data', function(stream, data) {
    //     console.log('got stream ');
    //     stream.on('data', function(streamData) {
    //       fpsCounter++;
    //     })
    //   });
    // }
    


    // BinaryJS
    // var video = new BinaryClient('http://localhost:' + data.port + data.txtRecord.wspath);  
    // video.on('open', function(stream) {
    //   video.on('stream', function(stream, meta) {
    //     console.log('STREAM');
    //     stream.on('data', function(data) {
    //       console.log('got frame, size: ' + data.length);
    //     })
    //   })
    // })
    
  })

  // Upon connecting to video server, set up listeners
  videoServer.on( "connect", function()
  { 
    console.log( "Successfully connected to geo-video-server" );
    
    // Tell geo-video-server to start the daemons
    videoServer.emit( "geomux.ready" );
  });
  
  // Disconnection
  videoServer.on( "disconnect", function()
  {
    console.log( "Disconnected from video server." );
  });
  
  // Error
  videoServer.on( "error", function( err )
  {
    console.log( "Video Server Connection Error: " + err );
  });
  
  // Reconnect attempt
  videoServer.on( "reconnect", function()
  {
    console.log( "Attempting to reconnect" );
  });