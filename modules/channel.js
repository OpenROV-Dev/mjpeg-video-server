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
	var videoSocket		= new BinaryServer({server: server, origins: '*:*',path: videoSocketPath}); //require('socket.io')(server,{origins: '*:*',path: videoSocketPath});
	
	var clients = {};

	var dataFrameSub = zmq.socket( 'sub' );
	dataFrameSub.connect( videoEndpoint );
	dataFrameSub.subscribe("");
	
	videoSocket.on('connection', function(client){ 
		clients[client.id] = { client: client, stream: client.createStream()}
		console.log('Connected client');
		client.on('close', function() {
			delete clients[this.id];
		});
	});
	
	
         function Uint8ToString(u8a){
            var CHUNK_SZ = 0x8000;
            var c = [];
            for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
              c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
            }
            return c.join("");
          };

var tick =false;
	// Register to video data
	dataFrameSub.on( 'message', function(data )
	{
		log( "Packet received: " + data.length );
		
		// Forward packets over socket.io
		//videoSocket.compress(false).volatile.emit( 'x-motion-jpeg.data', {data: data, timestamp: Date.now()} );
		for(var clientId in clients) {
			var client = clients[clientId];

            // var u8 = new Uint8Array(data);
            // var b64encoded = u8.toString('base64') //btoa(Uint8ToString(u8));
			//var b64encoded = new Buffer(data).toString('base64');

			// client.stream.write( { data: b64encoded, timestamp: Date.now()});
			var test = data.toString('utf-8');
			client.stream.write( { data: test, timestamp: Date.now()});
		}
	} );		

	// // Report the API to socket
    // socket.emit( "mjpeg-video.channel.api", { camera: camera.name, wsPath: videoSocketPath } );

	// Announce video source as json object on stderr
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
			relativeServiceUrl: ':'+camera.options.port,//camera.options.url,  
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


	// // Set up api event listener
	// var apiSub = zmq.socket( 'sub' );
	// apiSub.connect( eventEndpoint );
	// apiSub.subscribe( "api" );
	
	// // Set up settings event listener
	// var settingsSub = zmq.socket( 'sub' );
	// settingsSub.connect( eventEndpoint );
	// settingsSub.subscribe( "settings" );
	
	// // Set up health event listener
	// var healthSub = zmq.socket( 'sub' );
	// healthSub.connect( eventEndpoint );
	// healthSub.subscribe( "health" );
	
	// // Set up status event listener
	// var statusSub = zmq.socket( 'sub' );
	// statusSub.connect( eventEndpoint );
	// statusSub.subscribe( "status" );
	
	// // Set up error event listener
	// var errorSub = zmq.socket( 'sub' );
	// errorSub.connect( eventEndpoint );
	// errorSub.subscribe( "error" );
	
	// // Set up video data subscribers
	// var initFrameSub = zmq.socket( 'sub' );
	// initFrameSub.connect( videoEndpoint );
	// initFrameSub.subscribe( "i" );
	

	
	// // -------------------
	// // Event listeners
    // // this.on( "command", function( command, params )
    // // {
	// // 	SendChannelCommand( command, params );
    // // } );
	
	// errorSub.on( 'message', function( topic, data )
    // {
	// 	error( "Channel error: " + data );
	// } );
	
	// statusSub.on( 'message', function( topic, data )
    // {
	// 	log( "Channel status: " + data );
	// } );
	
	// apiSub.on( 'message', function( topic, data )
    // {
	// 	var api = JSON.parse( data );
		
	// 	// Update our local api
	// 	self.api = api;
		
	// 	// TODO: Load stored settings for this camera, or load them from currently selected settings profile in cockpit
	// 	// Set some initial settings
	// 	ApplySettings(
	// 	{
	// 		"bitrate": 		{ "value": 2000000 },
	// 		"goplen": 		{ "value": 10 },
	// 		"pict_timing": 	{ "enabled": true },
	// 		"vui":			{ "enabled": true }
	// 	}
	// 	); 
		
	// 	// Now that we have the API, we can start the video
	// 	// TODO: Have socket tell us when to start
	// 	SendChannelCommand( "video_start" );
	// } );

	// settingsSub.on( 'message', function( topic, data )
    // {
	// 	var settings = JSON.parse( data );
			
	// 	// Update our local settings store
	// 	for(var setting in settings )
	// 	{
	// 		self.settings[ setting ] = settings[ setting ];
	// 	}
     
	//  	// Report the settings to socket
	// 	socket.emit( "geomux.channel.settings", camera.offset, channelNum, self.settings );
	// } );
	
	// healthSub.on( 'message', function( topic, data )
    // {
	// 	// Report health stats to socket
	// 	socket.emit( "geomux.channel.health", camera.offset, channelNum, JSON.parse( data ) );
	// } );
	

	
	// // Listen for the init frame
	// initFrameSub.on( 'message', function( topic, data )
    // {
	// 	self.initFrame = data;
		
	// 	log( "Channel status: Got init frame" );
		
	// 	// Handle connections
	// 	videoSocket.on('connect',function(client)
	// 	{
	// 		log( "Channel status: New video connection" );
			
	// 		client.on('request_Init_Segment', function(fn) 
	// 		{
	// 			fn( new Buffer( self.initFrame, 'binary' ) );
	// 		});
	// 	});


		
	// 	// Create interval timer
    //     if( beaconTimer !== null )
	// 	{
	// 		clearInterval( beaconTimer );
    //     }
		
	// 	// Announce camera endpoint every 5 secs
    //     setInterval( function()
	// 	{
	// 		log( "Channel Announcement: " + JSON.stringify( announcement ) );
	// 		socket.emit( "geomux.video.announcement", camera.offset, channelNum, announcement );
	// 	}, 5000 );
		
	// 	// Emit init frame as part of the h264 data stream to allow for re-init of existing clients in the browser
	// 	videoSocket.compress(false).volatile.emit( 'x-h264-video.data', data );
	// } );
	
	// ----------------
	// Intervals
	
	// // Ask geomuxpp for health reports every 5 secs
	// setInterval( function()
	// {
	// 	SendChannelCommand( "report_health" );
	// }, 5000 );
	
	// ----------------
	// Helper functions
	
	// function SendChannelCommand( command, params )
	// {
	// 	if( params === undefined )
	// 	{
	// 		params = "";
	// 	}
		
	// 	// Send channel command over zeromq to geomuxpp
	// 	camera.commandPub.send( 
	// 	[ 
	// 		"cmd",
	// 		JSON.stringify(
	// 		{
	// 			cmd: 	"chCmd",
	// 			ch: 	channelNum,
	// 			chCmd: 	command,
	// 			params: params
	// 		} )
	// 	] );
	// };
	
	function ApplySettings( settings )
	{
		if( settings === undefined )
		{
			return;
		}
		
		// Apply settings to channel
		SendChannelCommand( "apply_settings", { "settings": settings } );
	};
};
util.inherits(Channel, EventEmitter);

module.exports = function( camera, zmqUrl ) 
{
  	return new Channel( camera, zmqUrl );
};