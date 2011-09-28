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
	var chatter = new Chatter.Chatter(this);
	var gui = new GameMasterGui.GameMasterGui(this);

	var gameInfo = null;
	this.getGameInfo = function() {
		return gameInfo;
	};
	this.getGame = function() {
		if(!games || !gameInfo) {
			return null;
		}
		return games[gameInfo.gameName];
	};
	now.handleGameInfo = function(gameInfo_) {
		StatusBar.setError('handleGameInfo', null);
		// gameInfo should have a gameName attribute and an inspectionSeconds attribute
		gameInfo = gameInfo_;
		assert(gameInfo.gameName in games, gameInfo.gameName + " not found in " + Object.keys(games));
		gui.handleGameInfo();
	};

	var randomState = null;
	this.getRandomState = function() {
		return randomState;
	};
	now.handleRandomState = function(randomState_) {
		randomState = randomState_;
		gui.handleRandomState();
	};

	var members = null;
	this.getChannelMembers = function() {
		return members;
	};
	var myself = null;
	this.getMyself = function() {
		return myself;
	};
	this.getMyNick = function() {
		if(!myself) {
			return null;
		}
		return myself.nick;
	};
	this.getChannelName = function() {
		if(!myself) {
			return null;
		}
		return myself.channel.channelName;
	};
	this.isConnected = function() {
		return myself && that.getGame();
	};
	now.handleChannelMembers = function(members_) {
		members = members_;
		var clientId = now.core.clientId;
		if(clientId in members.clientId_user) {
			StatusBar.setError('handleChannelMembers', null);
			myself = members.clientId_user[clientId];
			gui.connectionChanged();
		} else {
			StatusBar.setError('handleChannelMembers', "Couldn't find " + clientId + " in " + Object.keys(members_.clientId_user));
			myself = null;
			members = null;
			gui.connectionChanged();
			return;
		}

		if(myself.admin) {
			// Whenever someone joins the channel, we spam
			// everyone with the game info.
			that.sendGameInfo();
		}

		// we can't create the games until we know what game we're playing
		if(!that.getGame()) {
			return;
		}

		gui.handleChannelMembers();
	};

	now.handleMoveState = function(nick, moveState, timestamp, startstamp) {
		gui.handleMoveState(nick, moveState, timestamp, startstamp);
	};

	now.handleMessages = function(messages, initialConnect) {
		if(initialConnect) {
			chatter.clear();
		}
		for(var i = 0; i < messages.length; i++) {
			chatter.addMessage(messages[i]);
		}
	};

	this.sendMessage = function(msg) {
		now.sendMessage(msg);
	};

	this.sendGameInfo = function() {
		assert(myself);
		assert(myself.admin);
		var gameInfo = gui.getGameInfo();
		now.sendGameInfo(gameInfo, errorHandler('sendGameInfo'));
	};

	this.sendRandomState = function(scramble) {
		assert(myself);
		assert(myself.admin);
		now.sendRandomState(scramble, errorHandler('sendRandomState'));
	};

	this.sendMoveState = function(moveState, startstamp) {
		var timestamp = new Date().getTime();
		now.sendMoveState(moveState, timestamp, startstamp, errorHandler('sendMoveState'));
	};

	this.joinChannel = function(nick_, channelName_) {
		var desiredNick = nick_ || that.getMyNick() || "Pimp";
		var desiredChannelName = channelName_ || that.getChannelName() || "PimpsAtSea";
		if(desiredNick == that.getMyNick() && desiredChannelName == that.getChannelName()) {
			StatusBar.setError('joinChannel', null)
			StatusBar.setError('handleGameInfo', null)
			StatusBar.setError('handleChannelMembers', null);
			return;
		}

		StatusBar.setError('joinChannel', 'Joining channel #' + desiredChannelName + ' as ' + desiredNick);
		StatusBar.setError('handleGameInfo', 'Waiting...');
		StatusBar.setError('handleChannelMembers', 'Waiting...');
		now.joinChannel(desiredNick, desiredChannelName, function(error, nick_, channelName_) {
			gui.connectionChanged();
			if(!error) {
				StatusBar.setError('joinChannel', null);
			} else if(error == GM.NICK_IN_USE) {
				var prefix_intSuffix = desiredNick.match(/([^\d]*)(\d*)/);
				var prefix = prefix_intSuffix[1];
				var suffix = prefix_intSuffix[2];
				var newSuffix = null;
				if(suffix == '') {
					newSuffix = '1';
				} else {
					newSuffix = 1 + parseInt(suffix, 10);
				}
				var newDesiredNick = prefix + newSuffix;
				StatusBar.setError('joinChannel', desiredNick + ' in use, attempting ' + newDesiredNick);
				that.joinChannel(newDesiredNick, desiredChannelName);
			} else {
				assert(false, "Unrecognized error " + error);
			}
		});
	};

	function errorHandler(errorType) {
		return function(error) {
			// TODO - retrieve nick from server & update gui?
			// TODO - disable gui?
			if(error) {
				StatusBar.setError(errorType, error);
			} else {
				StatusBar.setError(errorType, null);
			}
		};
	};

	var that = this;
};

})();
