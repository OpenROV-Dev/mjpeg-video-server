var zmq				= require('zmq');
var EventEmitter    = require('events').EventEmitter;
var util            = require('util');

var Channel = function( camera, zmqUrl )
{
	EventEmitter.call(this);
	var self 			= this;
	
	var channelPostfix	= '-' + camera.name;
	var server			= camera.options.server;
	var socket			= camera.options.socket;
	
	var log       	= require('debug')( 'app:log:mjpeg:log:channel:' + channelPostfix );
    var error		= require('debug')( 'app:log:mjpeg:error:channel:' + channelPostfix  );
	var fpsLog 		= require('debug')( 'app:log:mjpeg:fps:channel:' + channelPostfix  );

	var videoStarted	= false;
	var beaconTimer 	= null;

	var videoEndpoint	= zmqUrl;

	this.settings		= {};
	

	// Create video socket
    var videoSocketPath = camera.options.wspath + channelPostfix;
	// var videoSocket		= new BinaryServer({server: server, origins: '*:*',path: videoSocketPath}); 
	var videoSocket		= require('socket.io')(server,{origins: '*:*',path: videoSocketPath});
	// var ss				= require('socket.io-stream');
	
	var clients = {};

	var dataFrameSub = zmq.socket( 'sub' );
	dataFrameSub.connect( videoEndpoint );
	dataFrameSub.subscribe("");
	
	var fpsCounter = 0
	
	setInterval(function() {
		fpsLog('FPS: ' + fpsCounter);
		fpsCounter = 0;
	}, 1000)

	var currentFrame = undefined;
	var getCurrentFrame = function() { return currentFrame; };

	videoSocket.on('connection', function(socket) {
		log('Video socket connected ' + socket);
	});

	// Register to video data
	dataFrameSub.on( 'message', function(data )
	{
		videoSocket.compress(false).volatile.emit( 'x-motion-jpeg.data', data );
		currentFrame = data;
		fpsCounter++;
	} );		

	// // Report the API to socket

	// Announce video source as json object on stderr
	var serviceUrl = ( process.env.DEV_MODE === "true" ? ':'+camera.options.port : "" )
	var announcement = 
	{ 
		service:	'mjpeg-video',
		port:		camera.options.port,
		addresses:	['127.0.0.1'],
		txtRecord:
		{
			resolution: 		camera.options.resolution, 
			framerate: 			camera.options.framerate,
			videoMimeType: 		'video/x-motion-jpeg',
			cameraLocation: 	camera.location,
			relativeServiceUrl: serviceUrl,  
			wspath: 			videoSocketPath
		}
	};

	//socket.on('connect', function())	
	socket.emit( "mjpeg-video.channel.announcement", camera.name, announcement );
	log( "Channel Announcement: " + JSON.stringify( announcement ) );	

	// Announce camera endpoint every 5 secs
	setInterval( function()
	{
		socket.emit( "mjpeg-video.channel.announcement", camera.name, announcement );
		log( "Channel Announcement: " + JSON.stringify( announcement ) );	
	}, 5000 );

};
util.inherits(Channel, EventEmitter);

module.exports = function( camera, zmqUrl ) 
{
  	return new Channel( camera, zmqUrl );
};