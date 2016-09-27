const fs            = require('fs');
const exec          = require('child_process').exec;
const respawn 	    = require('respawn');

var Q               = require( "q" );
var EventEmitter    = require('events').EventEmitter;
var util            = require('util');
var log            	= require('debug')( 'app:log:mjpeg' );
var error	    	= require('debug')( 'app:error:mjpeg' );
var zmq			    = require('zmq');

var readdir         = Q.denodeify( fs.readdir );
var readFile        = Q.denodeify( fs.readFile );

var Cameras = function(options) {
    var self = this;
    EventEmitter.call(this);
    
    self.availableCameras = {};
    self.registeredCameras = {};
    self.options = options;

    return self;
}

Cameras.prototype.GetCameras = function() {

    var deferred = Q.defer();
    var results=[];
    var i=0;

	if (this.options.mock){
		var result = {device:'/dev/video0',format:'MJPEG',deviceid:"mock0"}
		deferred.resolve([result]);
		return deferred.promise;
	}

    readdir('/dev')
        .then(function(files) {

            files
                .filter(function(file){
                    return file.indexOf('video') == 0;
                })
                .forEach(function(file){
                    i++;
                    exec('v4l2-ctl --list-formats -d /dev/' + file + ' | grep -q "MJPEG\\|Motion-JPEG"', 
                        function(error, stdout, stderr){
                            if (error == null) {
                                var result = { device: file, format:'MJPEG' }

                                exec('udevadm info --query=all --name=/dev/' + file + ' | grep "S: v4l/by-id/"', 
                                    function(error, stdout, stderr){
                                        i--;
                                        if (error == null) {
                                            result.deviceid = stdout.slice("S: v4l/by-id/".length);
                                        }
                                        results.push(result);
                                        if(i==0) {
                                            deferred.resolve(results)
                                        };
                                    });

                            } 
                            else {
                                i--;
                                if(i==0) {
                                    deferred.resolve(results)};
                                }
                        });                
                });


        }, function(err) {
            deferred.reject(err);
        });

    return deferred.promise;
}



Cameras.prototype.StartScanner = function() {
    var self = this;

    // Check for new cameras every x secs
    var UpdateCameras = function()
    {
        log( "Checking for new cameras" );

        self.GetCameras()
        .then( function(cameras) { return self.RemoveStaleCameras(cameras); } )
        .then( function(cameras) { return self.SetupCameras(cameras); } )
        //.then( function(cameras) { return self.StartDaemons(cameras); } )
        .then( function() { self.PostDeviceRegistrations(); } )

        .catch( function( err )
        {
            error( "Error updating cameras: " + err );
        } )
        .done( function()
        {
            setTimeout( UpdateCameras, 5000 );
        })
    };

    UpdateCameras();
}

Cameras.prototype.RemoveStaleCameras = function(cameras) {
	var self = this;
    var RemoveStale = function( index )
	{
		var camera = self.availableCameras[ index ];

		if( cameras[ index ] == undefined )
		{
			// Remove non-existent cameras
			log( "Removed non-existent camera: " + index );

			var deferred = Q.defer();

			if( camera.daemon )
			{
				// Stop the daemon and delete this camera
				camera.daemon.stop( function()
				{
					delete self.availableCameras[ index ];
					deferred.resolve();
				});

				return deferred.promise;
			}
			else
			{
				
				delete self.availableCameras[ index ];

				deferred.resolve();
				return deferred.promise;
			}
		}
	}

	// All settled
	var promises = Object.keys( self.availableCameras ).map( RemoveStale );

	return Q.allSettled( promises )
	.then( function()
	{
		return cameras;
	})
};

Cameras.prototype.SetupCameras = function(cameras) {
    var self = this;

	// Add new cameras to the available cameras list
	for( var camera in cameras )
	{
		if( self.availableCameras[ camera ] == undefined )
		{
			self.availableCameras[ camera ] 			= {};
			self.availableCameras[ camera ].camInfo	    = cameras[ camera ];
			self.availableCameras[ camera ].daemon 		= null;
			self.availableCameras[ camera ].daemonStarts = 0;

            self.availableCameras[ camera ].usbInfo = 
                    {
                        path: "/dev/" + cameras[ camera ].device,
                        name: cameras[ camera ].device,
						offset: cameras[ camera ].device.slice( "video".length )
                    };
		}
		else
		{
			// Update camera info
			self.availableCameras[ camera ].camInfo	    = cameras[ camera ];
		}
	}

	log( "Cameras: " );
	log( self.availableCameras );    

    return Q.fcall(function() { return cameras; });
}

