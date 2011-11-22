var paperboy = require('paperboy');
var nowjs = require('now');
var url = require("url");
var sys = require('sys');
var assert = require('assert');

WEBROOT = 'webroot'
MESSAGE_RING_SIZE = 100;

var httpServer = require('http').createServer(function(req, res) {
  var ip = req.connection.remoteAddress;
  paperboy
    .deliver(WEBROOT, req, res)
    .addHeader('Expires', 300)
    .addHeader('X-PaperRoute', 'Node')
    .before(function() {
      console.log('Received Request');
    })
    .after(function(statCode) {
      log(statCode, req.url, ip);
    })
    .error(function(statCode, msg) {
      res.writeHead(statCode, {'Content-Type': 'text/plain'});
      res.end("Error " + statCode);
      log(statCode, req.url, ip, msg);
    })
    .otherwise(function(err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end("Error 404: File not found");
      log(404, req.url, ip, err);
    });
});
function log(statCode, url, ip, err) {
  var logStr = statCode + ' - ' + url + ' - ' + ip;
  if (err)
    logStr += ' - ' + err;
  console.log(logStr);
}
httpServer.listen(8001);

// TODO - i've disabled websockets because they're making chrome crash...
var everyone = nowjs.initialize(httpServer);
//var everyone = nowjs.initialize(httpServer, {socketio: {transports: ['xhr-polling', 'jsonp-polling']}});

function UserSet() {
	this.nick_user = {};
	this.clientId_user = {};
	this.addUser = function(user) {
		assert.ok(!(user.nick in that.nick_user));
		assert.ok(!(user.clientId in that.clientId_user));
		that.nick_user[user.nick] = user;
		that.clientId_user[user.clientId] = user;
	};
	this.removeUser = function(user) {
		var userByClientId = that.clientId_user[user.clientId];
		var userByNick = that.nick_user[user.nick];
		assert.equal(userByClientId, userByNick);
		assert.equal(userByClientId, user);
		delete that.nick_user[user.nick];
		delete that.clientId_user[user.clientId];
	};
	this.userRenamed = function(oldNick, user) {
		assert.ok(user);
		var oldUser = that.nick_user[oldNick];
		assert.equal(oldUser, user);
		delete that.nick_user[oldNick];
		that.nick_user[user.nick] = user;
	};
	this.getUserByClientId = function(clientId) {
		return that.clientId_user[clientId];
	};
	this.getUserByNick = function(nick) {
		return that.nick_user[nick];
	};
	this.getNicks = function() {
		return Object.keys(that.nick_user);
	};
	this.getOldestUser = function() {
		var nicks = that.getNicks();
		var oldestTime = Infinity;
		var oldestUser = null;
		for(var i = 0; i < nicks.length; i++) {
			var user = that.getUserByNick(nicks[i]);
			if(user.joinTime < oldestTime) {
				oldestUser = user;
				oldestTime = user.joinTime;
			}
		}
		assert.ok(oldestUser);
		return oldestUser;
	};

	var that = this;
}

var users = new UserSet();
function User(nick_, clientId_) {
	this.nick = nick_;
	this.clientId = clientId_;
	this.joinTime = new Date().getTime();

	this.channel = null;
	function part() {
		if(that.channel) {
			that.channel.removeUser(that);
			that.channel = null;
		}
	}
	this.join = function(channel) {
		if(channel == that.channel) {
			return;
		}
		part();
		that.channel = channel;
		channel.addUser(that);
	};
	this.destroy = function() {
		part();
		users.removeUser(that);
	};
	this.setNick = function(newNick) {
		assert.ok(!users.getUserByNick(newNick));
		var oldNick = that.nick;

		that.nick = newNick;
		users.userRenamed(oldNick, that);

		assert.ok(that.channel);
		that.channel.userRenamed(oldNick, that);
	};

	this.admin = false;
	this.setAdmin = function(isAdmin) {
		this.admin = isAdmin;
	};

	var that = this;
}

