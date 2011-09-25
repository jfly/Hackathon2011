var paperboy = require('paperboy');
var nowjs = require('now');
var url = require("url");
var sys = require('sys');
var assert = require('assert');

//Object.prototype.keys = function() {
function keys(obj) {
	var keys = [];
	for(var key in obj) {
		if(obj.hasOwnProperty(key)) {
			keys.push(key);
		}
	}
	return keys;
};

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
function User(nick, clientId) {
	this.nick = nick;
	this.clientId = clientId;

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

	this.admin = false;
	this.setAdmin = function(isAdmin) {
		this.admin = isAdmin;
	};

	var that = this;
}
function getUser(nick, clientId) {
	var user = nick_user[nick];
	if(!user) {
		user = new User(nick, clientId);
		nick_user[nick] = user;
		clientId_user[clientId] = user;
	}
	if(user.clientId != clientId) {
		// TODO - comment!
		user.destroy();
		user = getUser(nick, clientId);
	}
	assert.equal(user.clientId, clientId);
	return user;
}

var channels = {};
function Channel(channelName) {
	var users = {};
	var adminUser = null;
	this.sendMemberList = function() {
		that.getGroup().now.handleChannelMembers(users);
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

		var userNames = keys(users);
		if(user == adminUser) {
			user.setAdmin(false);
			// TODO - should choose next oldest User!
			adminUser = users[userNames[0]];
			adminUser.setAdmin(true);
		}

		// Remove this user from the underlying nodejs group...
		that.getGroup().removeUser(user.clientId);
		// and notify everyone in the channel of the new members list
		this.sendMemberList();

		if(userNames.length == 0) {
			// This channel is now empty, so we can delete it
			delete channels[channelName];
		}
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
	var user = getUser(nick, this.user.clientId);
	var channel = getChannel(channelName);
	user.join(channel); // TODO - can this fail?
	callback();
};

// TODO - consolidate error checking
everyone.now.setGameInfo = function(nick, gameInfo, callback) {
	var user = nick_user[nick];
	if(!user) {
		callback("User " + nick + " not found");
		return;
	}
	if(!user.admin) {
		callback("User " + nick + " not admin");
		return;
	}

	var channel = user.channel;
	channel.getGroup().now.handleGameInfo(gameInfo);
};

everyone.now.sendScramble = function(nick, scramble, callback) {
	var user = nick_user[nick];
	if(!user) {
		callback("User " + nick + " not found");
		return;
	}
	if(!user.admin) {
		callback("User " + nick + " not admin");
		return;
	}

	var channel = user.channel;
	channel.getGroup().now.handleScramble(scramble);
};

everyone.now.sendMove = function(nick, move, timestamp, startstamp, callback) {
	var user = nick_user[nick];
	if(!user) {
		callback("User " + nick + " not found");
		return;
	}

	var channel = user.channel;
	channel.getGroup().now.handleMove(nick, move, timestamp, startstamp);
};

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
