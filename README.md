To debug inline with the OpenROV cockpit

```
cd mjpeg-video-server
npm link 

cd orov-cockpit/src/plugins/mjpeg-video
npm link mjpeg-video-server
```