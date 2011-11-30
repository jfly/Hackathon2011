(function() {

	var css = $('<link/>');
	css.attr({
		rel: "stylesheet",
		type: "text/css",
		href: "ButtonGame.css"
	});
	$('head').append(css);
	function ButtonGameMaker(WIDTH, HEIGHT) {

		var PADDING = 5;

		var ButtonGame = function(moveCallback) {
			var lastButtonValue = -1;
			var buttons = null;
			this.setState = function(scramble) {
				solving = false;
				assert(scramble == null || scramble.length == WIDTH*HEIGHT);

				lastButtonValue = -1;
				var gameTable = document.createElement('table');
				// Crazy ass firefox defaults to 'hide' for empty-cells
				$(gameTable).css('empty-cells', 'show');
				gameDiv.empty();
				gameDiv.append($(gameTable));
				buttons = [];
				lastButtonValue = WIDTH*HEIGHT;
				for(var i = 0; i < HEIGHT; i++) {
					var row = gameTable.insertRow(-1);
					var buttonRow = [];
					buttons.push(buttonRow);
					for(var j = 0; j < WIDTH; j++) {
						var button = $(row.insertCell(-1));
						buttonRow.push(button);
						button.addClass("ButtonGameButton");
						var index = WIDTH*i+j;
						if(scramble === null || scramble[index] === null) {
							// A solved button has no text
						} else {
							var buttonValue = scramble[index];
							if(buttonValue < lastButtonValue) {
								lastButtonValue = buttonValue;
							}
							button.addClass("ButtonGameUnsolvedButton");
							button.buttonValue = buttonValue;
							button.text(buttonValue);
						}
						var mousedown = (function(i, j) {
							return function(e) {
								// Cancel selecting text
								e.preventDefault();
								buttonClicked(i, j);
							};
						})(i, j);
						button.mousedown(mousedown);
					}
				}
				lastButtonValue--;
				resize();
			};
			function resize() {
				gameDiv.width(size.width);
				gameDiv.height(size.height);
				var cellWidth = (size.width - PADDING*WIDTH/2) / WIDTH;
				var cellHeight = (size.height - PADDING*HEIGHT/2) / HEIGHT;
				for(var i = 0; i < buttons.length; i++) {
					for(var j = 0; j < buttons[i].length; j++) {
						var button = buttons[i][j];
						button.css('font-size', cellHeight/2 + 'px');
						button.width(cellWidth-4);
						button.height(cellHeight);
					}
				}
			}
			var size = ButtonGame.getPreferredSize();
			this.setSize = function(size_) {
				size = size_;
				var minimumSize = ButtonGame.getMinimumSize();
				assert(size.width >= minimumSize.width);
				assert(size.height >= minimumSize.height);
				resize();
			};
			this.generateRandomState = function() {
				var cellCount = WIDTH*HEIGHT;
				var scramble = [];
				for(var i = 0; i < cellCount; i++) {
					scramble.push(i);
				}
				scramble.sort(function() { return 0.5-Math.random(); });
				return scramble;
			};
			this.getState = function() {
				var state = [];
				for(var i = 0; i < buttons.length; i++) {
					for(var j = 0; j < buttons[i].length; j++) {
						var button = buttons[i][j];
						var value = button.buttonValue;
						state.push(button.buttonValue);
					}
				}
				return state;
			};
			this.applyMove = function(move) {
				if(!that.isLegalMove(move)) {
					assert(false);
					return;
				}
				var button = buttons[move[0]][move[1]];
				lastButtonValue = button.buttonValue;
				button.buttonValue = null;
				button.text('');
				button.css('cursor', '');
				button.removeClass('ButtonGameUnsolvedButton');
			};
			this.isFinished = function() {
				return lastButtonValue == WIDTH*HEIGHT-1;
			};
			this.isLegalMove = function(move) {
				var button = buttons[move[0]][move[1]];
				return (button.buttonValue == lastButtonValue + 1);
			};
			var inspecting = false;
			this.startInspection = function() {
				inspecting = true;
			};
			var playable = false;
			this.setPlayable = function(playable_) {
				playable = playable_;
			};
			this.endInspection = function() {
				inspecting = false;
				for(var i = 0; i < buttons.length; i++) {
					for(var j = 0; j < buttons[i].length; j++) {
						var button = buttons[i][j];
						button.css('cursor', 'pointer');
					}
				}
			};
			this.getDiv = function() {
				return gameDiv[0];
			};

			var gameDiv = $(document.createElement('div'));
			gameDiv.addClass('ButtonGame');
			var that = this;
			function buttonClicked(i, j) {
				if(!playable || inspecting) {
					// TODO - a more efficient way of doing this would be to
					// actually remove the listener, but I'm lazy and in a rush
					return;
				}
				var move = [ i, j ];
				var oldState = that.getState();
				if(that.isLegalMove(move)) {
					that.applyMove(move);
					if(moveCallback) {
						moveCallback(that, move, oldState);
					}
				}

			}

			this.setState(null);
		};

		ButtonGame.getPreferredSize = function() {
			return { width: WIDTH*50, height: HEIGHT*50 };
		};
		ButtonGame.getMinimumSize = function() {
			return { width: WIDTH*30, height: HEIGHT*30 };
		};
		ButtonGame.getGameName = function() { return WIDTH + "x" + HEIGHT + "ButtonGame"; };
		return ButtonGame;
	}

	GameMaster.addGame(ButtonGameMaker(3, 3));
	GameMaster.addGame(ButtonGameMaker(4, 4));
	GameMaster.addGame(ButtonGameMaker(5, 5));
	GameMaster.addGame(ButtonGameMaker(10, 5));
	GameMaster.addGame(ButtonGameMaker(5, 10));

})();
