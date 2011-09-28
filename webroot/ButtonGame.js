(function() {

	function ButtonGameMaker(WIDTH, HEIGHT) {

		var ButtonGame = function(moveCallback) {
			var lastButtonValue = -1;
			var buttons = null;
			this.setState = function(scramble) {
				solving = false;
				assert(scramble == null || scramble.length == WIDTH*HEIGHT);

				lastButtonValue = -1;
				var gameTable = document.createElement('table');
				$(gameDiv).empty()
				gameDiv.appendChild(gameTable);
				buttons = [];
				lastButtonValue = WIDTH*HEIGHT;
				for(var i = 0; i < HEIGHT; i++) {
					var row = gameTable.insertRow(-1);
					var buttonRow = [];
					buttons.push(buttonRow);
					for(var j = 0; j < WIDTH; j++) {
						var cell = row.insertCell(-1);
						cell.style.height = '40px';
						cell.style.width = '40px';
						cell.style.border = '1px solid black';
						var button = document.createElement('input');
						buttonRow.push(button);
						var index = WIDTH*i+j;
						if(scramble === null || scramble[index] === null) {
							$(button).hide();
						} else {
							var buttonValue = scramble[index];
							if(buttonValue < lastButtonValue) {
								lastButtonValue = buttonValue;
							}
							button.buttonValue = buttonValue;
							button.value = buttonValue;
						}
						button.iIndex = i;
						button.jIndex = j;
						button.type = 'button';
						button.style.width = '100%';
						button.style.height = '100%';
						button.addEventListener('click', function(e) {
							buttonClicked(this);
						}, false);
						cell.appendChild(button);
					}
				}
				lastButtonValue--;
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
				$(button).hide();
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
				return gameDiv;
			};
			this.getName = function() {
				return ButtonGame.gameName;
			};

			var gameDiv = document.createElement('div');
			var that = this;
			function buttonClicked(button) {
				if(!solving) {
					return;
				}
				var move = [ button.iIndex, button.jIndex ];
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
