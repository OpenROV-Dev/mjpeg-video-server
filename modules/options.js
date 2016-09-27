var Q = require( "q" );

module.exports = function() {

    var deferred = Q.defer()

    var program     = require("commander");
    var validator   = require('validateOptions');

    // Get command line arguments
    var _device;
    program
        .arguments('<device>')
        .usage('[options <device>]')
        .option('-r, --resolution <resolution>', 'Video resolution (default: 1280×720)','1280x720')
        .option('-f, --framerate <framerate>',' Video framerate (default: 30)',parseInt,15)
        .option('-p, --port <port>','Webserver http port (default:8090)',parseInt,8090)
        .option('-l, --location <location>' , 'Camera mounted location (default: forward)','forward')
        .option('-u, --url <url>','A URL relative to the the server that the camera feed can be access','/rov/forward-camera')
        .option('-m, --mock <mock>','Run a fake camera feed',false)
        .option('-e, --enumerate <enumerate>', 'Enumerate devices and print them on stdout', false)
        .action(function(device){
            _device = device;
        })
        .parse(process.argv);

    var options = program;
    options.device = _device;
    options.wspath = "/mjpeg-video"

    if (options.device == undefined){
        options.device = '/dev/video0';
    }

    options.mock = options.mock=='true'?true:options.mock;
        
    if(options.mock==true){
         deferred.resolve(options);
    }else {
        validator(program, function(err) {
        //todo rearrange 
            if (err) {
                deferred.reject("Error parsing arguments: " + err);
            } 
            else {
                deferred.resolve(options);
            }
        });
    }

    return deferred.promise;

};