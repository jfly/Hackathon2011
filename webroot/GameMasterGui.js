var GameMasterGui = {};

DEFAULT_INSPECTION = 15;
(function() {

	GameMasterGui.GameMasterGui = function(gameMaster) {
		var gamesDiv;
		var inspectionCountdownDiv;
		var infoDiv;
		var gameDropdown;
		var scrambleButton;
		var inspectionSecondsField;
		gamesDiv = document.createElement('div');
		inspectionCountdownDiv = document.createElement('div');
		inspectionCountdownDiv.id = 'inspection';
		infoDiv = document.createElement('div');

		gameDropdown = document.createElement('select');
		var games = GameMaster.getGames();
		for(var gameName in games) {
			var game = games[gameName];
			var option = document.createElement('option');
			option.value = gameName;
			option.appendChild(document.createTextNode(gameName));
			gameDropdown.appendChild(option);
		}

		gameDropdown.addEventListener('change', function(e) {
			gameMaster.sendGameInfo();
		});
		infoDiv.appendChild(gameDropdown);

		inspectionSecondsField = document.createElement('input');
		inspectionSecondsField.type = 'number';
		inspectionSecondsField.min = 0;
		inspectionSecondsField.value = '' + DEFAULT_INSPECTION;
		$(inspectionSecondsField).change(function() {
			gameMaster.sendGameInfo();
		});
		infoDiv.appendChild(inspectionSecondsField);

		scrambleButton = document.createElement('input');
		scrambleButton.value = 'Scramble!';
		scrambleButton.type = 'button';
		scrambleButton.addEventListener('click', function(e) {
			// TODO - what if they click scramble before we've generated boards?
			var scramble = gameMaster.getGame().generateScramble();
			gameMaster.sendScramble(scramble);
		});
		infoDiv.appendChild(scrambleButton);

		document.body.appendChild(infoDiv);
		document.body.appendChild(gamesDiv);
		document.body.appendChild(inspectionCountdownDiv);

		function refreshInfo() {
			if(gameMaster.getMyself().admin) {
				gameDropdown.disabled = false;	
				inspectionSecondsField.disabled = false;	
				$(scrambleButton).show();
			} else {
				gameDropdown.disabled = true;	
				inspectionSecondsField.disabled = true;	
				$(scrambleButton).hide();
			}
			var gameInfo = gameMaster.getGameInfo();
			gameDropdown.value = gameInfo.gameName;
			inspectionSecondsField.value = gameInfo.inspectionSeconds;
		}
		var gameBoards = {};
		function refreshBoards() {
			// cleaning up old games
			var gameInfo = gameMaster.getGameInfo();
			var game = gameMaster.getGame();
			var members = gameMaster.getChannelMembers();
			for(var memberName in gameBoards) {
				var gameBoard = gameBoards[memberName]
				if(!(memberName in members) || gameBoard.gameInstance.getName() != gameInfo.gameName) {
					// This game instance is either the wrong type of game, or is for a member
					// who has left, so we can delete it.
					gamesDiv.removeChild(gameBoard.div);
					delete gameBoards[memberName];
				}
			}
			// creating new games
			for(var memberName in members) {
				if(memberName in gameBoards) {
					assert(gameBoards[memberName].gameInstance.getName() == gameInfo.gameName);
				} else {
					var gameInstance = new game(moveApplied);
					var babbyDiv = gameInstance.getDiv();
					var containerDiv = document.createElement('div');
					containerDiv.appendChild(babbyDiv);
					var nameDiv = document.createElement('div');
					nameDiv.appendChild(document.createTextNode(memberName));
					containerDiv.appendChild(nameDiv);
					gameBoards[memberName] = { gameInstance: gameInstance, div: containerDiv, nameDiv: nameDiv };
					gamesDiv.appendChild(containerDiv);
				}
				var nameDiv = $(gameBoards[memberName].nameDiv);
				if(members[memberName].admin) {
					nameDiv.removeClass('nonAdminname');
					nameDiv.addClass('adminName');
				} else {
					nameDiv.addClass('nonAdminname');
					nameDiv.removeClass('adminName');
				}
			}
		}
		function moveApplied(move) {
			gameMaster.sendMove(move, startstamp);
		}

		var inspectionStart;
		function startInspection() {
			inspectionStart = new Date().getTime();
			refreshInspection();
		}
		var startstamp = 0;
		function refreshInspection() {
			$(inspectionCountdownDiv).show();
			var secondsUsed = parseInt((new Date().getTime() - inspectionStart)/1000);
			var gameInfo = gameMaster.getGameInfo();
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
				var myGameInstance = gameBoards[gameMaster.getMyself().nick].gameInstance;
				myGameInstance.endInspection();
			}
		}

		this.handleGameInfo = function() {
			refreshInfo();
			refreshBoards();
		};
		this.getGameInfo = function() {
			var gameName = gameDropdown.value;
			var inspectionSeconds = parseInt(inspectionSecondsField.value, 10);
			return { gameName: gameName, inspectionSeconds: inspectionSeconds };
		};

		this.handleChannelMembers = function() {
			refreshBoards();
		};

		this.handleScramble = function() {
			var scramble = gameMaster.getScramble();
			for(var memberName in gameBoards) {
				gameBoards[memberName].gameInstance.setScramble(scramble);
			}
			startInspection();
		};

		this.handleMove = function(nick, move, timestamp, startstamp) {
			// TODO - this doesn't handle the case where someone appears in a channel midway through a solve
			var gameBoard = gameBoards[nick];
			assert(gameBoard, nick + " doesn't appear in " + Object.keys(gameBoards));
			var gameInstance = gameBoard.gameInstance;
			assert(gameInstance);
			if(nick != gameMaster.getMyself().nick) {
				gameInstance.applyMove(move);
			}
			if(gameInstance.isFinished()) {
				var totalTime = (timestamp - startstamp)/1000;
				$(gameBoard.nameDiv).text(nick + " " + totalTime.toFixed(2) + " seconds");
			}
		};

		this.handleChat = function(nick, msg) {
			console.log(nick, msg);
		};


		gameMaster.setGui(this);
		var that = this;
	};

})();
