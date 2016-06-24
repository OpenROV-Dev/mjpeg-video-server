#!/usr/bin/env node


const io      = require('socket.io-client');


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

  videoServer.on('mjpeg-video.channel.announcement', function(camera, data) {
    console.log('mjpeg-video.channel.announcement');    
    var video = io.connect( 'http://localhost:' + data.port, { path: data.txtRecord.wspath, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 10 } );
    video.on('x-motion-jpeg.data', function(data) {
      console.log('got frame, size: ' + data.length);
    });    
    
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