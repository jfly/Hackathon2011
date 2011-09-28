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
	chatBox.keypress(function(e) {
		if(e.which == 13 && !e.shiftKey) {
			e.preventDefault();
			var message = chatBox.val();
			if(message.match(/^\s*$/)) {
				return;
			}
			gameMaster.sendChat(message);
			addMessageUnconditional(gameMaster.getMyNick(), message);
			chatBox.val("");
		}
	});

	function addMessageUnconditional(nick, message) {
		var isFullyScrolled = ( 2 + messageArea.scrollTop() + messageArea.outerHeight() >= messageArea[0].scrollHeight );

		var messageDiv = $('<div/>');
		messageDiv.addClass('message');
		var nickSpan = $('<span/>').text(nick + ": ");
		nickSpan.addClass('nick');
		messageDiv.append(nickSpan);
		var messageByLine = message.split('\n');
		for(var i = 0; i < messageByLine.length; i++) {
			messageDiv.append(messageByLine[i]);
			messageDiv.append($('<br>'));
		}
		messageArea.append(messageDiv);

		if(isFullyScrolled) {
			messageArea.scrollTop(messageArea[0].scrollHeight);
		}
	}

	this.addMessage = function(nick, message) {
		if(nick == gameMaster.getMyNick()) {
			// TODO - gray out messages until we know they hit the server?
			return;
		}
		addMessageUnconditional(nick, message);
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