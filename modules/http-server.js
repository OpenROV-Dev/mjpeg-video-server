var Q = require( "q" );
var app = require('express')();


module.exports = function(options) {

    var deferred = Q.defer()

    // Create HTTP server
    var server = require('http').createServer();
    server.listen( options.port, function () 
    {
        console.log( 'mjpeg-video-server listening on ' + options.port );
        options.server = server;
        deferred.resolve(options);
    });

    return deferred.promise;

};