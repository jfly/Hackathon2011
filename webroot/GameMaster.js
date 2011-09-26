var GameMaster = {};

(function() {

var games = {};
GameMaster.getGames = function() {
	return games;
};
GameMaster.addGame = function(game) {
	assert(!(game.gameName in games));

	games[game.gameName] = game;
};
GameMaster.GameMaster = function() {
	// TODO - it might be cleaner if there was a clear divide between server
	// communication & gui stuff

	var gamesDiv;
	var inspectionCountdownDiv;
	// TODO - could the admin configure inspection time?
	var adminInfoDiv;
	var gameDropdown;
	var scrambleButton;
	var inspectionSecondsField;
	var myself;
	function refreshAdminInfo() {
		assert(myself);
		if(myself.admin) {
			gameDropdown.disabled = false;	
			inspectionSecondsField.disabled = false;	
			$(scrambleButton).show();
		} else {
			gameDropdown.disabled = true;	
			inspectionSecondsField.disabled = true;	
			$(scrambleButton).hide();
		}
		gameDropdown.value = gameInfo.gameName;
		inspectionSecondsField.value = gameInfo.inspectionSeconds;
	}
	function refreshBoards() {
		// cleaning up old games
		for(var memberName in gameInstances) {
			var gameInstance = gameInstances[memberName];
			if(!(memberName in members) || gameInstance.game.getName() != gameInfo.gameName) {
				// This game instance is either the wrong type of game, or is for a member
				// who has left, so we can delete it.
				gamesDiv.removeChild(gameInstance.div);
				delete gameInstances[memberName];
			}
		}
		// creating new games
		for(var memberName in members) {
			if(memberName in gameInstances) {
				assert(gameInstances[memberName].game.getName() == gameInfo.gameName);
			} else {
				var babyGame = new game(moveApplied);
				var babbyDiv = babyGame.getDiv();
				var containerDiv = document.createElement('div');
				containerDiv.appendChild(babbyDiv);
				var nameDiv = document.createElement('div');
				nameDiv.appendChild(document.createTextNode(memberName));
				containerDiv.appendChild(nameDiv);
				gameInstances[memberName] = { game: babyGame, div: containerDiv, nameDiv: nameDiv };
				gamesDiv.appendChild(containerDiv);
			}
			var nameDiv = $(gameInstances[memberName].nameDiv);
			if(members[memberName].admin) {
				nameDiv.removeClass('nonAdminname');
				nameDiv.addClass('adminName');
			} else {
				nameDiv.addClass('nonAdminname');
				nameDiv.removeClass('adminName');
			}
		}
	}

	this.render = function(element) {
		element.appendChild(adminInfoDiv);
		element.appendChild(gamesDiv);
		element.appendChild(inspectionCountdownDiv);
	};
	gamesDiv = document.createElement('div');
	inspectionCountdownDiv = document.createElement('div');
	inspectionCountdownDiv.id = 'inspection';
	adminInfoDiv = document.createElement('div');

	gameDropdown = document.createElement('select');
	for(var gameName in games) {
		var game = games[gameName];
		var option = document.createElement('option');
		option.value = gameName;
		option.appendChild(document.createTextNode(gameName));
		gameDropdown.appendChild(option);
	}
	gameDropdown.addEventListener('change', function(e) {
		gameSelected(gameDropdown.value);
	}, false);
	adminInfoDiv.appendChild(gameDropdown);

	inspectionSecondsField = document.createElement('input');
	inspectionSecondsField.type = 'number';
	inspectionSecondsField.min = 0;
	inspectionSecondsField.value = '15'; // TODO - where should this go?
	inspectionSecondsField.value = '2'; // TODO - where should this go?
	inspectionSecondsField.addEventListener('change', function(e) {
		gameInfo.inspectionSeconds = inspectionSecondsField.value;
		now.handleGameInfo(gameInfo); // TODO -this should be done by the server!
	}, false);
	$(inspectionSecondsField).change(function() {
		that.sendGameInfo();
	});
	adminInfoDiv.appendChild(inspectionSecondsField);

	scrambleButton = document.createElement('input');
	scrambleButton.value = 'Scramble!';
	scrambleButton.type = 'button';
	scrambleButton.addEventListener('click', function(e) {
		// TODO - what if they click on scramble before we've generated boards?
		var scramble = gameInstances[username].game.generateScramble();
		that.sendScramble(scramble);
	}, false);
	adminInfoDiv.appendChild(scrambleButton);

	function gameSelected(gameName) {
		assert(gameName in games);

		var game = games[gameName];
		gameInfo.gameName = gameName;
		that.sendGameInfo();
	}

	var startstamp = 0;
	function refreshInspection() {
		$(inspectionCountdownDiv).show();
		var secondsUsed = parseInt((new Date().getTime() - inspectionStart)/1000);
		var timeRemaining = gameInfo.inspectionSeconds - secondsUsed;
		$(inspectionCountdownDiv).text(timeRemaining);
		var topCoord = $(window).height()/2 - $(inspectionCountdownDiv).height()/2;
		var leftCoord = $(window).width()/2 - $(inspectionCountdownDiv).width()/2;
		$(inspectionCountdownDiv).offset({top:topCoord, left:leftCoord});
		if (timeRemaining > 0) {
			setTimeout(refreshInspection, 100);
		} else {
			startstamp = new Date().getTime();
			$(inspectionCountdownDiv).hide();
			gameInstances[username].game.endInspection();
		}
	}

	function moveApplied(m) {
		that.sendMove(m);
	}

	// Stuff the admin sets
	var gameInfo = {};
	var game;
	now.handleGameInfo = function(gameInfo_) {
		// gameInfo should have a gameName attribute and an inspectionSeconds attribute
		gameInfo = gameInfo_;
		assert(gameInfo.gameName in games);
		game = games[gameInfo.gameName];
		refreshAdminInfo();
		refreshBoards();
	};
	var inspectionStart;
	now.handleScramble = function(scramble) {
		for(var memberName in gameInstances) {
			gameInstances[memberName].game.setScramble(scramble);
		}
		inspectionStart = new Date().getTime();
		refreshInspection();
	};

	// Stuff anyone sets
	var gameInstances = {};
	var members;
	now.handleChannelMembers = function(members_) {
		members = members_;
		if(username in members) {
			connected = true;
			document.title = username + "@" + channel;
		} else {
			connected = false;
			document.title = "unconnected";
			// TODO - periodic retry?
			// how do you catch nowjs timeouts?
			return;
		}
		myself = members[username];

		if(myself.admin) {
			// Whenever someone joins the channel, we spam
			// everyone with the game info.
			that.sendGameInfo();
		}

		// we can't create the games until we know what game we're playing
		var game = games[gameInfo.gameName];
		if(!game) {
			return;
		}

		refreshBoards();
		refreshAdminInfo();
	};

	now.handleMove = function(nick, move, timestamp, startstamp) {
		var gameInstance = gameInstances[nick];
		assert(gameInstance);
		if(nick != username) {
			gameInstance.game.applyMove(move);
		}
		if(gameInstance.game.isFinished()) {
			var totalTime = (timestamp - startstamp)/1000;
			$(gameInstance.nameDiv).text(nick + " " + totalTime.toFixed(2) + " seconds");
		}
	};

	now.handleChat = function(nick, msg) {
		console.log(msg);
	};

	// TODO - consolidate error checking!
	this.sendGameInfo = function() {
		var gameInfo = { gameName: gameDropdown.value, inspectionSeconds: parseInt(inspectionSecondsField.value, 10) };
		now.setGameInfo(username, gameInfo, function(error) {
			if(error) {
				console.log(error);
			}
		});
	};

	this.sendScramble = function(scramble) {
		now.sendScramble(username, scramble, function(error) {
			if(error) {
				console.log(error);
			}
		});
	};

	this.sendMove = function(move) {
		var timestamp = new Date().getTime();
		now.sendMove(username, move, timestamp, startstamp, function(error) {
			if(error) {
				console.log(error);
			}
		});
	};

	var username, channel;
	var connected = false;
	function setConnected(connected_) {
		connected = connected_;
	}
	this.connect = function(username_, channel_) {
		username = username_;
		channel = channel_;
		document.title = 'Connecting to ' + channel + '...';
		now.joinChannel(username, channel, function(error) {
			if(error) {
				alert(error);
			}
		});
	};


	var that = this;
};

})();
