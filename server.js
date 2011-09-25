HOST = null; // localhost
PORT = 8001;

// when the daemon started
var starttime = (new Date()).getTime();

/*
var mem = process.memoryUsage();
// every 10 seconds poll for the memory.
setInterval(function () {
  mem = process.memoryUsage();
}, 10*1000);
*/


var fu = require("./fu"),
    sys = require("sys"),
    url = require("url"),
    qs = require("querystring");

var MESSAGE_BACKLOG = 200,
    SESSION_TIMEOUT = 60 * 1000;

var channels = {};


var Channel = function(channelName) {
  var messages = [],
      callbacks = [],
	  members = [];
  this.members = members;
  this.addMember = function(session) {
	  var member = {};
	  member.nick = session.nick;
	  // Iff we're the first, then we are now admin, bitches!
	  member.admin = members.length == 0;

	  members.push(member);
  };
  this.removeMember = function(session) {
	  // TODO - reevaluate admin status!
	  // TODO - clear channels when they're not in use
	  delete members[session.nick];
  };

  this.constructMessage = function(nick, type, data) {
    return { nick: nick,
              type: type, // ...
			  data: data,
              timestamp: new Date().getTime(),
			  channel: channelName
            };
  };

  this.appendMessage = function(message) {
    switch (message.type) {
      case "msg":
        sys.puts("<" + message.nick + "> " + message.data);
        break;
      case "members":
        sys.puts(JSON.stringify(message.data) + " changed");
        break;
    }

    messages.push( message );

    while (callbacks.length > 0) {
      callbacks.shift().callback([message]);
    }

    while (messages.length > MESSAGE_BACKLOG) {
      messages.shift();
	}
  };

  this.query = function(since, callback) {
    var matching = [];
	/* TODO - add support for batching messages...
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      if (message.timestamp > since) {
        matching.push(message);
	  }
    }
	*/

    if (matching.length != 0) {
      callback(matching);
    } else {
      callbacks.push({ timestamp: new Date(), callback: callback });
    }
  };

  // clear old callbacks
  // they can hang around for at most 30 seconds.
  setInterval(function() {
    var now = new Date();
    while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
      callbacks.shift().callback([]);
    }
  }, 3000);
};

var sessions = {};

function createSession(nick, channelName) {
  if (nick.length > 50) return null;
  if (/[^\w_\-^!]/.exec(nick)) return null;

  if(nick in sessions) {
		return sessions[nick]; // TODO THIS IS HERE FOR DEVELOPMENT
	  //return null;
  }

  var session = { 
    nick: nick, 
    timestamp: new Date(),

    poke: function() {
      session.timestamp = new Date();
    },

    destroy: function() {
	  channel.removeMember(sessions[nick]);
      delete sessions[nick];

	  var membersMessage = getMembersJSON(channelName);
	  channel.appendMessage(membersMessage);
    }
  };

  sessions[nick] = session;
  var channel = null;
  if(channelName in channels) {
	channel = channels[channelName];
  } else {
	channel = new Channel(channelName);
	channels[channelName] = channel;
  }
  channel.addMember(session);
  return session;
}

// interval to kill off old sessions
setInterval(function () {
  var now = new Date();
  for (var nick in sessions) {
    var session = sessions[nick];

    if (now - session.timestamp > SESSION_TIMEOUT) {
      session.destroy();
    }
  }
}, 1000);

fu.listen(Number(process.env.PORT || PORT), HOST);

// TODO - serve up OUR client!
// WOOW KILL ME NOW PLEASE
fu.get("/", fu.staticHandler("SillyGame.html"));
fu.get("/SillyGame.html", fu.staticHandler("SillyGame.html"));
fu.get("/GameMaster.css", fu.staticHandler("GameMaster.css"));
fu.get("/stacktrace.js", fu.staticHandler("stacktrace.js"));
fu.get("/assert.js", fu.staticHandler("assert.js"));
fu.get("/jquery-1.6.4.js", fu.staticHandler("jquery-1.6.4.js"));
fu.get("/GameMaster.js", fu.staticHandler("GameMaster.js"));
fu.get("/ButtonGame.js", fu.staticHandler("ButtonGame.js"));


function getMembersJSON(channelName) {
  var channel = channels[channelName];
  return channel.constructMessage(null, 'members', channel.members);
}

fu.get("/who", function (req, res) {
  var query = qs.parse(url.parse(req.url).query);
  var channelName = query.channel;
  res.simpleJSON(200, getMembersJSON(channelName));
});

fu.get("/join", function (req, res) {
sys.puts(req.url);
  var query = qs.parse(url.parse(req.url).query);
  var nick = query.nick;
  var channelName = query.channel;
  if (nick == null || nick.length == 0) {
    res.simpleJSON(400, {error: "Bad nick."});
    return;
  }
  if (channelName == null || channelName.length == 0) {
    res.simpleJSON(400, {error: "Bad channel."});
    return;
  }

  var session = createSession(nick, channelName);
  if (session == null) {
    res.simpleJSON(400, {error: "Nick invalid or in use"});
    return;
  }

  var channel = channels[channelName];

  //sys.puts("connection: " + nick + "@" + res.connection.remoteAddress);

  var membersMessage = getMembersJSON(channelName);
  channel.appendMessage(membersMessage);
  res.simpleJSON(200, membersMessage);
});

fu.get("/part", function (req, res) {
sys.puts(req.url);
  var nick = qs.parse(url.parse(req.url).query).nick;
  if(nick) {
	  sessions[nick].destroy();
	  res.simpleJSON(200, {});
  } else {
	  res.simpleJSON(400, {error: 'Could not find ' + nick});
  }
});

fu.get("/recv", function (req, res) {
sys.puts(req.url);
  var query = qs.parse(url.parse(req.url).query);
  if (!query.since) {
    res.simpleJSON(400, { error: "Must supply since parameter" });
    return;
  }
  if(!query.channel) {
    res.simpleJSON(400, { error: "Must supply a channel parameter" });
	return;
  }
  if(!(query.channel in channels)) {
    res.simpleJSON(400, { error: "Must supply real channel parameter" });
    return;
  }
  var channel = channels[query.channel];
  var nick = query.nick;
  var session;
  if(nick && sessions[nick]) {
    session = sessions[nick];
    session.poke();
  }

  var since = parseInt(query.since, 10);

  channel.query(since, function(message) {
	// TODO - multiple messages?
    if (session) session.poke();
    res.simpleJSON(200, message);
  });
});

fu.get("/send", function (req, res) {
sys.puts(req.url);
  var query = qs.parse(url.parse(req.url).query);
  var nick = query.nick;
  var session = sessions[nick];
  if(!session) {
    res.simpleJSON(400, { error: "No such session for " + nick });
    return;
  }
  if(!query.channel) {
    res.simpleJSON(400, { error: "Must specify a channel parameter" });
	return;
  }
  if(!(query.channel in channels)) {
    res.simpleJSON(400, { error: "Must specify a real channel" });
	return;
  }
  var channel = channels[query.channel];

  session.poke();

  query.data = JSON.parse(query.data);
  channel.appendMessage(query);
  res.simpleJSON(200, {});
});
