var paperboy = require('paperboy');
var nowjs = require('now');
var url = require("url");
var sys = require('sys');
var assert = require('assert');

WEBROOT = 'webroot'

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

var everyone = nowjs.initialize(httpServer);

// TODO - clean up users & channels
var nick_user = {};
var clientId_user = {};
function User(nick_, clientId_) {
	this.nick = nick_;
	this.clientId = clientId_;

	this.channel = null;
	function part() {
		if(that.channel) {
			that.channel.removeUser(that);
		}
	}
	this.join = function(channel) {
		part();
		that.channel = channel;
		channel.addUser(that);
	};
	this.destroy = function() {
		part();
		delete nick_user[this.nick];
		delete clientId_user[this.clientId];
	};
	this.setNick = function(newNick) {
		assert.ok(!(newNick in nick_user));
		var oldNick = that.nick;

		delete nick_user[oldNick];
		that.nick = newNick;
		nick_user[that.nick] = that;

		assert.ok(that.channel);
		that.channel.memberRenamed(oldNick, newNick);
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
	var users = {};
	var adminUser = null;
	this.sendMemberList = function() {
		that.getGroup().now.handleChannelMembers(users);
	};
	this.memberRenamed = function(oldNick, newNick) {
		var user = users[oldNick];
		assert.equal(user.nick, newNick);
		assert.ok(user);
		delete users[oldNick];
		users[newNick] = user;
		that.sendMemberList();
	};
	this.addUser = function(user) {
		users[user.nick] = user;
		if(!adminUser) {
			adminUser = user;
			user.setAdmin(true);
		}
		// Add this user to the underlying nodejs group...
		that.getGroup().addUser(user.clientId);
		// and notify everyone in the channel of the new members list
		this.sendMemberList();
	};
	this.removeUser = function(user) {
		delete users[user.nick];

		var userNames = Object.keys(users);
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
				// TODO - should choose next oldest User!
				adminUser = users[userNames[0]];
				adminUser.setAdmin(true);
			}
		}

		// Remove this user from the underlying nodejs group...
		that.getGroup().removeUser(user.clientId);
		// and notify everyone in the channel of the new members list
		this.sendMemberList();
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

everyone.now.joinChannel = function(nick, channelName, callback) {
	var clientId = this.user.clientId;
	var user = clientId_user[clientId];
	if(!user) {
		// The clientId wants to be named nick
		if(nick in nick_user) {
			callback('Nick: ' + nick + " in use by clientId: " + nick_user[nick].clientId);
			return;
		}
		user = new User(nick, clientId);
		nick_user[nick] = user;
		clientId_user[clientId] = user;
	} else {
		if(user.nick != nick) {
			// The clientId wants to rename himself to nick
			if(nick in nick_user) {
				callback('Nick: ' + nick + " in use by clientId: " + nick_user[nick].clientId);
				return;
			}
			// Note: In the event that the client does a rename *and* a join, we'll
			// send out more messages than are strictly necessary. That's fine, though.
			user.setNick(nick);
		}
	}
	assert.ok(user);

	var channel = getChannel(channelName);
	if(user.channel != channel) {
		user.join(channel);
	}
	callback();
};

function authenticate_authorize(func, authorize) {
	return function() {
		// The last argument to each function must be a callback
		var args = [];
		for(var i = 0; i < arguments.length; i++) {
			args[i] = arguments[i];
		}
		var callback = args[args.length-1];
		var user = clientId_user[this.user.clientId];
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

everyone.now.sendGameInfo = auth(function(user, gameInfo, callback) {
	var channel = user.channel;
	channel.getGroup().now.handleGameInfo(gameInfo);
});

everyone.now.sendScramble = auth(function(user, scramble, callback) {
	var channel = user.channel;
	channel.getGroup().now.handleScramble(scramble);
});

everyone.now.sendMove = auth_admin(function(user, move, timestamp, startstamp, callback) {
	var channel = user.channel;
	channel.getGroup().now.handleMove(user.nick, move, timestamp, startstamp);
});

everyone.now.ping = function(callback) {
	callback();
}

nowjs.on('connect', function() {
  console.log("Joined: " + this.user.clientId);
});


nowjs.on('disconnect', function(){
  console.log("Left: " + this.user.clientId);
  var user = clientId_user[this.user.clientId];
  if(user) {
	  user.destroy();
  }
});
