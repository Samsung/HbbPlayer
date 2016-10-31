/**-------------------------------------------------------------------------------- 
 *
 * Copyright (c) 2016, Samsung Electronics Co., Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 --------------------------------------------------------------------------------*/

controls = {
	/**
	 * config options for player controls customization
	 */
	config: {
		/**
		 * after this time controls will hide automatically, in milliseconds
		 */
		visibilityTime: 5000,
		language: {
			/**
			 * default language values
			 * if some language has own translations it will be overwritten with language specific word
			 */
			defaultLang: {
				errormessage: "Error encountered during content playback. Press OK to return",
				ok: "OK"
			},
			en: {},
			us: {}
		},
		/**
		 * time for progressBar refresh, in milliseconds
		 */
		progressBarRefreshTime: 500,
		/**
		 * custom speed values for e.g. fastForward x2, x4, x8
		 * speeds are used toggled while pressing e.g. fastForward button
		 */
		speed: {
			rewind: [-1, -2, -4],
			slowRewind: [-0.25, -0.5, -0.75],
			slowPlay: [0.25, 0.5, 0.75],
			fastForward: [2, 4, 8]
		},
		/**
		 * current used UI language
		 */
		uiLanguage: 'en'
	},
	/**
	 * method returns translated text with use of language declared in controls.config.uiLanguage or with default language
	 * @param word
	 * @returns {*}
	 */
	getLang: function (word) {
		return controls.config.language[controls.config.uiLanguage][word.toLowerCase()] || controls.config.language.defaultLang[word.toLowerCase()] || word;
	},
	/**
	 * player controls DOM
	 */
	DOM: null,
	/**
	 * player controls DOM children
	 */
	DOMElement: {},
	/**
	 * keySet used to control player and player controls
	 */
	keySet: null,
	/**
	 * timer for auto hiding controls panel
	 */
	autoHideTimer: null,
	/**
	 * flag, informs is it player first run
	 */
	isPlayerStarted: false,
	/**
	 * flag, informs about visibility of player controls
	 */
	isHidden: false,
	/**
	 * reference to currently focused DOM element
	 */
	focusedDOMElement: null,
	/**
	 * incrementing HTML index added to focusable DOM elements
	 */
	tabIndex: 0,
	/**
	 * unified API for accessing player methods
	 */
	player: {
		/**
		 * declared playback speed - this variable is used to store playback speed that shall be valid after user trigger some method related to play speed
		 * if playback speed is equal to 1, and user will make pause (speed = 0) and immediately check controls.player.getSpeed() he can still receive "1" as play speed, because
		 * player need some time to make pause and set this speed value to "0"
		 */
		playSpeed: null,
		getSpeed: function () {},	//	get player playback speed
		getState: function () {},	//	get player state
		getPosition: function () {},	// get player position in "seconds"
		getDuration: function () {},	// get duration of played content in "seconds"
		object: null,
        pause: function () {},
		play: function () {},
		seek: function () {},
		state: null,
		stop: function () {}
	},
	/**
	 * unifying AVObject and HTML5 video API to controls.player object
	 * @param object
	 * @param objectType
	 */
	unifyVideoObjectsAPI: function (object, objectType) {
		if (objectType === "video") {
			this.player = {
				object: object,
				type: "video",
				getDuration: function () {
					return controls.player.object.duration * 1000;
				},
				getPosition: function () {
					return controls.player.object.currentTime * 1000;
				},
				getSpeed: function () {
					return controls.player.object.playbackRate;
				},
				getState: function () {
					return controls.player.state;
				},
				pause: function () {
					controls.player.object.pause();
				},
				play: function (playSpeed) {
					if (typeof playSpeed == "undefined") {
						playSpeed = 1;
					}
					controls.player.object.playbackRate = playSpeed;
					if (playSpeed !== 0) {
						controls.player.object.play();
					}
				},
				seek: function (position) {
					controls.player.object.currentTime = Math.round(position / 1000);
				},
				stop: controls.callback.onStop
			};
			controls.player.object.addEventListener('ended', controls.callback.onFinished);
			controls.player.object.addEventListener('error', controls.callback.onError);
			controls.player.object.addEventListener('pause', controls.callback.onPause);
			controls.player.object.addEventListener('playing', controls.callback.onPlay);
			controls.player.object.addEventListener('waiting', controls.callback.onLoading);
		} else {
			this.player = {
				object: object,
				type: "avobject",
				getDuration: function () {
					return controls.player.object.playTime;
				},
				getPosition: function () {
					return controls.player.object.playPosition;
				},
				getSpeed: function () {
					return controls.player.object.speed;
				},
				getState: function () {
					return controls.player.object.playState;
				},
                pause: function () {
					controls.player.object.play(0);
				},
				play: function (playSpeed) {
					controls.player.object.play(playSpeed);
				},
				seek: function (position) {
					controls.player.object.seek(position);
				},
				stop: function () {
					controls.player.object.stop();
				}
			};
			controls.player.object.addEventListener("PlayStateChange", controls.AVObjectPlayStateChangeEventHandler);
		}
	},
	/**
	 * initialization of video player controls
	 */
	initialize: function () {
		controls.getPlayerObject();

		if (window.innerWidth === 1280) {
			controls.css.addFile("720p");
		} else {
			controls.css.addFile("1080p");
		}

		controls.createLayout();

		controls.remoteController.activate();
	},
	/**
	 * create video player controls layout
	 */
	createLayout: function () {
		var documentFragment;

		documentFragment = document.createDocumentFragment();
		controls.DOM = controls.createDOMElement("controls");

		controls.DOMElement.panel = controls.createDOMElement("panel");
		controls.DOM.appendChild(controls.DOMElement.panel);

		controls.DOMElement.topArea = controls.createDOMElement("toparea");
		controls.DOMElement.infoArea = controls.createDOMElement("infoarea");
		controls.DOMElement.info1Line = controls.createDOMElement("info1line");
		controls.DOMElement.infoArea.appendChild(controls.DOMElement.info1Line);
		controls.DOMElement.info2Line = controls.createDOMElement("info2Line");
		controls.DOMElement.infoArea.appendChild(controls.DOMElement.info2Line);
		controls.DOMElement.topArea.appendChild(controls.DOMElement.infoArea);
		controls.DOMElement.control1Area = controls.createDOMElement("control1area");
		controls.DOMElement.previousButton = controls.createDOMElement("previousbutton", null, true);
		controls.DOMElement.control1Area.appendChild(controls.DOMElement.previousButton);
		controls.DOMElement.rewindButton = controls.createDOMElement("rewindbutton", null, true);
		controls.DOMElement.control1Area.appendChild(controls.DOMElement.rewindButton);
		controls.DOMElement.playPauseButton = controls.createDOMElement("playpausebutton", null, true);
		controls.DOMElement.control1Area.appendChild(controls.DOMElement.playPauseButton);
		controls.DOMElement.fastForwardButton = controls.createDOMElement("fastforwardbutton", null, true);
		controls.DOMElement.control1Area.appendChild(controls.DOMElement.fastForwardButton);
		controls.DOMElement.nextButton = controls.createDOMElement("nextbutton", null, true);
		controls.DOMElement.control1Area.appendChild(controls.DOMElement.nextButton);
		controls.DOMElement.topArea.appendChild(controls.DOMElement.control1Area);
		controls.DOMElement.control2Area = controls.createDOMElement("control2area");
		controls.DOMElement.debugButton = controls.createDOMElement("debugbutton", null, true);
		controls.DOMElement.control2Area.appendChild(controls.DOMElement.debugButton);
		controls.DOMElement.topArea.appendChild(controls.DOMElement.control2Area);
		controls.DOMElement.panel.appendChild(controls.DOMElement.topArea);

		controls.DOMElement.bottomArea = controls.createDOMElement("bottomarea");
		controls.DOMElement.statusModeIcon = controls.createDOMElement("statusmodeicon");
		controls.DOMElement.bottomArea.appendChild(controls.DOMElement.statusModeIcon);
		controls.DOMElement.playTime = controls.createDOMElement("playtime");
		controls.DOMElement.bottomArea.appendChild(controls.DOMElement.playTime);
		controls.progress.bar.container = controls.createDOMElement("progressbarcontainer");
		controls.progress.bar.DOM = controls.createDOMElement("progressbar");
		controls.progress.dot.DOM = controls.createDOMElement("progressdot", null, true);
		controls.progress.bar.container.appendChild(controls.progress.bar.DOM);
		controls.progress.bar.container.appendChild(controls.progress.dot.DOM);
		controls.DOMElement.bottomArea.appendChild(controls.progress.bar.container);
		controls.DOMElement.endTime = controls.createDOMElement("endtime");
		controls.DOMElement.bottomArea.appendChild(controls.DOMElement.endTime);
		controls.DOMElement.panel.appendChild(controls.DOMElement.bottomArea);

		controls.DOMElement.loader = controls.createDOMElement("loader");
		controls.DOM.appendChild(controls.DOMElement.loader);

		documentFragment.appendChild(controls.DOM);

		controls.DOMElement.info1Line.innerHTML = controls.getVideoName();
		document.body.appendChild(documentFragment);
	},
	/**
	 * object with methods to manipulate CSS
	 */
	css: {
		/**
		 * adding CSS class to DOM element
		 * @param CSSClass
		 * @param element
		 */
		addClass: function (CSSClass, element) {
			element.className = (element.className + ' ' + CSSClass).trim();
		},
		/**
		 * adding CSS file to document HEAD
		 * @param fileName
		 */
		addFile: function (fileName) {
			var css;

			css = document.createElement("link");
			css.href = fileName + ".css";
			css.rel = "stylesheet";
			document.head.appendChild(css);
		},
		/**
		 * checking if DOM element has CSS class
		 * @param CSSClass
		 * @param element
		 * @returns {boolean}
		 */
		hasClass: function (CSSClass, element) {
			var pattern;

			pattern = new RegExp("\\b" + CSSClass + "\\b");

			return pattern.test(element.className);
		},
		/**
		 * removing CSS class from DOM element
		 * @param CSSClass
		 * @param element
		 */
		removeClass: function (CSSClass, element) {
			var pattern;

			pattern = new RegExp("\\b" + CSSClass + "\\b");

			element.className = element.className.replace(pattern ,'').trim();
		}
	},
	/**
	 * search HTML document for used video player
	 */
	getPlayerObject: function () {
		var objects,
			i,
			type;

		objects = document.getElementsByTagName("video");
		if (objects.length) {
			this.unifyVideoObjectsAPI(objects[0], "video");
		} else {
			objects = document.getElementsByTagName("object");
			if (objects.length) {
				for (i = 0; i < objects.length; i++) {
					type = objects[i].type;
					if (type.indexOf("video") > -1 || type.indexOf("dash") > -1) {
						this.unifyVideoObjectsAPI(objects[i], "object");
					}
				}
			}
		}
	},
	/**
	 * get title of used video
	 * @returns {*|string}
	 */
	getVideoName: function () {
		var pos,
			name,
			url;

		name = this.player.object.name || this.player.object.title || this.player.object.alt;

		if (name === '' || typeof name == "undefined") {
			url = this.player.object.src || this.player.object.data || '';
			if (url === '') {
				url = document.getElementsByTagName('source')[0].src;
			}
			pos = url.lastIndexOf('/');
			name = url.substr(pos + 1);
		}

		return name;
	},
	/**
	 * method run after player start
	 */
	onPlayerStart: function () {
		this.progress.bar.width = parseInt(window.getComputedStyle(this.progress.bar.container).width, 10);
		this.disableButton(controls.DOMElement.nextButton);
		controls.DOMElement.playPauseButton.focus();
		this.isPlayerStarted = true;
		controls.DOMElement.endTime.innerHTML = this.parseTime(this.player.getDuration());
	},
	/**
	 * checking if DOM element is currently focused
	 * @param element
	 * @returns {boolean}
	 */
	isFocused: function (element) {
		return controls.focusedDOMElement === element;
	},
	/**
	 * creating DOM element
	 * @param id
	 * @param className
	 * @param tabIndex
	 * @returns {Element}
	 */
	createDOMElement: function (id, className, tabIndex) {
		var element = document.createElement("div");

		if (id) {
			element.id = id;
		}
		if (className) {
			element.className = className;
		}
		if (tabIndex) {
			element.tabIndex = ++controls.tabIndex;
			element.addEventListener("focus", function () {
				controls.callback.onFocus(element);
			});
		}
		return element;
	},
	/**
	 * retargeting callbacks from AVObject state change
	 */
	AVObjectPlayStateChangeEventHandler: function () {
		controls.restartAutoHide();

		switch (controls.player.getState()) {
		case 0:	// stop
			controls.callback.onStop();
			break;
		case 1:
			controls.callback.onPlay();		//	HTML5 playing, play
			break;
		case 2:								//	HTML5 pause
			controls.callback.onPause();
			break;
		case 3:	//	connecting				//	HTML5 waiting
			controls.callback.onLoading();
			break;
		case 4://	buffering				//	HTML5 waiting
			controls.callback.onLoading();
			break;
		case 5:	// finished					//	HTML5 ended
			controls.callback.onFinished();
			break;
		case 6:	// error					//	HTML5 error
			controls.callback.onError();
			break;
		}
	},
	/**
	 * methods for IR Remote Controller support
	 */
	remoteController: {
		/**
		 * activate support for RC
		 */
		activate: function () {
			this.keySet = app.privateData.keyset;
			this.keySet.setValue(this.keySet.VCR | this.keySet.NAVIGATION);

			document.addEventListener("keydown", function (event) {
				switch (event.keyCode) {
				case 13:
					controls.remoteController.press("enter");
					break;
				case 19:
					controls.action.pause();
					break;
				case 37:
					controls.remoteController.press("left", event);
					break;
				case 39:
					controls.remoteController.press("right", event);
					break;
				case 38:
					controls.remoteController.press("up");
					break;
				case 40:
					controls.remoteController.press("down", event);
					break;
				case 412:
					controls.action.rewind();
					break;
				case 413:
					controls.action.stop();
					break;
				case 415:
					controls.action.play();
					break;
				case 417:
					controls.action.fastForward();
					break;
				case 461:
					controls.remoteController.press("return");
					break;
				}
			}, false);
		},
		/**
		 * semi event handler for RC keys input
		 * gives possibility to software emulate of RC key input for e.x. automatic tests
		 * @param button
		 * @param event
		 */
		press: function (button, event) {
			controls.restartAutoHide();

			switch (button) {
			case "down":
				if (controls.isHidden) {
					controls.show();
				} else if (controls.player.playSpeed === 1 && controls.css.hasClass("playing", controls.DOM)) {
					controls.progress.dot.DOM.focus();
				} else {
					event.preventDefault();
				}
				break;
			case "enter":
				if (controls.error) {
					app.destroyApplication();
				} else if (controls.isHidden) {
					controls.show();
				} else if (controls.progress.dot.isActive) {
					controls.progress.dot.seekToPosition();
					controls.progress.dot.deactivate();
					controls.progress.dot.DOM.focus();
				} else {
					controls.callback.onEnterPress();
				}
				break;
			case "left":
				if (controls.isHidden) {
					controls.show();
				} else if (controls.isFocused(controls.progress.dot.DOM)) {
					controls.progress.dot.moveLeft();
					event.preventDefault();
				}
				break;
			case "return":
				if (!controls.isHidden) {
					controls.hide();
				} else {
					app.destroyApplication();
				}
				break;
			case "right":
				if (controls.isHidden) {
					controls.show();
				} else if (controls.isFocused(controls.progress.dot.DOM)) {
					controls.progress.dot.moveRight();
					event.preventDefault();
				}
				break;
			case "up":
				if (controls.isHidden) {
					controls.show();
				} else {
					if (controls.progress.dot.isActive) {
						controls.progress.dot.deactivate();
					}
					controls.DOMElement.playPauseButton.focus();
				}
				break;
			}
		}
	},
	/**
	 * restart controls auto hide timer
	 */
	restartAutoHide: function () {
		clearTimeout(controls.autoHideTimer);
		controls.autoHideTimer = setTimeout(controls.hide, controls.config.visibilityTime);
	},
	/**
	 * interactions available for playback
	 */
	action: {
		/**
		 * action for fastForward button
		 */
		fastForward: function () {
			controls.show();

			if (controls.player.playSpeed >= 1 || controls.player.playSpeed <= -1) {// current state is playing or fastForward or rewind
				controls.player.playSpeed = controls.getNextPlaySpeed("fastForward");
			} else {// current state is paused or slowRewind
				controls.player.playSpeed = controls.getNextPlaySpeed("slowPlay");
			}

			controls.DOM.className = "fastforward";
			controls.DOMElement.statusModeIcon.className = ("speed" + controls.player.playSpeed).replace('.', '');
			controls.player.play(controls.player.playSpeed);
			controls.DOMElement.fastForwardButton.focus();
		},
		/**
		 * action for pause button
		 */
		pause: function () {
			controls.show();

			if (controls.player.getState() !== 2) {
				controls.player.pause();
			} else {
				controls.player.seek(controls.player.getPosition() + 500);
			}
		},
		/**
		 * action for play button
		 */
		play: function () {
			controls.show();

			controls.player.playSpeed = 1;
			controls.player.play(controls.player.playSpeed);
		},
		/**
		 * action toggle play/pause button
		 */
		playPause: function () {
			var state = controls.player.getState();

			if (state === 1 && controls.player.playSpeed === 1) {// playing
				this.pause();
			} else if (state === 2 || (state === 1 && controls.player.playSpeed !== 1)) {// paused
				this.play();
			}
		},
		/**
		 * action for button "previous"
		 */
		previous: function () {
			controls.player.seek(0);
		},
		/**
		 * action for rewind button
		 */
		rewind: function () {
			controls.show();

			if (controls.player.playSpeed >= 1 || controls.player.playSpeed <= -1) {// current state is playing, fastForward or rewind
				controls.player.playSpeed = controls.getNextPlaySpeed("rewind");
			} else {// current state is paused or slowPlay
				controls.player.playSpeed = controls.getNextPlaySpeed("slowRewind");
			}

			controls.DOM.className = "rewind";
			controls.DOMElement.statusModeIcon.className = ("speed" + controls.player.playSpeed).replace(".", "");
			controls.player.play(controls.player.playSpeed);
			controls.DOMElement.rewindButton.focus();
		},
		/**
		 * action for stop button
		 */
		stop: function () {
			controls.player.stop();
		}
	},
	/**
	 * player callbacks
	 */
	callback: {
		/**
		 * callback fired after "enter" button press
		 */
		onEnterPress: function () {
			if (!controls.focusedDOMElement) {
				return;
			}

			if (!controls.css.hasClass("disabled", controls.focusedDOMElement)) {
				switch (controls.focusedDOMElement.id) {
				case "playpausebutton":
					controls.action.playPause();
					break;
				case "rewindbutton":
					controls.action.rewind();
					break;
				case "fastforwardbutton":
					controls.action.fastForward();
					break;
				case "previousbutton":
					controls.action.previous();
					break;
				case "debugbutton":
					if (!controls.debug.isEnabled) {
						controls.debug.initialize();
					} else if (controls.debug.isHidden) {
						controls.debug.DOM.style.display = "block";
						controls.debug.isHidden = false;
					} else {
						controls.debug.DOM.style.display = "none";
						controls.debug.isHidden = true;
					}
					break;
				default:
					break;
				}
			}
		},
		/**
		 * callback fired after "error" occurs
		 */
		onError: function () {
			controls.player.state = 6;
			controls.DOM.removeChild(controls.DOMElement.panel);
			controls.DOM.removeChild(controls.DOMElement.loader);
			controls.error = controls.createDOMElement("error");
			controls.error.innerHTML = controls.getLang("errorMessage");
			controls.errorButton = controls.createDOMElement("ok");
			controls.errorButton.innerHTML = controls.getLang("ok");
			controls.error.appendChild(controls.errorButton);
			controls.DOM.appendChild(controls.error);
			controls.errorButton.focus();
		},
		/**
		 * callback fired after video playback reach end
		 */
		onFinished: function () {
			app.destroyApplication();
		},
		/**
		 * callback fired when DOM element will become focus
		 * @param element
		 */
		onFocus: function (element) {
			if (typeof element != "undefined") {
				controls.focusedDOMElement = element;
			}
		},
		/**
		 * callback fired when player state is changed to "loading" state, it's also buffering state
		 */
		onLoading: function () {
			controls.player.state = 3;
			controls.DOMElement.loader.className = "visible";
		},
		/**
		 * callback fired when player state is changed to "paused" state
		 */
		onPause: function () {
			controls.player.state = 2;
			controls.player.playSpeed = 0;
			controls.DOMElement.playPauseButton.focus();
            controls.show();
			controls.DOM.className = "paused";
			controls.DOMElement.loader.className = '';
			controls.progress.timer.stop();
			controls.restartAutoHide();
		},
		/**
		 * callback fired when player state is changed to "playing" state
		 */
		onPlay: function () {
			var last_state = controls.player.state;

			controls.player.state = 1;
			controls.DOMElement.loader.className = '';

			if (!controls.player.playSpeed) {
				controls.player.playSpeed = controls.player.getSpeed();
			}

			if (!controls.isPlayerStarted) {
				controls.onPlayerStart();
                controls.show();
			}

			if (controls.progress.dot.isActive) {
				controls.progress.dot.deactivate();
			}

			if (controls.isFocused(controls.progress.dot.DOM)) {
				controls.progress.dot.DOM.focus();
			} else {
				if (controls.player.playSpeed === 1) {
					controls.DOMElement.playPauseButton.focus();
					controls.DOM.className = "playing";
				}

				if (last_state !== 3) {
					controls.show();
				}
			}
		},
		/**
		 * callback fired when player state is changed to "stopped" state
		 */
		onStop: function () {
            app.destroyApplication();
		}
	},
	/**
	 * show player controls
	 */
	show: function () {
		controls.isHidden = false;
		controls.progress.update();
		controls.css.removeClass("hidden", controls.DOMElement.panel);
		controls.restartAutoHide();
		controls.progress.timer.start();
	},
	/**
	 * hide player controls
	 */
	hide: function () {
		controls.isHidden = true;
		controls.css.addClass("hidden", controls.DOMElement.panel);
		clearTimeout(controls.autoHideTimer);

		clearTimeout(controls.progress.timer.autoStop);
		controls.progress.timer.autoStop = setTimeout(controls.progress.timer.stop, controls.config.visibilityTime);
	},
	/**
	 * get next play speed from controls.config.speed for specific specific speed type
	 * @param speedType
	 * @returns {*}
	 */
	getNextPlaySpeed: function (speedType) {
		var i,
			speedTypeLength,
			nextPlaySpeed;

		speedTypeLength = this.config.speed[speedType].length;

		for (i = 0; i < speedTypeLength; i++) {
			if (this.player.playSpeed === this.config.speed[speedType][i]) {
				if (speedTypeLength > i + 1) {	// last speed not reached
					nextPlaySpeed = this.config.speed[speedType][i + 1];
				}
			}
		}

		return nextPlaySpeed || this.config.speed[speedType][0];
	},
	/**
	 * disabling video controls button
	 * @param element
	 */
	disableButton: function (element) {
		this.css.addClass("disabled", element);
	},
	/**
	 * enabling video controls button
	 * @param element
	 */
	enableButton: function (element) {
		this.css.removeClass("disabled", element);
	},
	/**
	 * parsing time
	 * @param milisec
	 * @returns {string}
	 */
	parseTime: function (milisec) {
		var hour,
			min,
			sec,
			tempsec;

		tempsec = parseInt(milisec / 1000, 10);
		min = Math.floor(tempsec / 60);
		sec = tempsec % 60;
		hour = Math.floor(min / 60);

		if (hour > 0) {
			min = min % 60;
		}

		return hour + ':' + (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
	},
	/**
	 * object assembling all methods related to progress
	 */
	progress: {
		/**
		 * progress bar which is visible on controls panel
		 */
		bar: {
			/**
			 * container for progressBar DOM
			 */
			container: null,
			/**
			 * progressBar DOM
			 */
			DOM: null,
			/**
			 * update progressBar width
			 */
			update: function () {
				this.DOM.style.width = (controls.progress.percent * this.width / 100) + "px";
			},
			/**
			 * width of progressBar
			 */
			width: 0
		},
		/**
		 * this is a Dot indicator that is moving on progressBar, it can be focused
		 */
		dot: {
			/**
			 * active progress dot gives possibility to pick point to seek
			 */
			activate: function () {
				if (!this.isActive) {
					this.isActive = true;
					controls.css.addClass("active", this.DOM);

					this.percent = controls.progress.percent;
					this.DOM.style.left = ((controls.progress.percent * controls.progress.bar.width) / 100) + "px";
				}
			},
			/**
			 * remove activation from progress bar
			 */
			deactivate: function () {
				this.isActive = false;
				controls.css.removeClass("active", this.DOM);
			},
			/**
			 * progress dot DOM
			 */
			DOM: null,
			/**
			 * active state of progressDot is when progressDot is focused and then left/right arrow is pressed
			 * active state means that Dot position is not updated with progressBar, it shows position where user can make seek after pressing Enter button
			 */
			isActive: false,
			/**
			 * changes progress dot position to right (future time)
			 */
			moveLeft: function () {
				this.activate();

				this.percent -= 1000 / (controls.player.getDuration() / 1000);
				if (this.percent < 0) {
					this.percent = 0;
				}
				this.DOM.style.left = ((this.percent * controls.progress.bar.width) / 100) + "px";
			},
			/**
			 * changes progress dot position to left (previous time)
			 */
			moveRight: function () {
				this.activate();

				this.percent += 1000 / (controls.player.getDuration() / 1000);
				if (this.percent > 100) {
					this.percent = 100;
				}
				this.DOM.style.left = ((this.percent * controls.progress.bar.width) / 100) + "px";
			},
			/**
			 * position of progressDot on progressBar
			 */
			percent: 0,
			/**
			 * make seek to current position of progressDot
			 */
			seekToPosition: function () {
				controls.player.seek(this.percent / 100 * controls.player.getDuration());
			},
			/**
			 * update position of progressDot on progressBar
			 */
			update: function () {
				this.DOM.style.left = (controls.progress.percent * controls.progress.bar.width / 100) + "px";
			}
		},
		/**
		 * percentage progress of video playback
		 */
		percent: 0,
		/**
		 * updating playback progress related elements
		 */
		update: function () {
			controls.progress.percent = Math.floor(controls.player.getPosition() / controls.player.getDuration() * 10000) / 100;

			controls.progress.bar.update();
			controls.DOMElement.playTime.innerHTML = controls.parseTime(controls.player.getPosition());
			if (!controls.progress.dot.isActive) {
				controls.progress.dot.update();
			}
		},
		/**
		 * timer for updating progressBar width, progressDot position, and progress Time
		 */
		timer: {
			interval: null,
			autoStop: null,
			/**
			 * starting progress timer
			 */
			start: function () {
				this.stop();
				this.interval = setInterval(controls.progress.update, controls.config.progressBarRefreshTime);
			},
			/**
			 * stopping progress timer
			 */
			stop: function () {
				clearTimeout(controls.progress.timer.autoStop);
				controls.progress.timer.autoStop = null;
				clearInterval(controls.progress.timer.interval);
				controls.progress.timer.interval = null;
			}
		}
	},
	/**
	 * object for debug player controls
	 */
	debug: {
		DOM: null,
		isEnabled: false,
		isHidden: true,
		interval: null,
		/**
		 * clearing logs displayed on the screen
		 */
		clearLogs: function () {
			controls.debug.console.innerHTML = '';
		},
		/**
		 * AVObject player event triggered when play position changed
		 */
		onAVObjectPlayPositionChanged: function () {
			controls.debug.playPosition.innerHTML = "playPosition = '" + controls.player.getPosition() + "' (" + controls.parseTime(controls.player.getPosition()) + ")";
		},
		/**
		 * AVObject player event triggered when play speed changed
		 */
		onAVObjectPlaySpeedChanged: function () {
			controls.debug.playSpeed.innerHTML = "playSpeed = '" + controls.player.getSpeed() + "'";
		},
		/**
		 * event triggered after RC key has been pressed
		 * @param e
		 */
		onKeyPress: function (e) {
			var keyName,
				keyCode;

			switch (e.keyCode) {
				case 13:
					keyName = "Enter";
					break; 
				case 19:
					keyName = "Pause";
					break; 
				case 37:
					keyName = "Left arrow";
					break; 
				case 38:
					keyName = "Up arrow";
					break; 
				case 39:
					keyName = "Right arrow";
					break; 
				case 40:
					keyName = "Down arrow";
					break; 
				case 412:
					keyName = "Rewind";
					break; 
				case 413:
					keyName = "Stop";
					break; 
				case 415:
					keyName = "Play";
					break; 
				case 417:
					keyName = "FastForward";
					break; 
				case 461:
					keyName = "Return";
					break;
				case 404:
					keyName = "VK_GREEN";
					controls.debug.clearLogs();
					break; 
				case 405:
					keyName = "VK_YELLOW";
					controls.debug.scrollUp();
					break; 
				case 406:
					keyName = "VK_BLUE";
					controls.debug.scrollDown();
					break; 
				default:
					keyCode = e.keyCode;
					console.log("keyCode '" + keyCode + "' not found");
					break;
			}

			if (keyName) {
				controls.debug.keyPress.innerHTML = "last pressed key was '" + keyName + "'";
			} else {
				controls.debug.keyPress.innerHTML = "last pressed key has keyCode = '" + keyCode + "'";
			}
		},
		/**
		 * event triggered when player play state has been changed
		 */
		onPlayStateChange: function () {
			var playStateName = "";

			switch (controls.player.getState()) {
				case 0:
					playStateName = "stopped";
					break;
				case 1:
					playStateName = "playing";
					break;
				case 2:
					playStateName = "paused";
					break;
				case 3:
					playStateName = "connecting";
					break;
				case 4:
					playStateName = "buffering";
					break;
				case 5:
					playStateName = "finished";
					break;
				case 6:
					playStateName = "error";
					break;
			}

			controls.debug.playState.innerHTML = "playState = '" + controls.player.getState() + "' (" + playStateName + ")";
			controls.debug.playTime.innerHTML = "playTime = '" + controls.player.getDuration() + "' (" + controls.parseTime(controls.player.getDuration()) + ")";
		},
		/**
		 * HTML5 video player event triggered when play position changed
		 */
		onVideoObjectPlayPositionChanged: function () {
			controls.debug.playPosition.innerHTML = "currentTime = '" + controls.player.getPosition() + "' (" + controls.parseTime(controls.player.getPosition()) + ")";
		},
		/**
		 * HTML5 video player event triggered when play speed changed
		 */
		onVideoObjectPlaySpeedChanged: function () {
			controls.debug.playSpeed.innerHTML = "playbackRate = '" + controls.player.getSpeed() + "'";
		},
		/**
		 * debugger initialization
		 */
		initialize: function(){
			var debugFragment;

			controls.css.addFile("debug");

			debugFragment = document.createDocumentFragment();
			controls.debug.DOM = controls.createDOMElement("debug");
				controls.debug.console = controls.createDOMElement("debugconsole");
					controls.debug.DOM.appendChild(controls.debug.console);
				controls.debug.playState = controls.createDOMElement("debugplaystate");
					controls.debug.DOM.appendChild(controls.debug.playState);
				controls.debug.playSpeed = controls.createDOMElement("debugplayspeed");
					controls.debug.DOM.appendChild(controls.debug.playSpeed);
				controls.debug.playTime = controls.createDOMElement("debugplaytime");
					controls.debug.DOM.appendChild(controls.debug.playTime);
				controls.debug.playPosition = controls.createDOMElement("debugplayposition");
					controls.debug.DOM.appendChild(controls.debug.playPosition);
				controls.debug.keyPress = controls.createDOMElement("debugkeypress");
					controls.debug.DOM.appendChild(controls.debug.keyPress);
				controls.debug.helpBar = controls.createDOMElement("debughelpbar");
					controls.debug.helpGreen = controls.createDOMElement("debughelpgreen");
						controls.debug.helpBar.appendChild(controls.debug.helpGreen);
					controls.debug.helpYellow = controls.createDOMElement("debughelpyellow");
						controls.debug.helpBar.appendChild(controls.debug.helpYellow);
					controls.debug.helpBlue = controls.createDOMElement("debughelpblue");
						controls.debug.helpBar.appendChild(controls.debug.helpBlue);
					controls.debug.DOM.appendChild(controls.debug.helpBar);
			debugFragment.appendChild(controls.debug.DOM);

			controls.DOM.appendChild(debugFragment);

			document.addEventListener("keypress", controls.debug.onKeyPress);

			console.log = function (log) {
				controls.debug.print("log", log);
			};
			console.warn = function (log) {
				controls.debug.print("warn", log);
			};
			console.error = function (log) {
				controls.debug.print("error", log);
			};
			console.debug = function (log) {
				controls.debug.print("debug", log);
			};

			if (controls.player.type === "video") {
				controls.debug.initializeVideoObject();
				controls.debug.onPlayStateChange();
			} else {
				controls.debug.initializeAVObject();
				controls.keySet = app.privateData.keyset;
				controls.keySet.setValue(controls.keySet.VCR | controls.keySet.NAVIGATION | controls.keySet.GREEN | controls.keySet.YELLOW | controls.keySet.BLUE);
			}
			controls.debug.isEnabled = true;
			controls.debug.isHidden = false;
		},
		/**
		 * initialization of AVObject
		 */
		initializeAVObject: function () {
			controls.player.object.addEventListener("PlayStateChange", controls.debug.onPlayStateChange);
			controls.player.object.addEventListener("PlayPositionChanged", controls.debug.onAVObjectPlayPositionChanged);
			controls.player.object.addEventListener("PlaySpeedChanged", controls.debug.onAVObjectPlaySpeedChanged);
			controls.debug.onPlayStateChange();
			controls.debug.onAVObjectPlayPositionChanged();
			controls.debug.onAVObjectPlaySpeedChanged();
			controls.debug.interval = setInterval(controls.debug.onAVObjectPlayPositionChanged, controls.config.progressBarRefreshTime);
		},
		/**
		 * initialization of HTML5 video object
		 */
		initializeVideoObject: function () {
			controls.player.object.addEventListener("playing", controls.debug.onPlayStateChange);
			controls.player.object.addEventListener("pause", controls.debug.onPlayStateChange);
			controls.player.object.addEventListener("waiting", controls.debug.onPlayStateChange);
			controls.player.object.addEventListener("ended", controls.debug.onPlayStateChange);
			controls.player.object.addEventListener("error", controls.debug.onPlayStateChange);
			controls.player.object.addEventListener("timeupdate", controls.debug.onVideoObjectPlayPositionChanged);
			controls.player.object.addEventListener("ratechange", controls.debug.onVideoObjectPlaySpeedChanged);
		},
		/**
		 * print logs on screen
		 * @param type
		 * @param txt
		 */
		print: function (type, txt) {
			var date,
				log = document.createElement("div");

			date = new Date();
			if (type === "log") {
				log.className = "log";
			}
			if (type === "warn") {
				log.className = "warn";
			}
			if (type === "error") {
				log.className = "error";
			}
			if (type === "debug") {
				log.className = "debug";
			}
			log.innerHTML = date.getMinutes() + ':' + date.getSeconds() + '.' + date.getMilliseconds() + " - " +txt;
			controls.debug.console.appendChild(log);
			controls.debug.console.scrollTop = controls.debug.console.scrollHeight;
		},
		/**
		 * scroll down logs list
		 */
		scrollDown: function () {
			controls.debug.console.scrollTop += 21;
		},
		/**
		 * scroll up logs list
		 */
		scrollUp: function () {
			controls.debug.console.scrollTop -= 21;
		}
	}
};
