var Chatter = {};

(function() {

Chatter.Chatter = function(gameMaster) {
	var messageArea = $('<div/>');
	messageArea.addClass('messageArea');
	var chatBox = $('<textarea/>');
	chatBox.addClass('chatBox');
	var totalChatArea = $('<div/>');
	totalChatArea.addClass('chatArea');
	
	totalChatArea.append(messageArea);
	totalChatArea.append(chatBox);
	$('body').append(totalChatArea);
	chatBox.focus();
	var messageId = 0;
	chatBox.keypress(function(e) {
		if(e.which == 13 && !e.shiftKey) {
			e.preventDefault();
			var text = chatBox.val();
			if(text.match(/^\s*$/)) {
				return;
			}
			var message = {
				text: text,
				timestamp: new Date().getTime(),
				id: messageId++,
				nick: gameMaster.getMyNick()
			};
			gameMaster.sendMessage(message);
			addUnconfirmedMessage(message);
			chatBox.val("");
		}
	});

	var unconfirmedMessages = {};
	function addUnconfirmedMessage(message) {
		var key = [ message.nick, message.id ];
		message.div = createMessageDiv(message);
		message.div.addClass('unconfirmedMessage');
		appendMessageDiv(message.div);
		unconfirmedMessages[key] = message;
	}
	function appendMessageDiv(messageDiv) {
		var isFullyScrolled = ( 2 + messageArea.scrollTop() + messageArea.outerHeight() >= messageArea[0].scrollHeight );
		messageArea.append(messageDiv);
		if(isFullyScrolled) {
			messageArea.scrollTop(messageArea[0].scrollHeight);
		}
	}
	function confirmMessage(message) {
		var key = [ message.nick, message.id ];
		var messageDiv = null;
		if(key in unconfirmedMessages) {
			var message = unconfirmedMessages[key];
			messageDiv = message.div;
			// To keep the ordering of the messages correct, we must remove and then re-add this messageDiv;
			// We could also move all other unconfirmedMessages to the bottom, I'm not sure what makes
			// the most sense.
			messageDiv.remove();
			messageDiv.removeClass('unconfirmedMessage');
		} else {
			message.div = createMessageDiv(message);
			messageDiv = message.div;
		}

		appendMessageDiv(messageDiv);
	}
	function createMessageDiv(message) {
		var messageDiv = $('<div/>');
		messageDiv.addClass('message');
		var nickSpan = $('<span/>').text(message.nick + ": ");
		nickSpan.addClass('nick');
		messageDiv.append(nickSpan);
		var messageByLine = message.text.split('\n');
		for(var i = 0; i < messageByLine.length; i++) {
			messageDiv.append(messageByLine[i]);
			messageDiv.append($('<br>'));
		}

		return messageDiv;
	}

	this.addMessage = function(message) {
		confirmMessage(message);
	};

	this.clear = function() {
		messageArea.empty();
		unconfirmedMessages = {};
	};

	$('body').keypress(function(e) {
		if(e.which == 96) { // twiddle (~) key
			chatBox.focus();
			e.preventDefault();
		}
	});

	var that = this;
};

})();
