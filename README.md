# HbbPlayer

HbbPlayer is HbbTV application which can playback media by using url of media as parameter. It conforms to W3C and HbbTV specification.

<img src="https://github.com/Samsung/HbbPlayer/blob/master/screenshot1.jpg" alt="HbbPlayer" />


# How to use HbbPlayer

To play video using HbbPlayer application, run HbbTV with parameter like this:

`http://UTL_TO_HBBPLAYER/index.cehtml?url=URL_TO_VIDEO_FILE.mp4&type=PLAYER_TYPE`

To play DASH stream, 'url' will be 'URL_TO_DASH.mpd'.

Then player should parse URL and start playing the video.

'type' is a parameter of player type that shall be used.
>possible values : AVObject player, html5 (only for HbbTV profile 2.0)


# HbbPlayer debug UI
<img src="https://github.com/Samsung/HbbPlayer/blob/master/screenshot2.jpg" alt="HbbPlayer debug UI" />
