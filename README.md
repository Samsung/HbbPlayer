# HbbPlayer

HbbPlayer is HbbTV application which can playback media by using url of media as parameter. It conforms to W3C and HbbTV specification.

# How to use HbbPlayer

To play video using HbbPlayer application, run HbbTV with parameter like this:

`http://UTL_TO_HBBPLAYER/index.cehtml?url=URL_TO_VIDEO_FILE.mp4`

To play DASH stream, url will be 'URL_TO_DASH.mpd'.

Then player should parse URL and start playing the video.
