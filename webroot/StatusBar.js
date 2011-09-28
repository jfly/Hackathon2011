var StatusBar = {};
(function() {
	// TODO - distinguish between errors, warnings, and benign messages?
	// TODO - maintain a queue of errors per key, ensure each is shown for at least 1 second?
	// TODO - add an X to clear the current error
	var errorMap = {};
	StatusBar.setError = function(key, error) {
		if(!error) {
			delete errorMap[key];
		} else {
			errorMap[key] = error;
		}
		StatusBar.refresh();
	};

	var connectionStatus = null;
	var pendingShow = null;
	StatusBar.refresh = function() {
		if(!connectionStatus) {
			// We can't show any status until the page has loaded.
			return;
		}
		var errors = [];
		for(var errorType in errorMap) {
			errors.push(errorType + ": " + errorMap[errorType]);
		}
		if(errors.length > 0) {
			connectionStatus.empty();
			for(var i = 0; i < errors.length; i++) {
				connectionStatus.append($('<div />').text(errors[i]));
			}

			// We wait a moment before showing the status bar to prevent flickering
			// (when an error gets added and the almost immediately removed)
			if(!pendingShow) {
				pendingShow = setTimeout(function() {
					pendingShow = null;
					assert(errors.length > 0);
					connectionStatus.show();
				}, 100);
			}
		} else {
			if(pendingShow) {
				clearTimeout(pendingShow);
				pendingShow = null;
			} else {
				connectionStatus.hide();
			}
		}
	};
	$(document).ready(function() {
		connectionStatus = $(document.createElement('div'));
		connectionStatus.addClass('statusBar');
		$('body').append(connectionStatus);
		StatusBar.refresh();
	});
})();
