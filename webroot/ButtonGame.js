(function() {

	function ButtonGameMaker(WIDTH, HEIGHT) {
		var css = $('<link/>');
		css.attr({
			rel: "stylesheet",
			type: "text/css",
			href: "ButtonGame.css"
		});
		$('head').append(css);

		var PADDING = 5;

		var ButtonGame = function(moveCallback) {
			var lastButtonValue = -1;
			var buttons = null;
			var currentState = null;
			this.setState = function(scramble) {
				solving = false;
				currentState = scramble;
				assert(scramble == null || scramble.length == WIDTH*HEIGHT);

				var cellWidth = (size.width - PADDING*WIDTH) / WIDTH;
				var cellHeight = (size.height - PADDING*HEIGHT) / HEIGHT;
				lastButtonValue = -1;
				var gameTable = document.createElement('table');
				gameDiv.empty();
				gameDiv.width(size.width);
				gameDiv.height(size.height);
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
						button.css('font-size', cellHeight/2 + 'px');

						button.width(cellWidth-4);
						button.height(cellHeight);
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
						button.click(buttonClicked.bind(null, i, j));
					}
				}
				lastButtonValue--;
			};
			this.getPreferredSize = function() {
				return { width: WIDTH*50, height: HEIGHT*50 };
			};
			this.getMinimumSize = function() {
				return { width: WIDTH*30, height: HEIGHT*30 };
			};
			var size = this.getPreferredSize();
			this.setHeight = function(height) {
				var preferredSize = that.getPreferredSize();
				size = {};
				size.height = height;
				size.width = (preferredSize.width/preferredSize.height)*height;
				that.setState(currentState);
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
				button.removeClass('ButtonGameUnsolvedButton');
			};
			this.isFinished = function() {
				return lastButtonValue == WIDTH*HEIGHT-1;
			};
			this.isLegalMove = function(move) {
				var button = buttons[move[0]][move[1]];
				return (button.buttonValue == lastButtonValue + 1);
			};
			var solving = false;
			this.endInspection = function() {
				solving = true;
			};
			this.getDiv = function() {
				return gameDiv[0];
			};
			this.getName = function() {
				return ButtonGame.gameName;
			};

			var gameDiv = $(document.createElement('div'));
			gameDiv.addClass('ButtonGame');
			var that = this;
			function buttonClicked(i, j) {
				if(!solving) {
					return;
				}
				var move = [ i, j ];
				var moveState = { move: move, oldState: that.getState() };
				if(that.isLegalMove(move)) {
					that.applyMove(move);
					if(moveCallback) {
						moveCallback(moveState);
					}
				}

			}

			this.setState(null);
		};

		ButtonGame.generateRandomState = function() {
			var cellCount = WIDTH*HEIGHT;
			var scramble = [];
			for(var i = 0; i < cellCount; i++) {
				scramble.push(i);
			}
			scramble.sort(function() { return 0.5-Math.random(); });
			return scramble;
		};
		ButtonGame.gameName = WIDTH + "x" + HEIGHT + "ButtonGame";
		return ButtonGame;
	}

	GameMaster.addGame(ButtonGameMaker(3, 3));
	GameMaster.addGame(ButtonGameMaker(4, 4));
	GameMaster.addGame(ButtonGameMaker(5, 5));
	GameMaster.addGame(ButtonGameMaker(10, 5));

})();
