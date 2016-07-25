var Q = require( "q" );

module.exports = function(options) {

    return Q.fcall(function() {
        // Create Socket.IO server for interactions with server plugin
        options.socket = require( 'socket.io' )( options.server,{ origins: '*:*', path: options.wspath } );
        return options;
    });

};