(function() {

	function ButtonGameMaker(WIDTH, HEIGHT) {

		var ButtonGame = function(moveCallback) {
			var lastButtonValue = -1;
			var buttons = null;
			this.setScramble = function(scramble) {
				solving = false;
				assert(scramble == null || scramble.length == WIDTH*HEIGHT);

				lastButtonValue = -1;
				var gameTable = document.createElement('table');
				$(gameDiv).empty()
				gameDiv.appendChild(gameTable);
				buttons = [];
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
						if(scramble === null) {
							$(button).hide();
						} else {
							var buttonValue = (scramble == null ? index : scramble[index]);
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
						});
						cell.appendChild(button);
					}
				}
			};
			this.applyMove = function(move) {
				if(!isLegalMove(move)) {
					assert(false);
					return;
				}
				var button = buttons[move[0]][move[1]];
				button.style.display = 'none';
				lastButtonValue = button.buttonValue;
			};
			this.isFinished = function() {
				return lastButtonValue == WIDTH*HEIGHT-1;
			};
			function isLegalMove(move) {
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
				if(isLegalMove(move)) {
					that.applyMove(move);
					if(moveCallback) {
						moveCallback(move);
					}
				}

			}

			this.setScramble(null);
		};

		ButtonGame.generateScramble = function() {
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

})();
