var zmq		        = require('zmq');
var EventEmitter    = require('events').EventEmitter;
var util            = require('util');


var Camera = function( registration, options )
{
    EventEmitter.call(this);
    
    var cameraName  = registration.name;
    var self        = this;
    var log       	= require('debug')( 'camera:' + cameraName + ':log' );
    var error		= require('debug')( 'camera:' + cameraName + ':error' );

    this.name     = registration.name;
    this.zmqUrl   = registration.url;
    
    var channels    = {};
    self.options    = options;
    
    // TODO: We need some way to map and remember which camera is which!
    this.location   = "forward";
    
    // Handle channel registrations
    this.on( "channel_registration", function( channelNum, callback )
	  {
        try
        {
            // Create a channel object
            channels[ channelNum ] = require( "channel.js" )( self, self.zmqUrl );
            
            // Call success callback
            callback();
        }
        catch( err )
        {
            throw "Channel registration failed: " + err;
        }
    } );
    
    // Connect to geomuxpp command socket
    // this.commandPub.connect( "ipc:///tmp/geomux_command" + cameraOffset + ".ipc" );
    
    // ----------------
	// Helper functions
    	
	function SendCommand( command, params )
	{
		// Send channel command over zeromq to geomuxpp
		self.commandPub.send( 
		[ 
			"cmd",
			JSON.stringify(
			{
				cmd: command,
				params: params
			} ) 	
		] );
	};
};
util.inherits(Camera, EventEmitter);

module.exports = function( registration, options ) 
{
    return new Camera( registration, options );
};