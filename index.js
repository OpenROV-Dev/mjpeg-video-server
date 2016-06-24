#!/usr/bin/env node

// To eliminate hard coding paths for require, we are modifying the NODE_PATH to include our lib folder
var oldpath = '';

if( process.env[ 'NODE_PATH' ] !== undefined )
{
    oldpath = process.env[ 'NODE_PATH' ];
}

// Append modules directory to path
process.env['NODE_PATH'] = __dirname + '/:' + __dirname + "/modules/:" + oldpath;
require('module').Module._initPaths();

const respawn 	= require('respawn');
var zmq			= require('zmq');
var log       	= require('debug')( 'app:log' );
var error		= require('debug')( 'app:error' );
var path		= require( 'path' );
var execP 		= require('child-process-promise').exec;
var Q 			= require( "q" );
var fs			= require( "fs" );
var util        = require('util');
var io          = require('socket.io-client');

var readdir     = Q.denodeify( fs.readdir );
var readFile    = Q.denodeify( fs.readFile );

var optionValidator = require('options.js');
var StartHttpServer  = require('http-server.js');
var StartSocketIO  = require('socket-io.js');

var Cameras = require('cameras.js');


// ----
optionValidator()
    .then(function(options) { 
        if (options.enumerate) {
            var cameras = new Cameras(options);
            return cameras.GetCameras()
                .then(function(camerars) {
                    console.log(JSON.stringify(camerars));
                    process.exit(0);
                })
        }
        return options;
    } )
    .then(StartHttpServer)
    .then(StartSocketIO)
    
    .then(function(options) {

        options.socket.on('connection', function(client) {
            // Listen for ready message from server plugin
            console.log( "New mjpeg-video-server connection!" );

            var cameras = new Cameras(options);
            cameras.ListenForCameraRegistrations();
            cameras.StartScanner();

            cameras.on('video-deviceRegistration', function(update) {
                options.socket.emit('video-deviceRegistration', update);
            });

        });


    })

    .catch(function(err) {
        error(err);
        process.exit(2);
    }); 
