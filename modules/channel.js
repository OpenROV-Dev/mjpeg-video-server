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
	
	var log       	= require('debug')( 'channel:' + channelPostfix + ':log' );
    var error		= require('debug')( 'channel:' + channelPostfix + ':error' );
	var BinaryServer = require('binaryjs').BinaryServer;

	var videoStarted	= false;
	var beaconTimer 	= null;

	var videoEndpoint	= zmqUrl;

	this.settings		= {};
	

	// Create video socket
    var videoSocketPath = camera.options.wspath + channelPostfix;
	// var videoSocket		= new BinaryServer({server: server, origins: '*:*',path: videoSocketPath}); 
	var videoSocket		= require('socket.io')(server,{origins: '*:*',path: videoSocketPath});
	var ss				= require('socket.io-stream');
	
	var clients = {};

	var dataFrameSub = zmq.socket( 'sub' );
	dataFrameSub.connect( videoEndpoint );
	dataFrameSub.subscribe("");
	
	var fpsCounter = 0
	
	setInterval(function() {
		console.log('FPS: ' + fpsCounter);
		fpsCounter = 0;
	}, 1000)

	videoSocket.on('connection', function(socket) {
		console.log('Video socket connected ' + socket);
		socket.on('register', function(clientId, clb){
			if (clients[clientId] === undefined) {
				clients[clientId] = { sockets: [], streams: [], lastStream: undefined };
			}
			var ssSocket = ss(socket);
			var stream = ss.createStream();
			clients[clientId].sockets.push(ssSocket);
			clients[clientId].streams.push(stream);
			clients[clientId].lastStream = clients[clientId].streams.length -1;

			socket.on('disconnect', function() {
				delete clients[clientId];
			});

			clb();
			ssSocket.emit('x-motion-jpeg.data', stream, clientId);
		});
	});

	// Register to video data
	dataFrameSub.on( 'message', function(data )
	{
		fpsCounter++

		for (var clientId in clients) {
			var client = clients[clientId];

			var nextStreamIdx = client.lastStream;
			if (nextStreamIdx +1 >= client.streams.length) { nextStreamIdx = 0; }
			else { nextStreamIdx++; }
			var stream = client.streams[nextStreamIdx];
			if (stream) { 
				stream.write(data);
			}
		} 
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
			resolution: 		camera.options.resolution, //self.settings.width.value.toString() + "x" + self.settings.height.value.toString(),
			framerate: 			camera.options.framerate,//self.settings.framerate.value,
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
		console.log( "Channel Announcement: " + JSON.stringify( announcement ) );	
	}, 5000 );

};
util.inherits(Channel, EventEmitter);

module.exports = function( camera, zmqUrl ) 
{
  	return new Channel( camera, zmqUrl );
};