Cameras.prototype.StartDaemon = function( device )
{
	var self = this;
	var camera;
	
	log('Attemping to start daemon for device ' + device);

	Object.keys(self.availableCameras).forEach(function(key) {
		var cam = self.availableCameras[key];
		if (cam.camInfo.device == device ) {
			log('found cam');
			if(!cam.videoStarted){
				self._StartDaemon(cam);
			}
			return;
		}
	})
}

Cameras.prototype._StartDaemon = function( cam )
{
	cam.videoStarted=true;
    var self = this;
    var exe = 'mjpg_streamer';
    var subPath = '/usr/local';

	if (cam.daemon) { return; } // already running

    var camera = cam.usbInfo;
    var log = require('debug')( 'app:log:mjpeg:' + camera.name );

	// Create all launch options
    var launch_options = [subPath +'/bin/' + exe,
        '-i', subPath+'/lib/input_uvc.so -r ' + self.options.resolution + ' -f ' + self.options.framerate + ' -d ' + camera.path,
        '-o', subPath+'/lib/output_zmq.so'];

	if (self.options.mock){
		launch_options[0]=require.resolve('mock-video-server.js');
	}	

	const infinite = -1;

	// Launch the video server with specified options. Attempt to restart every 1s.
	cam.daemon = respawn( launch_options,
	{
		name: exe +"[" + camera.name + "]",
		maxRestarts: infinite,
		sleep: 15000
	} );
	
	cam.daemon.on('crash',function()
	{
		log( exe +"[" + camera.name + "] crashed" );
	});
	
	cam.daemon.on('spawn',function(process)
	{
		log( exe +"[" + camera.name + "] spawned" );
	});
	
	cam.daemon.on('warn',function(error)
	{
		log( exe +"[" + camera.name + "] warning: " + error );
	});
	
	cam.daemon.on('exit',function(code, signal)
	{
		log( exe +"[" + camera.name + "] exited: code: " + code + " signal: " + signal);
		cam.videoStarted=false;
		// Remove from registered cameras
        if( self.registeredCameras[ camera ] !== undefined )
		{
			delete self.registeredCameras[ camera ];
		}
	});

	// Optional stdio logging
	cam.daemon.on('stdout',function(data)
	{
		var msg = data.toString('utf-8');
		log( exe +"[" + camera.name + "]: " + msg );
	});

	cam.daemon.on('stderr',function(data)
	{
		var msg = data.toString('utf-8');
		log( exe +"[" + camera.name + "] ERROR: " + msg );
	});

	log( "Starting " + exe +"[" + camera.name + "]..." );
	cam.daemon.start();
}

Cameras.prototype.ListenForCameraRegistrations = function() 
{
	var self = this;
	// Setup ZMQ camera registration REQ/REP 
	var regServer = zmq.socket( 'rep' );

	regServer.on( 'message', function( msg )
	{
		try
		{
			var registration = JSON.parse( msg );

			if( registration.type === "camera_registration" )
			{
				log( "Camera registration request: " + registration.name );
				
				// Create a channel object
				self.registeredCameras[ registration.name ] = require( "camera.js" )( registration, self.options );
				log( "Camera " + registration.name + " registered" );

				// Create a channel object
				self.registeredCameras[ registration.name ].emit( "channel_registration", registration.name, function()
				{					
					log( "Channel " + registration.name + " registered" );
				} );


				// Send registration success to daemon
				//TODO receive response: regServer.send( JSON.stringify( { "response": 1 } ) );
			}
		}
		catch( err )
		{
			error( "Error in registration: " + err );
			
			// Send registration failure to daemon
			regServer.send( JSON.stringify( { "response": 0 } ) );
		}
	} );
  	// Listen for camera and channel registrations over ZeroMQ
	regServer.bind( "ipc:///tmp/mjpg-streamer-register.ipc" );

};

Cameras.prototype.PostDeviceRegistrations = function() 
{
    var self = this;
	var update = [];

	var GetRegistrationInfo = function( index )
	{
		if( self.availableCameras[ index ].usbInfo )
		{
			var n = {
				device: self.availableCameras[ index ].usbInfo.offset,
				deviceid: self.availableCameras[ index ].usbInfo.name,
				format: 'MJPEG'
			};

			log( "new device: " + JSON.stringify( n ) );
			update.push(n);
		}
	}

	Object.keys( self.availableCameras ).map( GetRegistrationInfo );

	log( "Emitting video info" );
    return Q.fcall(function() { self.emit('video-deviceRegistration',update); });	
}

util.inherits(Cameras, EventEmitter);

module.exports = Cameras;