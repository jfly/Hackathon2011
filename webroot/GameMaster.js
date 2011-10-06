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
	var gui = new GameMasterGui.GameMasterGui(this);
	var chatter = new Chatter.Chatter(this);
	var vertSplit = new Split.VerticalSplit(gui.element, chatter.element);
	$('body').append(vertSplit.element);

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

	var clientId_user = null;
	this.getChannelMembers = function() {
		return clientId_user;
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
	now.handleChannelMembers = function(clientId_user_) {
		clientId_user = clientId_user_;
		var clientId = now.core.clientId;
		if(clientId in clientId_user) {
			StatusBar.setError('handleChannelMembers', null);
			myself = clientId_user[clientId];
			gui.connectionChanged();
		} else {
			StatusBar.setError('handleChannelMembers', "Couldn't find " + clientId + " in " + Object.keys(clientId_user));
			myself = null;
			clientId_user = null;
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
	now.handleMemberJoin = function(member, clientId_user_) {
		chatter.addMessage({text: member.nick + " in da house."});
		now.handleChannelMembers(clientId_user_);
	};
	now.handleMemberPart = function(member, clientId_user_) {
		chatter.addMessage({text: member.nick + " has left the building."});
		now.handleChannelMembers(clientId_user_);
	};
	now.handleMemberRename = function(member, clientId_user_) {
		var oldNick = clientId_user[member.clientId].nick;
		var newNick = member.nick;
		chatter.addMessage({text: oldNick + " renamed to " + newNick + "."});
		now.handleChannelMembers(clientId_user_);
	};
	now.handleAdmin = function(member, clientId_user_) {
		chatter.addMessage({text: member.nick + " is now admin, bow to your new overlord."});
		now.handleChannelMembers(clientId_user_);
	};

	now.handleMoveState = function(nick, moveState, timestamp, startstamp) {
		gui.handleMoveState(nick, moveState, timestamp, startstamp);
	};

	now.handleMessages = function(messages) {
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
			StatusBar.setError('joinChannel', null);
			StatusBar.setError('andleGameInfo', null);
			StatusBar.setError('handleChannelMembers', null);
			return;
		}

		var renameAttempt = desiredChannelName == that.getChannelName();

		var joinAttemptMessage = null;
		if(renameAttempt) {
			//joinAttemptMessage = 'Renaming to new nick ' + desiredNick + '.';
		} else {
			chatter.clear();
			joinAttemptMessage = 'Joining channel #' + desiredChannelName + ' as ' + desiredNick + '.';
			chatter.addMessage({text: joinAttemptMessage});
		}
		StatusBar.setError('joinChannel', joinAttemptMessage);
		StatusBar.setError('handleGameInfo', 'Waiting...');
		StatusBar.setError('handleChannelMembers', 'Waiting...');
		now.joinChannel(desiredNick, desiredChannelName, function(error, nick_, channelName_) {
			gui.connectionChanged();
			if(!error) {
				if(!renameAttempt) {
					chatter.addMessage({text: 'Welcome to #' + channelName_ + "."});
				}
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
				var retryMessage = 'Nick ' + desiredNick + ' in use, attempting ' + newDesiredNick + '.'
				chatter.addMessage({text: retryMessage});
				StatusBar.setError('joinChannel', retryMessage);
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