var channels = {};
function Channel(channelName) {
	this.channelName = channelName;
	var channelUsers = new UserSet();
	var adminUser = null;

	this.userRenamed = function(oldNick, user) {
		channelUsers.userRenamed(oldNick, user);
		that.getGroup().now.handleMemberRename(user, channelUsers.clientId_user); //TODO
	};
	this.addUser = function(user) {
		channelUsers.addUser(user);
		if(!adminUser) {
			adminUser = user;
			user.setAdmin(true);
		}
		// Welcome the new member with the last few messages
		nowjs.getClient(user.clientId, function() {
			this.now.handleMessages(messages, true);
			this.now.handleChannelMembers(channelUsers.clientId_user);
		});
		// and notify everyone in the channel of the new members list
		that.getGroup().now.handleMemberJoin(user, channelUsers.clientId_user); //TODO
		// Add this user to the underlying nodejs group...
		that.getGroup().addUser(user.clientId);
	};
	this.removeUser = function(user) {
		channelUsers.removeUser(user);

		var userNames = channelUsers.getNicks();
		if(user == adminUser) {
			user.setAdmin(false);
			adminUser = null;
		}

		if(userNames.length == 0) {
			// This channel is now empty, so we can delete it
			delete channels[channelName];
		} else {
			// There are some users remaining. We need to appoint a new
			// admin if the old one left.
			if(!adminUser) {
				adminUser = channelUsers.getOldestUser();
				adminUser.setAdmin(true);
				that.getGroup().now.handleAdmin(adminUser, channelUsers.clientId_user); //TODO
			}
		}

		// Remove this user from the underlying nodejs group...
		that.getGroup().removeUser(user.clientId);
		// and notify everyone in the channel of the new members list
		that.getGroup().now.handleMemberPart(user, channelUsers.clientId_user); //TODO
	};

	var messages = [];
	this.addMessage = function(user, msg) {
		msg.serverTimestamp = new Date().getTime();
		// Nicks can change, so we copy the nick and clientId into the msg
		msg.nick = user.nick;
		msg.clientId = user.clientId;
		messages.push(msg);
		if(messages.length > MESSAGE_RING_SIZE) {
			messages.shift();
		}
		that.getGroup().now.handleMessages([msg]);
	};

	this.getGroup = function() {
		return nowjs.getGroup(channelName);
	};

	var that = this;
}
function getChannel(channelName) {
	var channel = channels[channelName];
	if(!channel) {
		channel = new Channel(channelName);
		channels[channelName] = channel
	}
	return channel;
}

GM = require('./webroot/GMConstants').GM;

everyone.now.joinChannel = function(nick, channelName, callback) {
	var clientId = this.user.clientId;
	var user = users.getUserByClientId(clientId);
	var nickInUse = users.getUserByNick(nick);
	if(!user) {
		if(nickInUse) {
			callback(GM.NICK_IN_USE, null, null);
			return;
		}
		user = new User(nick, clientId);
		users.addUser(user);
	}

	if(user.nick != nick) {
		if(nickInUse) {
			callback(GM.NICK_IN_USE, user.nick, user.channel.channelName);
			return;
		}
		// Note: In the event that the client does a rename *and* a join, we'll
		// send out more messages than are strictly necessary. That's fine, though.
		user.setNick(nick);
	}

	var channel = getChannel(channelName);
	if(user.channel != channel) {
		user.join(channel);
	}

	callback(null, user.nick, user.channel.channelName);
};

function authenticate_authorize(func, authorize) {
	return function() {
		// The last argument to each function must be a callback
		var args = [];
		for(var i = 0; i < arguments.length; i++) {
			args[i] = arguments[i];
		}
		var callback = args[args.length-1];
		var user = users.getUserByClientId(this.user.clientId);
		if(!user) {
			callback("User for clientId " + this.user.clientId + " not found");
			return;
		}
		if(authorize && !user.admin) {
			callback("User " + user.nick + " not admin");
			return;
		}
		args.unshift(user);
		func.apply(this, args);
	};
}
function auth(func) {
	return authenticate_authorize(func, false);
}
function auth_admin(func) {
	return authenticate_authorize(func, true);
}

everyone.now.sendGameInfo = auth_admin(function(user, gameInfo, callback) {
	var channel = user.channel;
	channel.getGroup().now.handleGameInfo(gameInfo);
});

everyone.now.sendRandomState = auth_admin(function(user, randomState, callback) {
	var channel = user.channel;
	channel.getGroup().now.handleRandomState(randomState);
});

everyone.now.sendMoveState = auth(function(user, moveState, callback) {
	var channel = user.channel;
	channel.getGroup().now.handleMoveState(user, moveState);
});

everyone.now.sendMessage = auth(function(user, msg) {
	var channel = user.channel;
	channel.addMessage(user, msg);
});

everyone.now.ping = function(callback) {
	callback();
}

nowjs.on('connect', function() {
  console.log("Joined: " + this.user.clientId);
});


nowjs.on('disconnect', function(){
  console.log("Left: " + this.user.clientId);
  var user = users.getUserByClientId(this.user.clientId);
  if(user) {
	  var channel = user.channel;
	  user.destroy();
  }
});
