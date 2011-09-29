var Chatter = {};

(function() {

var SHOW_TIMESTAMP_DELAY_SECONDS = 60;

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
		appendMessageDiv(message.div);
		unconfirmedMessages[key] = message;
	}
	function appendMessageDiv(messageDiv) {
		messageArea.append(messageDiv);
		maybeFullyScroll();
	}
	var isFullyScrolled = true;
	messageArea.scroll(function(e) {
		isFullyScrolled = ( 2 + messageArea.scrollTop() + messageArea.outerHeight() >= messageArea[0].scrollHeight );
	});
	function maybeFullyScroll() {
		if(isFullyScrolled) {
			messageArea.scrollTop(messageArea[0].scrollHeight);
		}
	}
	$(window).resize(function(e) {
		maybeFullyScroll();
	});

	var lastMessageDiv = null;
	function maybeShowTimestamp() {
		if(!lastMessageDiv) {
			return;
		}
		var secondsSinceLastMessage = (new Date().getTime() - lastMessageDiv.timestamp)/1000;
		if(secondsSinceLastMessage > SHOW_TIMESTAMP_DELAY_SECONDS) {
			lastMessageDiv.setTimestampVisible(true);
			lastMessageDiv = null;
		}
		setTimeout(maybeShowTimestamp, 1000);
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
		} else {
			message.div = createMessageDiv(message);
			messageDiv = message.div;
		}

		messageDiv.setConfirmed(true);
		appendMessageDiv(messageDiv);
		lastMessageDiv = messageDiv;
		maybeShowTimestamp();
		assert(lastMessageDiv.timestamp);
	}
	function createMessageDiv(message) {
		var messageDiv = $('<div/>');
		var newlinedMessageDiv = $('<div/>');
		var nickSpan = $('<span/>').addClass('nick');
		newlinedMessageDiv.append(nickSpan);
		var dateDiv = $('<div/>').addClass('messageTimestamp');

		messageDiv.append(newlinedMessageDiv);
		messageDiv.append(dateDiv);

		var controlMessage = true;
		if(message.nick) {
			controlMessage = false;
			nickSpan.text(message.nick + ": ");
		}
		if(controlMessage) {
			newlinedMessageDiv.addClass('controlMessage');
		}
		var messageByLine = message.text.split('\n');
		for(var i = 0; i < messageByLine.length; i++) {
			newlinedMessageDiv.append(messageByLine[i]);
			newlinedMessageDiv.append($('<br>'));
		}

		messageDiv.timestamp = new Date().getTime();
		
		messageDiv.setConfirmed = function(confirmed) {
			if(confirmed) {
				newlinedMessageDiv.removeClass('unconfirmedMessage');
				newlinedMessageDiv.addClass('confirmedMessage');
			} else {
				newlinedMessageDiv.addClass('unconfirmedMessage');
				newlinedMessageDiv.removeClass('confirmedMessage');
			}
		};
		messageDiv.setConfirmed(false);
		messageDiv.setTimestampVisible = function(visible) {
			if(visible) {
				dateDiv.text('Sent at ' + $.format.date(new Date(messageDiv.timestamp).toString(), 'hh:mm a on ddd'));
				dateDiv.show();
			} else {
				dateDiv.hide();
			}
		};
		messageDiv.setTimestampVisible(false);
		return messageDiv;
	}

	this.addMessage = function(message) {
		confirmMessage(message);
	};

	this.clear = function() {
		lastMessageDiv = null;
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
