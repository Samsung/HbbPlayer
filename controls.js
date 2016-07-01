/********************************************************************************* 
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
 ********************************************************************************/

/**
@todo
- tooltip
- try catch

@2016 player bugs
- seek while paused, triggers 'play' event, speed = 1, playState = 1 but player not playing
- rewind until start, doesn't update speed, even if it's playing
- pause jump creates timer
*/

controls = {
	config: {
		autoHideTime: 5000,	//	after this time controls will hide automatically "ms"
		progressBarRefreshTime: 500,	// time for progressBar refresh "ms"
		menuAutoCloseTime: 10000,
		speed: {
			rewind: [-1, -2, -4],
			slowRewind: [-0.25, -0.5, -0.75],
			slowPlay: [0.25, 0.5, 0.75],
			fastForward: [2, 4, 8]
		},
		language: {
			defaultLang: {// default language values, if some language has own translations it will be overwritten with language specific word
				cancel: "Cancel",
				english: "English",
				errorMessage: 'Error encountered during content playback. Press OK to return',
				off: "Off",
				ok: "OK",
				on: "On",
				other: "Other",
				language: "Language",
				subtitles: "Subtitles",
				subtitlesDescription: "If the subtitles aren't in the language you expect, check the encoding settings below"
			},
			en: {},
			us: {
				subtitles: "Captions",
				subtitlesDescription: "If the captions aren't in the language you expect, check the encoding settings below"
			}
		},
		subtitles: {
            isEnabled: false,
            language: null,
			//options: [{name: "on"}, {name: "off", selected: true}],
			options: [],
			//languages: [{name: "english", selected: true}, {name: "other"}],
			languages: [],
            getSelectedOption: function (option) {
                var i,
                    options = controls.config.subtitles.options;
                
                for (i = 0; i < options.length; i++) {
                    if (options[i].selected) {
                        return options[i].name;
                    }
                }
            },
            getOptions: function () {
                controls.config.subtitles.isEnabled = localStorage.getItem("subtitles_enabled");
                controls.config.subtitles.language = localStorage.getItem("subtitles_language");
            }
		}
	},
    _subtitlesLoading: false,   // state for restarting player
	uiLanguage: "en",
	getLang: function (word) {
		return controls.config.language[controls.uiLanguage][word.toLowerCase()] || controls.config.language.defaultLang[word.toLowerCase()] || word;
	},
	playSpeed: null,
	dom: null,
	element: {},
	keySet: null,
	player: {
        _lastPosition: null,
		object: null,
		state: null,
		getSpeed: null,
		getState: null,
		getPosition: null,
		getDuration: null,
		play: null,
        pause: null,
		seek: null,
		stop: null,
        subtitles: null
	},
	autoHideTimer: null,
	isAppStarted: false,
	isHidden: false,
	focusedElement: null,
	tabIndex: 0,
	unifyVideoObjectsAPI: function (object, objectType) {
		if (objectType === "video") {
			this.player = {
				object: object,
				type: "video",
				getSpeed: function () {
					return controls.player.object.playbackRate;
				},
				getState: function () {
					return this.state;
				},
				getPosition: function () {
					return controls.player.object.currentTime * 1000;
				},
				getDuration: function () {
					return controls.player.object.duration * 1000;
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
				stop: controls.callback.onStop,
                addSubtitles: function (lang) {
                    controls.hide();
                    controls.player._lastPosition = controls.player.getPosition();
                    controls._subtitlesLoading = true;
                    controls.player.pause();
                    
                    controls.player.subtitles = document.createElement("track");
                    controls.player.subtitles.setAttribute("kind", "subtitles");
                    controls.player.subtitles.setAttribute("srclang", lang.srclang);
                    controls.player.subtitles.setAttribute("src", "subtitles");
                    controls.player.subtitles.setAttribute("value", "srclang:" + lang.srclang + " label:" + lang.label + " src:" + lang.src);
                    AVPlayer.appendChild(controls.player.subtitles);
                },
                removeSubtitles: function () {
                    AVPlayer.removeChild(controls.player.subtitles);
                }
			};
			controls.player.object.addEventListener('playing', controls.callback.onPlay);
			controls.player.object.addEventListener('pause', controls.callback.onPause);
			controls.player.object.addEventListener('waiting', controls.callback.onLoading);
			controls.player.object.addEventListener('ended', controls.callback.onFinished);
			controls.player.object.addEventListener('error', controls.callback.onError);
		} else {
			this.player = {
				object: object,
				type: "avobject",
				getSpeed: function () {
					return controls.player.object.speed;
				},
				getState: function () {
					return controls.player.object.playState;
				},
				getPosition: function () {
					return controls.player.object.playPosition;
				},
				getDuration: function () {
					return controls.player.object.playTime;
				},
				play: function (playSpeed) {
					controls.player.object.play(playSpeed);
				},
                pause: function (playSpeed) {
					controls.player.object.play(0);
				},
				seek: function (position) {
					controls.player.object.seek(position);
				},
				stop: function () {
					controls.player.object.stop();
				},
                addSubtitles: function (lang) {
                    controls.hide();
                    controls.player._lastPosition = controls.player.getPosition();
                    controls._subtitlesLoading = true;
                    controls.player.pause();
                    
                    controls.player.subtitles = document.createElement("param");
                    controls.player.subtitles.setAttribute("name", "subtitles");
                    controls.player.subtitles.setAttribute("value", "srclang:" + lang.srclang + " label:" + lang.label + " src:" + lang.src);
                    AVPlayer.appendChild(controls.player.subtitles);
                },
                removeSubtitles: function () {
                    AVPlayer.removeChild(controls.player.subtitles);
                }
			};
			controls.player.object.addEventListener('PlayStateChange', controls.AVObjectPlayStateChangeEventHandler);
		}
	},
    parseUrl: function () {
        var search,
            position,
            phase = "url=",
            result = [];

        search = window.location.search.substr(1).split('&');
        //position = search.indexOf(phase);
        //return {url: search.substr(position + phase.length), subtitles: ''}
        
        result.push({srclang: 'eng', label: 'English', src: 'http://some.src/english'});
        result.push({srclang: 'pol', label: 'Polish', src: 'http://some.src/polish'});
        
        
        
        return result;
    },
	saveSettings: function (settings) {
        var options,
            wasEnabled,
            languages,
            oldLanguages,
            i,
            enabled,
            currentLang;
        
        wasEnabled = localStorage.getItem("subtitles_enabled");
        oldLanguage = localStorage.getItem("subtitles_language");

        for (setting in settings) {
            if (setting === "subtitles_options") {
                for (i = 0; i < settings[setting].length; i++) {
                    if (settings[setting][i].selected === true) {
                        enabled = (settings[setting][i].name === "on") + "";
                    }
                }
                localStorage.setItem("subtitles_enabled", enabled);
            }
            if (setting === "subtitles_languages") {
                for (i = 0; i < settings[setting].length; i++) {
                    if (settings[setting][i].selected === true) {
                        currentLang = settings[setting][i].srclang;
                    }
                }
                localStorage.setItem("subtitles_language", currentLang);
            }
        }

        if (enabled !== wasEnabled) {   // subtitles state has been changed
            if (wasEnabled === "true") {// subtitles was on
                controls.player.removeSubtitles();
            } else {
                if (controls.config.subtitles.language) {
                    controls.player.addSubtitles(controls.config.subtitles.getSelectedOption(controls.config.subtitles.language));
                } else {
                    controls.player.addSubtitles(controls.config.subtitles.languages[0]);
                }
            }
            controls.config.subtitles.getOptions();
        } else if (currentLang !== oldLanguage && wasEnabled) { // subtitles language has been changed
            controls.player.removeSubtitles();
            controls.config.subtitles.getOptions();
            controls.player.addSubtitles(controls.config.subtitles.getSelectedOption(controls.config.subtitles.language));
        } else {
            controls.config.subtitles.getOptions();
        }
	},
	init: function () {
		var fragment,
            subtitles,
            i,
            languageFound;

		controls.getPlayerObject();

		if (window.innerWidth === 1280) {
			controls.css.addFile("720p");//	720p 
		} else {
			controls.css.addFile("1080p");
		}

		if (localStorage.getItem("subtitles_enabled") !== null) {
            if (localStorage.getItem("subtitles_enabled") === "true") {
                controls.config.subtitles.isEnabled = true;
            } else {
                controls.config.subtitles.isEnabled = false;
            }
        }

		fragment = document.createDocumentFragment();
		controls.dom = controls.createDOMElement('controls');

		controls.element.panel = controls.createDOMElement('panel');
		controls.dom.appendChild(controls.element.panel);
		
		controls.element.topArea = controls.createDOMElement('toparea');
		controls.element.infoArea = controls.createDOMElement('infoarea');
		controls.element.info1Line = controls.createDOMElement('info1line');
		controls.element.infoArea.appendChild(controls.element.info1Line);
		controls.element.info2Line = controls.createDOMElement('info2Line');
		controls.element.infoArea.appendChild(controls.element.info2Line);
		controls.element.topArea.appendChild(controls.element.infoArea);
		controls.element.control1Area = controls.createDOMElement('control1area');
		controls.element.previousButton = controls.createDOMElement('previousbutton', null, true);
		controls.element.control1Area.appendChild(controls.element.previousButton);
		controls.element.rewindButton = controls.createDOMElement('rewindbutton', null, true);
		controls.element.control1Area.appendChild(controls.element.rewindButton);
		controls.element.playPauseButton = controls.createDOMElement('playpausebutton', null, true);
		controls.element.control1Area.appendChild(controls.element.playPauseButton);
		controls.element.fastForwardButton = controls.createDOMElement('fastforwardbutton', null, true);
		controls.element.control1Area.appendChild(controls.element.fastForwardButton);
		controls.element.nextButton = controls.createDOMElement('nextbutton', null, true);
		controls.element.control1Area.appendChild(controls.element.nextButton);
		controls.element.topArea.appendChild(controls.element.control1Area);
		controls.element.control2Area = controls.createDOMElement('control2area');
		controls.element.debugButton = controls.createDOMElement('debugbutton', null, true);
		controls.element.control2Area.appendChild(controls.element.debugButton);
		controls.element.topArea.appendChild(controls.element.control2Area);
		controls.element.panel.appendChild(controls.element.topArea);

		controls.element.bottomArea = controls.createDOMElement('bottomarea');
		controls.element.statusModeIcon = controls.createDOMElement('statusmodeicon');
		controls.element.bottomArea.appendChild(controls.element.statusModeIcon);
		controls.element.playTime = controls.createDOMElement('playtime');
		controls.element.bottomArea.appendChild(controls.element.playTime);
		controls.progress.bar.container = controls.createDOMElement('progressbarcontainer');
		controls.progress.bar.dom = controls.createDOMElement('progressbar');
		controls.progress.dot.dom = controls.createDOMElement('progressdot', null, true);
		controls.progress.bar.container.appendChild(controls.progress.bar.dom);
		controls.progress.bar.container.appendChild(controls.progress.dot.dom);
		controls.element.bottomArea.appendChild(controls.progress.bar.container);
		controls.element.endTime = controls.createDOMElement('endtime');
		controls.element.bottomArea.appendChild(controls.element.endTime);
		controls.element.panel.appendChild(controls.element.bottomArea);

		controls.element.loader = controls.createDOMElement('loader');
		controls.dom.appendChild(controls.element.loader);

		fragment.appendChild(controls.dom);

		controls.element.info1Line.innerHTML = controls.getVideoName();
		document.body.appendChild(fragment);

		controls.remoteController.activate();
        
        subtitles = controls.parseUrl();
        if (subtitles.length > 0) {
            controls.element.settingsButton = controls.createDOMElement('settingsbutton', null, true);
            controls.element.control2Area.insertBefore(controls.element.settingsButton, controls.element.debugButton);
            
            controls.config.subtitles.options = [{name: "on", selected: controls.config.subtitles.isEnabled}, {name: "off", selected: !controls.config.subtitles.isEnabled}];

            if (localStorage.getItem("subtitles_language") === null) {
                if (controls.config.subtitles.language !== null) {
                    localStorage.setItem("subtitles_language", controls.config.subtitles.language);
                }
            } else {
                controls.config.subtitles.language = localStorage.getItem("subtitles_language");
            }
            
            for (i = 0; i < subtitles.length; i++) {
                if (subtitles[i].srclang === controls.config.subtitles.language) {
                    languageFound = subtitles[i];
                }
                controls.config.subtitles.languages.push({name: subtitles[i].label, selected: (subtitles[i].srclang === controls.config.subtitles.language), src: subtitles[i].src, srclang: subtitles[i].srclang});
            }
            
            
            if (!languageFound) {
                languageFound = subtitles[0];
                controls.config.subtitles.languages[0].selected = true;
            }

            if (controls.config.subtitles.isEnabled) {
                controls.player.addSubtitles(languageFound);
            }
        }
	},
	css: {
		addFile: function (fileName) {
			var css = document.createElement('link');

			css.href = fileName + ".css";
			css.rel = "stylesheet";
			document.head.appendChild(css);
		},
		addClass: function (CSSClass, element) {
			var found,
				className = element.className;

			found = this.hasClass(CSSClass, element);

			if (!found) {
				className += " " + CSSClass;
				element.className = className.trim();
			}
		},
		removeClass: function (CSSClass, element) {
			var i,
				c1,
				c2,
				result = "";

			c1 = element.className.trim();
			if (c1 !== "") {
				c2 = c1.split(" ");
				for (i = 0; i < c2.length; i++) {
					if (c2[i] !== CSSClass) {
						result += " " + c2[i];
					}
				}

				element.className = result.trim();
			}
		},
		hasClass: function (CSSClass, element) {
			var i,
				c1,
				c2,
				found = false;

			c1 = element.className.trim();
			if (c1 !== "") {
				c2 = c1.split(" ");
				for (i = 0; i < c2.length; i++) {
					if (c2[i] === CSSClass) {
						found = true;
					}
				}
			}

			return found;
		}
	},
	menu: {
		settings: {
			dom: null,
			create: function () {
				if (!this.dom) {
					this.dom = controls.createDOMElement('settingsmenu', null, true);
					this.dom.innerHTML = controls.getLang('subtitles');
					document.body.appendChild(this.dom);
					this.dom.focus();
				}
			},
			destroy: function () {
				document.body.removeChild(controls.menu.settings.dom);
				controls.menu.settings.dom = null;
				controls.element.settingsButton.focus();
			}
		},
		subtitles: {
			autoCloseTimer: null,
			dom: null,
			subtitlesOptions: null,
			languageOptions: null,
			data: null,
			subMenu: null,
			getSelectedOption: function (options) {
				var i,
					length = options.length;

				for (i = 0; i < length; i++) {
					if (options[i].selected === true) {
						return options[i];
					}
				}
			},
			create: function () {
				if (!this.dom) {
					if (!this.data) {
						this.settings.get();
					}

					this.dom = controls.createDOMElement('subtitlesmenu');
					this.title = controls.createDOMElement('subtitlesmenutitle');
					this.title.innerHTML = controls.getLang('subtitles');
					this.dom.appendChild(this.title);
					this.description = controls.createDOMElement('subtitlesmenudescription');
					this.description.innerHTML = controls.getLang('subtitlesDescription');
					this.dom.appendChild(this.description);

					controls.element.subtitlesMenuLeft = controls.createDOMElement('subtitlesmenuleft');

					this.subtitlesOptions = controls.menu.createObject("subtitlesmenusubtitles", controls.getLang('subtitles'));
					this.subtitlesOptionsValue = controls.createDOMElement(null, "value");
					this.subtitlesOptionsValue.innerHTML = controls.getLang(this.getSelectedOption(this.data.options).name);
					this.subtitlesOptions.appendChild(this.subtitlesOptionsValue);
					controls.element.subtitlesMenuLeft.appendChild(this.subtitlesOptions);

					this.languageOptions = controls.menu.createObject("subtitlesmenulanguage", controls.getLang('language'));
					this.subtitlesLanguageValue = controls.createDOMElement(null, "value");
					this.subtitlesLanguageValue.innerHTML = controls.getLang(this.getSelectedOption(this.data.languages).name);
					controls.element.subtitlesMenuLeft.appendChild(this.languageOptions);
					this.languageOptions.appendChild(this.subtitlesLanguageValue);

					controls.menu.subtitles.dom.appendChild(controls.element.subtitlesMenuLeft);

					controls.element.subtitlesMenuRight = controls.createDOMElement('subtitlesmenuright');
					controls.element.subtitlesMenuRight.appendChild(controls.menu.createObject("subtitlesmenuokbutton", controls.getLang('ok')));
					controls.element.subtitlesMenuRight.appendChild(controls.menu.createObject("subtitlesmenucancelbutton", controls.getLang('cancel')));
					controls.menu.subtitles.dom.appendChild(controls.element.subtitlesMenuRight);

					document.body.appendChild(this.dom);
				} else {
					controls.menu.subtitles.subtitlesOptionsValue.innerHTML = controls.getLang(controls.menu.subtitles.getSelectedOption(controls.menu.subtitles.data.options).name);
					controls.menu.subtitles.subtitlesLanguageValue.innerHTML = controls.getLang(controls.menu.subtitles.getSelectedOption(controls.menu.subtitles.data.languages).name);
					controls.menu.subtitles.show();
				}
				clearTimeout(controls.menu.subtitles.autoCloseTimer);
				controls.menu.subtitles.autoCloseTimer = setTimeout(controls.menu.subtitles.onSubtitlesCancelPressed, controls.config.menuAutoCloseTime);
				this.subtitlesOptions.focus();
			},
			settings: {
				set: function () {
					controls.saveSettings({
                        "subtitles_options": controls.menu.subtitles.data.options,
				        "subtitles_languages": controls.menu.subtitles.data.languages
                    });
				},
				get: function () {
					controls.menu.subtitles.data = {
						languages: controls.config.subtitles.languages,
						options: controls.config.subtitles.options
					};
				}
			},
			onSubtitlesSelectEnter: function () {
				this.hide();
				controls.menu.subMenu.parent = controls.menu.subtitles;
				controls.menu.subtitles.subMenu = controls.menu.subMenu.create("menu", controls.getLang('subtitles'), controls.menu.subtitles.data.options);
			},
			onLanguageSelectEnter: function () {
				this.hide();
				controls.menu.subMenu.parent = controls.menu.subtitles;
				controls.menu.subtitles.subMenu = controls.menu.subMenu.create("menu", controls.getLang('language'), controls.menu.subtitles.data.languages);
			},
			onSubtitlesOkPressed: function () {
				controls.menu.subtitles.settings.set();
				controls.menu.subtitles.destroy();
			},
			onSubtitlesCancelPressed: function () {
				controls.menu.subtitles.destroy();
			},
			destroy: function () {
				if (controls.menu.subtitles.subMenu) {
					controls.menu.subtitles.subMenu.destroy();
				}

				if (controls.menu.subtitles.dom) {
					clearTimeout(controls.menu.subtitles.autoCloseTimer);
					controls.menu.subtitles.autoCloseTimer = null;

					controls.menu.subtitles.data = null;
					document.body.removeChild(controls.menu.subtitles.dom);
					controls.menu.subtitles.dom = null;
					controls.element.playPauseButton.focus();
				}
			},
			show: function () {
				this.dom.style.visibility = "visible";
			},
			hide: function () {
				this.dom.style.visibility = "hidden";
				clearTimeout(controls.menu.subtitles.autoCloseTimer);
				controls.menu.subtitles.autoCloseTimer = null;
			}
		},
		createObject: function (id, name) {
			var menuObject = controls.createDOMElement(id, null, true);

			menuObject.innerHTML = name;

			return menuObject;
		},
		subMenu: {
			autoCloseTimer: null,
			dom: null,
			parent: null,
			options: [],
			parentOptions: null,
			create: function (id, title, options) {
				var i,
					option,
					menuOptions,
					selectedOption,
					items = options.length;

				this.options = options;

				this.dom = controls.createDOMElement(id);
				this.dom.innerHTML = title;
				menuOptions = controls.createDOMElement("options");
				this.dom.appendChild(menuOptions);
				for (i = 0; i < items; i++) {
					option = controls.createDOMElement(null, "option", true);
					option.innerHTML = controls.getLang(options[i].name);
					option.setAttribute('data-name', options[i].name);
					if (options[i].selected) {
						option.className += " selected";
						selectedOption = option;
					}
					menuOptions.appendChild(option);
				}
				document.body.appendChild(this.dom);
				selectedOption.focus();
				clearTimeout(controls.menu.subMenu.autoCloseTimer);
				controls.menu.subMenu.autoCloseTimer = setTimeout(controls.menu.subMenu.destroyMenus, controls.config.menuAutoCloseTime);
				return this;
			},
			destroyMenus: function () {
				controls.menu.subMenu.destroy();
				controls.menu.subMenu.parent.onSubtitlesCancelPressed();
			},
			destroy: function () {
				clearTimeout(controls.menu.subMenu.autoCloseTimer);
				controls.menu.subMenu.autoCloseTimer = null;

				document.body.removeChild(controls.menu.subMenu.dom);
				controls.menu.subMenu.dom = null;
				controls.menu.subMenu.options = [];

				controls.menu.subMenu.parent.subMenu = null;
				controls.menu.subMenu.parent.create();
				controls.menu.subMenu.parent.subtitlesOptions.focus();
			},
			onEnter: function () {
				controls.menu.subMenu.updateOptions();
				controls.menu.subMenu.destroy();
			},
			updateOptions: function () {
				var i,
					length = controls.menu.subMenu.options.length;

				for (i = 0; i < length; i++) {
					if (controls.menu.subMenu.options[i].selected) {
						delete controls.menu.subMenu.options[i].selected;
					}
					if (controls.menu.subMenu.options[i].name === controls.focusedElement.getAttribute('data-name')) {
						controls.menu.subMenu.options[i].selected = true;
					}
				}
			}
		}
	},
	getPlayerObject: function () {
		var objects,
			i,
			type;

		objects = document.getElementsByTagName('video');
		if (objects.length > 0) {
			this.unifyVideoObjectsAPI(objects[0], 'video');
		}
		objects = document.getElementsByTagName('object');
		if (objects.length > 0) {
			for (i = 0; i < objects.length; i++) {
				type = objects[i].type;
				if (type.indexOf("video") > -1 || type.indexOf("dash") > -1) {
					this.unifyVideoObjectsAPI(objects[i], 'object');
				}
			}
		}
	},
	getVideoName: function () {
		var pos,
			name,
			url;

		name = this.player.object.name || this.player.object.title || this.player.object.alt;

		if (name === "" || typeof name == "undefined") {
			url = this.player.object.src || this.player.object.data;
			pos = url.lastIndexOf("/");
			name = url.substr(pos + 1);
		}

		return name;
	},
	start: function () {
		this.progress.bar.width = parseInt(window.getComputedStyle(this.progress.bar.container).width, 10);
		this.disableButton(this.element.nextButton);
		this.element.playPauseButton.focus();
		this.isAppStarted = true;
		this.element.endTime.innerHTML = this.parseTime(this.player.getDuration());
	},
	isFocused: function (element) {
		return controls.focusedElement === element;
	},
	createDOMElement: function (id, className, tabIndex) {
		var element = document.createElement('div');

		if (id) {
			element.id = id;
		}
		if (className) {
			element.className = className;
		}
		if (tabIndex) {
			element.tabIndex = ++controls.tabIndex;
			element.addEventListener('focus', function () {
				controls.callback.onFocus(element);
			});
		}
		return element;
	},
	AVObjectPlayStateChangeEventHandler: function () {
		clearTimeout(controls.autoHideTimer);
		controls.autoHideTimer = setTimeout(controls.hide, controls.config.autoHideTime);

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
	remoteController: {
		activate: function () {
			this.keySet = app.privateData.keyset;
			this.keySet.setValue(this.keySet.VCR | this.keySet.NAVIGATION);

			document.addEventListener("keydown", function (e) {

				switch (e.keyCode) {
				case 461:
					controls.remoteController.press("return");
					break;
				case 415:
					controls.action.play();
					break;
				case 19:
					controls.action.pause();
					break;
				case 413:
					controls.action.stop();
					break;
				case 412:
					controls.action.rewind();
					break;
				case 417:
					controls.action.fastForward();
					break;
				case 13:
					controls.remoteController.press("enter");
					break;
				case 37:
					controls.remoteController.press("left", e);
					break;
				case 39:
					controls.remoteController.press("right", e);
					break;
				case 38:
					controls.remoteController.press("up");
					break;
				case 40:
					controls.remoteController.press("down");
					break;
				default:
					//console.log("keyCode not found "+e.keyCode);
					break;
				}
			}, false);
		},
		press: function (button, event) {
			controls.keyPressCleanout();

			switch (button) {
			case "return":
				if (controls.menu.subtitles.dom) {
					controls.menu.subtitles.destroy();
				} else if (controls.menu.settings.dom) {
					controls.menu.settings.destroy();
				} else if (!controls.isHidden) {
					controls.hide();
				} else {
					app.destroyApplication();
				}
				break;
			case "left":
				if (controls.menu.subtitles.dom || controls.menu.subMenu.dom) {
					return;
				}

				if (controls.isHidden) {
					controls.show();
				} else if (controls.isFocused(controls.menu.settings.dom)) {
					event.preventDefault();
				} else if (controls.isFocused(controls.progress.dot.dom)) {
					controls.progress.dot.moveLeft();
					event.preventDefault();
				}
				break;
			case "right":
				if (controls.menu.subtitles.dom || controls.menu.subMenu.dom) {
					return;
				}

				if (controls.isHidden) {
					controls.show();
				} else if (controls.isFocused(controls.progress.dot.dom)) {
					controls.progress.dot.moveRight();
					event.preventDefault();
				}
				break;
			case "up":
				if (controls.menu.subtitles.dom || controls.menu.subMenu.dom) {
					return;
				}

				if (controls.isHidden) {
					controls.show();
				} else if (controls.isFocused(controls.menu.settings.dom)) {
					controls.menu.settings.destroy();
				} else {
					if (controls.progress.dot.isActive) {
						controls.progress.dot.deactivate();
					}
					controls.element.playPauseButton.focus();
				}
				break;
			case "down":
				if (controls.menu.subtitles.dom || controls.menu.subMenu.dom || controls.menu.settings.dom) {
					return;
				}

				if (controls.isHidden) {
					controls.show();
				} else if (controls.playSpeed === 1 && controls.css.hasClass("playing", controls.dom)) {
					controls.progress.dot.dom.focus();
				}
				break;
			case "enter":
				if (controls.error) {
					app.destroyApplication();
				} else if (controls.menu.subMenu.dom) {
					controls.menu.subMenu.onEnter();
				} else if (controls.menu.subtitles.dom) {
					controls.callback.onEnterPress();
				} else if (controls.isHidden) {
					controls.show();
				} else if (controls.progress.dot.isActive) {
					controls.progress.dot.seekToPosition();
					controls.progress.dot.deactivate();
					controls.progress.dot.dom.focus();
				} else {
					controls.callback.onEnterPress();
				}
				break;
			}
		}
	},
	keyPressCleanout: function () {
		clearTimeout(controls.autoHideTimer);
		controls.autoHideTimer = setTimeout(controls.hide, controls.config.autoHideTime);

		if (controls.menu.subMenu.autoCloseTimer) {
			clearTimeout(controls.menu.subMenu.autoCloseTimer);
			controls.menu.subMenu.autoCloseTimer = setTimeout(controls.menu.subMenu.destroyMenus, controls.config.menuAutoCloseTime);
		}

		if (controls.menu.subtitles.autoCloseTimer) {
			clearTimeout(controls.menu.subtitles.autoCloseTimer);
			controls.menu.subtitles.autoCloseTimer = setTimeout(controls.menu.subtitles.onSubtitlesCancelPressed, controls.config.menuAutoCloseTime);
		}
	},

	action: {
		pause: function () {
			controls.keyPressCleanout();

			if (controls.player.getState() !== 2) {
				controls.player.play(0);
			} else {
				controls.player.seek(controls.player.getPosition() + 500);
			}
		},
		playPause: function () {
			var state = controls.player.getState();

			if (state === 1 && controls.playSpeed === 1) {// playing
				this.pause();
			} else if (state === 2 || (state === 1 && controls.playSpeed !== 1)) {// paused
				this.play();
			}
		},
		play: function () {
			controls.keyPressCleanout();

			controls.playSpeed = 1;
			controls.player.play(controls.playSpeed);
		},
		stop: function () {
			controls.player.stop();
		},
		previous: function () {
			controls.player.seek(0);
		},
		fastForward: function () {
			controls.keyPressCleanout();

			if (controls.playSpeed >= 1 || controls.playSpeed <= -1) {// current state is playing or fastForward or rewind
				controls.playSpeed = controls.getNextPlaySpeed('fastForward');
			} else {// current state is paused or slowRewind
				controls.playSpeed = controls.getNextPlaySpeed('slowPlay');
			}

			controls.dom.className = "fastforward";
			controls.element.statusModeIcon.className = ("speed" + controls.playSpeed).replace(".", "");
			controls.player.play(controls.playSpeed);
			controls.element.fastForwardButton.focus();
		},
		rewind: function () {
			controls.keyPressCleanout();

			if (controls.playSpeed >= 1 || controls.playSpeed <= -1) {// current state is playing, fastForward or rewind
				controls.playSpeed = controls.getNextPlaySpeed('rewind');
			} else {// current state is paused or slowPlay
				controls.playSpeed = controls.getNextPlaySpeed('slowRewind');
			}

			controls.dom.className = "rewind";
			controls.element.statusModeIcon.className = ("speed" + controls.playSpeed).replace(".", "");
			controls.player.play(controls.playSpeed);
			controls.element.rewindButton.focus();
		}
	},
	callback: {
		onLoading: function () {
			controls.player.state = 3;
			controls.element.loader.className = "visible";
		},
		onError: function () {
			controls.player.state = 6;
			controls.dom.removeChild(controls.element.panel);
			controls.dom.removeChild(controls.element.loader);

			controls.error = controls.createDOMElement('error');
			controls.error.innerHTML = controls.getLang('errorMessage');
			controls.errorButton = controls.createDOMElement('ok');
			controls.errorButton.innerHTML = controls.getLang('ok');
			controls.error.appendChild(controls.errorButton);
			controls.dom.appendChild(controls.error);
			controls.errorButton.focus();
		},
		onFinished: function () {
			app.destroyApplication();
		},
		onPause: function () {
			controls.player.state = 2;

			controls.playSpeed = 0;
			controls.element.playPauseButton.focus();
            if (!controls._subtitlesLoading) {
                controls.show();
            }
			controls.dom.className = "paused";
			controls.element.loader.className = "";
			controls.progress.timer.stop();
			clearTimeout(controls.autoHideTimer);
			controls.autoHideTimer = setTimeout(controls.hide, controls.config.autoHideTime);
		},
		onPlay: function () {
			var last_state = controls.player.state;

			controls.player.state = 1;
			controls.element.loader.className = "";

			if (!controls.playSpeed) {
				controls.playSpeed = controls.player.getSpeed();
			}

			if (!controls.isAppStarted) {
				controls.start();
                controls.show();
			}

			if (controls.progress.dot.isActive) {
				controls.progress.dot.deactivate();
			}

			if (controls.isFocused(controls.progress.dot.dom)) {
				controls.progress.dot.dom.focus();
			} else {
				if (controls.playSpeed === 1) {
					controls.element.playPauseButton.focus();
					controls.dom.className = "playing";
				}

				if (last_state !== 3) {
					controls.show();
				}
			}
            
            if (controls._subtitlesLoading) {
                controls.player.seek(controls.player._lastPosition);
                controls.show();
                controls._subtitlesLoading = false;
                controls.player._lastPosition = null;
            }
		},
		onStop: function () {
            if (controls._subtitlesLoading) {
                controls.player.play();
            } else {
                app.destroyApplication();
            }
		},
		onEnterPress: function () {
			if (!controls.focusedElement) {
				return;
			}

			if (!controls.css.hasClass("disabled", controls.focusedElement)) {
				switch (controls.focusedElement.id) {
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
				case "settingsbutton":
					controls.menu.settings.create();
					break;
				case "settingsmenu":
					controls.menu.settings.destroy();
					controls.hide();
					controls.menu.subtitles.create();
					break;
				case "subtitlesmenusubtitles":
					controls.menu.subtitles.onSubtitlesSelectEnter();
					break;
				case "subtitlesmenulanguage":
					controls.menu.subtitles.onLanguageSelectEnter();
					break;
				case "subtitlesmenuokbutton":
					controls.menu.subtitles.onSubtitlesOkPressed();
					break;
				case "subtitlesmenucancelbutton":
					controls.menu.subtitles.onSubtitlesCancelPressed();
					break;
				case "debugbutton":
					if (!controls.debug.isEnabled) {
						controls.debug.init();
					} else if (controls.debug.isHidden) {
						controls.debug.dom.style.display = "block";
						controls.debug.isHidden = false;
					} else {
						controls.debug.dom.style.display = "none";
						controls.debug.isHidden = true;
					}
					break;
				default:
					//console.log('element not found');
					break;
				}
			}
		},
		onFocus: function (element) {
			if (typeof element != "undefined") {
				controls.focusedElement = element;
			}
		}
	},
	show: function () {
		controls.menu.subtitles.destroy();
		controls.isHidden = false;
		controls.progress.update();
		controls.css.removeClass("hidden", controls.element.panel);
		clearTimeout(controls.autoHideTimer);
		controls.autoHideTimer = setTimeout(controls.hide, controls.config.autoHideTime);
		controls.progress.timer.start();
	},
	hide: function () {
		controls.isHidden = true;
		controls.css.addClass("hidden", controls.element.panel);
		clearTimeout(controls.autoHideTimer);

		clearTimeout(controls.progress.timer.autoStop);
		controls.progress.timer.autoStop = setTimeout(controls.progress.timer.stop, controls.config.autoHideTime);
		
        if (controls.menu.settings.dom) {
            controls.menu.settings.destroy();
        }
	},
	/**
	* get next play speed from controls.config.speed for specific specific speed type
	*/
	getNextPlaySpeed: function (speedType) {
		var i,
			speedTypeLength,
			nextPlaySpeed;

		speedTypeLength = this.config.speed[speedType].length;

		for (i = 0; i < speedTypeLength; i++) {
			if (this.playSpeed === this.config.speed[speedType][i]) {
				if (speedTypeLength > i + 1) {	// last speed not reached
					nextPlaySpeed = this.config.speed[speedType][i + 1];
				}
			}
		}

		return nextPlaySpeed || this.config.speed[speedType][0];
	},
	disableButton: function (element) {
		this.css.addClass("disabled", element);
	},
	enableButton: function (element) {
		this.css.removeClass("disabled", element);
	},
	parseTime: function (milisec) {
		var hour = "0",
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

		return hour + ":" + (min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec;
	},
	progress: {
		percent: 0,
		/**
		* method for updating playback progress related elements
		*/
		update: function () {
			controls.progress.percent = Math.floor(controls.player.getPosition() / controls.player.getDuration() * 10000) / 100;

			controls.progress.bar.update();
			controls.element.playTime.innerHTML = controls.parseTime(controls.player.getPosition());
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
			start: function () {
				this.stop();
				this.interval = setInterval(controls.progress.update, controls.config.progressBarRefreshTime);
			},
			stop: function () {
				clearTimeout(controls.progress.timer.autoStop);
				controls.progress.timer.autoStop = null;
				clearInterval(controls.progress.timer.interval);
				controls.progress.timer.interval = null;
			}
		},

		bar: {
			dom: null,
			container: null,
			width: 0,
			update: function () {
				this.dom.style.width = (controls.progress.percent * this.width / 100) + "px";
			}
		},

		/**
		* this is a Dot that is moving on progressBar, it can be focused
		*/
		dot: {
			dom: null,
			percent: 0,
			update: function () {
				this.dom.style.left = (controls.progress.percent * controls.progress.bar.width / 100) + "px";
			},
			/**
			* active state of progressDot is when progressDot is focused and then left/right arrow is pressed
			* active state means that Dot position is not updated with progressBar, it shows position where user can make seek after pressing Enter button
			*/
			isActive: false,
			activate: function () {
				if (!this.isActive) {
					this.isActive = true;
					controls.css.addClass("active", this.dom);

					this.percent = controls.progress.percent;
					this.dom.style.left = ((controls.progress.percent * controls.progress.bar.width) / 100) + "px";
				}
			},
			deactivate: function () {
				this.isActive = false;
				this.dom.className = "";
			},
			moveRight: function () {
				this.activate();

				this.percent += 1000 / (controls.player.getDuration() / 1000);
				if (this.percent > 100) {
					this.percent = 100;
				}
				this.dom.style.left = ((this.percent * controls.progress.bar.width) / 100) + "px";
			},
			moveLeft: function () {
				this.activate();

				this.percent -= 1000 / (controls.player.getDuration() / 1000);
				if (this.percent < 0) {
					this.percent = 0;
				}
				this.dom.style.left = ((this.percent * controls.progress.bar.width) / 100) + "px";
			},
			/**
			* makes seek to current position of progressDot
			*/
			seekToPosition: function () {
				controls.player.seek(this.percent / 100 * controls.player.getDuration());
			}
		}
	},

	debug: {
		dom: null,
		isEnabled: false,
		isHidden: true,
		interval: null,
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
		
		onAVObjectPlayPositionChanged: function () {
			controls.debug.playPosition.innerHTML = "playPosition = '" + controls.player.getPosition() + "' (" + controls.parseTime(controls.player.getPosition()) + ")";
		},
		
		onVideoObjectPlayPositionChanged: function () {
			controls.debug.playPosition.innerHTML = "currentTime = '" + controls.player.getPosition() + "' (" + controls.parseTime(controls.player.getPosition()) + ")";
		},
		
		onAVObjectPlaySpeedChanged: function () {
			controls.debug.playSpeed.innerHTML = "playSpeed = '" + controls.player.getSpeed() + "'";
		},
		
		onVideoObjectPlaySpeedChanged: function () {
			controls.debug.playSpeed.innerHTML = "playbackRate = '" + controls.player.getSpeed() + "'";
		},
		
		onKeyPress: function (e) {
			var keyName,
				keyCode;

			switch (e.keyCode) {
				case 415:
					keyName = "Play";
					break; 
				case 19:
					keyName = "Pause";
					break; 
				case 413:
					keyName = "Stop";
					break; 
				case 412:
					keyName = "Rewind";
					break; 
				case 417:
					keyName = "FastForward";
					break; 
				case 37:
					keyName = "Left arrow";
					break; 
				case 39:
					keyName = "Right arrow";
					break; 
				case 13:
					keyName = "Enter";
					break; 
				case 38:
					keyName = "Up arrow";
					break; 
				case 40:
					keyName = "Down arrow";
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
					break;
			}
			
			if (keyName) {
				controls.debug.keyPress.innerHTML = "last pressed key was '" + keyName + "'";
			} else {
				controls.debug.keyPress.innerHTML = "last pressed key has keyCode = '" + keyCode + "'";
			}
		},

		init: function(){
			var debugFragment;
			
			controls.css.addFile("controls-debug");
			
			debugFragment = document.createDocumentFragment();
			controls.debug.dom = controls.createDOMElement('debug');
				controls.debug.console = controls.createDOMElement('debugconsole');
					controls.debug.dom.appendChild(controls.debug.console);
				controls.debug.playState = controls.createDOMElement('debugplaystate');
					controls.debug.dom.appendChild(controls.debug.playState);
				controls.debug.playSpeed = controls.createDOMElement('debugplayspeed');
					controls.debug.dom.appendChild(controls.debug.playSpeed);
				controls.debug.playTime = controls.createDOMElement('debugplaytime');
					controls.debug.dom.appendChild(controls.debug.playTime);
				controls.debug.playPosition = controls.createDOMElement('debugplayposition');
					controls.debug.dom.appendChild(controls.debug.playPosition);
				controls.debug.keyPress = controls.createDOMElement('debugkeypress');
					controls.debug.dom.appendChild(controls.debug.keyPress);
				controls.debug.helpBar = controls.createDOMElement('debughelpbar');
					controls.debug.helpGreen = controls.createDOMElement('debughelpgreen');
						controls.debug.helpBar.appendChild(controls.debug.helpGreen);
					controls.debug.helpYellow = controls.createDOMElement('debughelpyellow');
						controls.debug.helpBar.appendChild(controls.debug.helpYellow);
					controls.debug.helpBlue = controls.createDOMElement('debughelpblue');
						controls.debug.helpBar.appendChild(controls.debug.helpBlue);
					controls.debug.dom.appendChild(controls.debug.helpBar);
			debugFragment.appendChild(controls.debug.dom);

			controls.dom.appendChild(debugFragment);

			document.addEventListener('keypress', controls.debug.onKeyPress);

			console.log = function (log) {
				controls.debug.print('log', log);
			}
			console.warn = function (log) {
				controls.debug.print('warn', log);
			}
			console.error = function (log) {
				controls.debug.print('error', log);
			}
			console.debug = function (log) {
				controls.debug.print('debug', log);
			}

			if (controls.player.type === "video") {
				controls.debug.initVideoObject();
			} else {
				controls.debug.initAVObject();
				controls.keySet = app.privateData.keyset;
				controls.keySet.setValue(controls.keySet.VCR | controls.keySet.NAVIGATION | controls.keySet.GREEN | controls.keySet.YELLOW | controls.keySet.BLUE);
			}
			controls.debug.isEnabled = true;
			controls.debug.isHidden = false;
		},
		
		initAVObject: function () {
			controls.player.object.addEventListener('PlayStateChange', controls.debug.onPlayStateChange);
			controls.player.object.addEventListener('PlayPositionChanged', controls.debug.onAVObjectPlayPositionChanged);
			controls.player.object.addEventListener('PlaySpeedChanged', controls.debug.onAVObjectPlaySpeedChanged);
			controls.debug.onPlayStateChange();
			controls.debug.onAVObjectPlayPositionChanged();
			controls.debug.onAVObjectPlaySpeedChanged();
			controls.debug.interval = setInterval(controls.debug.onAVObjectPlayPositionChanged, controls.config.progressBarRefreshTime);

		},
		
		initVideoObject: function () {
			controls.player.object.addEventListener('playing', controls.debug.onPlayStateChange);
			controls.player.object.addEventListener('pause', controls.debug.onPlayStateChange);
			controls.player.object.addEventListener('waiting', controls.debug.onPlayStateChange);
			controls.player.object.addEventListener('ended', controls.debug.onPlayStateChange);
			controls.player.object.addEventListener('error', controls.debug.onPlayStateChange);
			controls.player.object.addEventListener('timeupdate', controls.debug.onVideoObjectPlayPositionChanged);
			controls.player.object.addEventListener('ratechange', controls.debug.onVideoObjectPlaySpeedChanged);
		},
		
		print: function (type, txt) {
			var date,
				log = document.createElement('div');
				
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
			log.innerHTML = date.getMinutes() + ":" + date.getSeconds() + "." + date.getMilliseconds() + " - " +txt;
			controls.debug.console.appendChild(log);
			controls.debug.console.scrollTop = controls.debug.console.scrollHeight;
		},
		
		clearLogs: function () {
			controls.debug.console.innerHTML = "";
		},

		scrollUp: function () {
			controls.debug.console.scrollTop -= 21;
		},

		scrollDown: function () {
			controls.debug.console.scrollTop += 21;
		}
	}
};