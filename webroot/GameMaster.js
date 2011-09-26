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

	var gui = null;
	this.setGui = function(gui_) {
		gui = gui_;
	};

	var gameInfo = {};
	this.getGameInfo = function() {
		return gameInfo;
	};
	this.getGame = function() {
		return games[gameInfo.gameName];
	};
	now.handleGameInfo = function(gameInfo_) {
		// gameInfo should have a gameName attribute and an inspectionSeconds attribute
		gameInfo = gameInfo_;
		assert(gameInfo.gameName in games, gameInfo.gameName + " not found in " + Object.keys(games));
		gui.handleGameInfo();
	};

	var scramble = null;
	this.getScramble = function() {
		return scramble;
	};
	now.handleScramble = function(scramble_) {
		scramble = scramble_;
		gui.handleScramble();
	};

	var members;
	this.getChannelMembers = function() {
		return members;
	};
	var myself;
	this.getMyself = function() {
		return myself;
	};
	now.handleChannelMembers = function(members_) {
		members = members_;
		myself = null;
		if(username in members) {
			myself = members[username];
		} else {
			myself = null;
			assert(false);
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

	now.handleMove = function(nick, move, timestamp, startstamp) {
		gui.handleMove(nick, move, timestamp, startstamp);
	};

	now.handleChat = function(nick, msg) {
		gui.handleChat(nick, msg);
	};

	// TODO - consolidate error checking!
	this.sendGameInfo = function() {
		assert(myself);
		assert(myself.admin);
		var gameInfo = gui.getGameInfo();
		now.sendGameInfo(username, gameInfo, function(error) {
			if(error) {
				console.log(error);
			}
		});
	};

	this.sendScramble = function(scramble) {
		assert(myself);
		assert(myself.admin);
		now.sendScramble(username, scramble, function(error) {
			if(error) {
				console.log(error);
			}
		});
	};

	this.sendMove = function(move, startstamp) {
		var timestamp = new Date().getTime();
		now.sendMove(username, move, timestamp, startstamp, function(error) {
			if(error) {
				console.log(error);
			}
		});
	};

	var username, channel;
	this.joinChannel = function(username_, channel_) {
		username = username_ || 'Pimp' + now.core.clientId;
		channel = channel_ || "PimpsAtSea"; // TODO - configurable later on
		myself = null;
		now.joinChannel(username, channel, function(error) {
			if(error) {
				alert(error);
			}
		});
	};


	var that = this;
};

})();
