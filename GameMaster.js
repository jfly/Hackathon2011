(function() {

var CHANNEL = "PimpsAtSea"; // TODO - configurable later on
var USERNAME = prompt('Username?'); // TODO - configurable, don't allow duplicates!
document.title = USERNAME + "@" + CHANNEL;
//var USERNAME = 'PimpAtSea';

var GameMaster = new function() {
	var games = {};
	this.getGames = function() {
		return games;
	};
	this.addGame = function(game) {
		assert(!(game.gameName in games));

		games[game.gameName] = game;
	};

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

	this.render = function(element) {
		gamesDiv = document.createElement('div');
		inspectionCountdownDiv = document.createElement('div');
		inspectionCountdownDiv.id = 'inspection';
		adminInfoDiv = document.createElement('div');
		element.appendChild(adminInfoDiv);
		element.appendChild(gamesDiv);
		element.appendChild(inspectionCountdownDiv);

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
		});
		adminInfoDiv.appendChild(gameDropdown);

		inspectionSecondsField = document.createElement('input');
		inspectionSecondsField.type = 'number';
		inspectionSecondsField.min = 0;
		inspectionSecondsField.value = '15'; // TODO - where should this go?
		inspectionSecondsField.value = '2'; // TODO - where should this go?
		inspectionSecondsField.addEventListener('change', function(e) {
			gameInfo.inspectionSeconds = inspectionSecondsField.value;
			that.handleGameInfo(gameInfo); // TODO -this should be done by the server!
		});
		adminInfoDiv.appendChild(inspectionSecondsField);

		scrambleButton = document.createElement('input');
		scrambleButton.value = 'Scramble!';
		scrambleButton.type = 'button';
		scrambleButton.addEventListener('click', function(e) {
			var scramble = gameInstances[USERNAME].game.generateScramble();
			GameClient.sendScramble(scramble);
		});
		adminInfoDiv.appendChild(scrambleButton);

		// TODO - is this the best place for this?
		gameInfo = { gameName: gameDropdown.value, inspectionSeconds: parseInt(inspectionSecondsField.value, 10) };
	};

	function gameSelected(gameName) {
		assert(gameName in games);

		var game = games[gameName];
		gameInfo.gameName = gameName;
		//that.handleGameInfo(gameInfo); // TODO - should this be done by the server?
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
			gameInstances[USERNAME].game.endInspection();
		}
	}

	function moveApplied(m) {
		GameClient.sendMove(m, startstamp);
	}

	// Stuff the admin sets
	var gameInfo;
	var game;
	this.handleGameInfo = function(gameInfo_) {
		// gameInfo should have a gameName attribute and an inspectionSeconds attribute
		gameInfo = gameInfo_;
		assert(gameInfo.gameName in games);
		game = games[gameInfo.gameName];
		refreshAdminInfo();
		// TODO - members is not of the correct type here...
		this.handleChannelMembers(members);
	};
	var inspectionStart;
	this.handleScramble = function(scramble) {
		for(var memberName in gameInstances) {
			gameInstances[memberName].game.setScramble(scramble);
		}
		inspectionStart = new Date().getTime();
		refreshInspection();
	};

	// Stuff anyone sets
	var gameInstances = {};
	var members;
	this.handleChannelMembers = function(members_) {
		// TODO - make server return dict instead of array here!
		var members = {};
		for(var i = 0; i < members_.length; i++) {
			var member = members_[i];
			members[member.nick] = member;
		}

		assert(USERNAME in members);
		myself = members[USERNAME];

		// we can't create the games until we know what game we're playing
		var game = games[gameInfo.gameName];
		if(!game) {
			if(myself.admin) {
				gameSelected(gameDropdown.value);
				game = games[gameInfo.gameName];
				assert(game);
			} else {
				return;
			}
		}

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
		refreshAdminInfo();
	};
	
	this.handleMove = function(msg) {
		assert(msg.nick in gameInstances);
		var gameInstance = gameInstances[msg.nick];
		var startstamp = msg.data.startstamp;
		if(msg.nick != USERNAME) {
			gameInstance.game.applyMove(msg.data.move);
		}
		if(gameInstance.game.isFinished()) {
			var totalTime = (msg.timestamp - startstamp)/1000;
			$(gameInstance.nameDiv).text(msg.nick + " " + totalTime.toFixed(2) + " seconds");
		}
	};

	this.handleChat = function(msg) {
	};

	this.handleMessage = function(msg) {
		if(!msg || !msg.type) {
			// The server periodically closes the long poll, we don't want to die if
			// it does.
			return;
		}

		switch(msg.type) {
			case "members":
				that.handleChannelMembers(msg.data);
				break;
			case "scramble":
				that.handleScramble(msg.data);
				break;
			case "move":
				// TODO - yuck, should handleXXX() take a msg, rather than msg.data?
				that.handleMove(msg);
				break;
			default:
				console.log(msg);
		}
	};

	var that = this;
};

var GameClient = new function() {
	var SERVER_URL = "";
	
	function sendMessage(url, data, handler) {
		data.nick = USERNAME;
		data.channel = CHANNEL;
		data.timestamp = new Date().getTime();
		data.since = 0; // TODO - this ain't right...
		//console.log('sending: ' + JSON.stringify(data));
		$.ajax({ cache: false
			   , beforeSend: function(xhr) {
				   //console.log(xhr);
			   }
			   , type: "GET"
			   , dataType: "json"
			   , url: SERVER_URL + url
			   , data: data
			   , error: function(e) {
					console.log(e);
				   alert("error connecting to server");
				 }
			   , success: handler
			   });
	}
	// join server!
	sendMessage('/join', {}, GameMaster.handleMessage);

	this.sendScramble = function(scramble) {
		sendMessage('/send', { type: 'scramble', data: JSON.stringify(scramble) }, function(message) {
			//console.log("!!!" + message);
		});
	};

	this.sendMove = function(move, startstamp) {
		var data = { type: 'move', data: JSON.stringify({ move: move, startstamp: startstamp }) };
		sendMessage('/send', data, function(message) {
			//console.log(message);
		});
	};

	function longPoll(messages) {
		if(messages) {
			// TODO - handle multiple messages
			GameMaster.handleMessage(messages[0]);
		}
		sendMessage('/recv', {}, longPoll);
	}
	longPoll();
};

window.GameMaster = GameMaster;

})();
