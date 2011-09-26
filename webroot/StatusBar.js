var StatusBar = {};
(function() {
	// TODO - distinguish between errors, warnings, and benign messages?
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
			connectionStatus.show();
		} else {
			connectionStatus.hide();
		}
	};
	$(document).ready(function() {
		/*
		connectionStatus = $("<div />");
		$(connectionStatus).id = 'connectionStatus';// TODO set id in jquery?
		console.log(connectionStatus);
		$(document.body).append(connectionStatus); // TODO - what's the jquery way?
		*/
		connectionStatus = document.createElement('div');
		connectionStatus.id = 'connectionStatus';
		document.body.appendChild(connectionStatus);
		connectionStatus = $(connectionStatus);
		StatusBar.refresh();
	});
})();
