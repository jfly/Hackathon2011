(function() {

	// This is a really stupid game where a button is filled with
	// a random number. Each click decrements the number by 1.
	// You are supposed to click the button until its value is 0.
	//
	// The point of this game is to demonstrate the basic api for creating
	// a game.

	// Neat trick for loading game specific css and js
	/*
	var css = $('<link/>');
	css.attr({
		rel: "stylesheet",
		type: "text/css",
		href: "YOUR CSS FILENAME HERE"
	});
	$('head').append(css);
	*/

	/* TODO - it's hard to debug with this
	var scripts = [
		'twisty.js/inc/Three.js',
		'twisty.js/inc/RequestAnimationFrame.js',
		'twisty.js/inc/Stats.js',
		'twisty.js/inc/twisty_alg.js',
		'twisty.js/inc/twisty.js',
	];
	for(var i = 0; i < scripts.length; i++) {
		var script = scripts[i];
		var scriptElement = $('<script/>');
		scriptElement.attr({
			type: "text/javascript",
			src: script,
		});
		$('head').append(scriptElement);
	}
	*/
	// TODO - this stomps on other finishedLoadingScripts() functions
	window.finishedLoadingScripts = function() {
		for(var i = 2; i <= 5; i++) {
			GameMaster.addGame(CubeGameCreator(i));
		}
	};

	function CubeGameCreator(DIMENSION) {

	var CubeGame = function(moveCallback, gameStateChangedCallback) {
		var solving = null;
		var state = [];
		this.setState = function(scramble) {
			if(scramble == null) {
				scramble = [];
			}
			solving = false;
			state = scramble;
			twistyScene.initializeTwisty({
				type: "cube",
				dimension: DIMENSION,
				stickerWidth: 1.7,
			});
			twistyScene.applyMoves(scramble);
		};
		function keydown(e) {
			assert(playable);
			
			// TODO - get actual move
			var twisty = twistyScene.getTwisty();
			var move = twisty.moveForKey(twisty, e);
			if(!move) {
				return;
			}
			if(inspecting && !twisty.isInspectionLegalMove(twisty, move)) {
				// Don't allow inspection illegal moves during inspection!
				return;
			}

			// TODO
			var oldState = that.getState();
			assert(that.isLegalMove(move));
			that.applyMove(move);
			if(moveCallback) {
				moveCallback(that, move, oldState);
			}
		}
		var playable = false;
		// TODO - add to basic game!
		this.setPlayable = function(playable_) {
			if(playable != playable_) {
				playable = playable_;
				if(playable) {
					$(window).bind('keydown', keydown);
				} else {
					$(window).unbind('keydown', keydown);
				}
			}
		};
		var inspecting = false;
		// TODO - add to basic game!
		this.startInspection = function() {
			assert(playable);
			inspecting = true;
		};
		this.endInspection = function() {
			assert(playable);
			inspecting = false;
		};
		this.applyMove = function(move) {
			// Note that we don't call moveCallback from inside of applyMove.
			// This is because the game framework uses this method to animate
			// other people's games. TODO - move comment to basic game
			assert(that.isLegalMove(move));
			state.push(move);
			twistyScene.addMoves([move]);
		};
		this.getState = function() {
			// Return a copy so it won't get mutated outside,
			// or be affected by future turns inside.
			return state.slice();
		};
		this.isFinished = function() {
			var twisty = twistyScene.getTwisty();
			return twisty.isSolved(twisty);
		};

		var size = null;
		this.setSize = function(size_) {
			size = size_;
			gameDiv.width(size.width);
			gameDiv.height(size.height);
			// TODO - this doesn't take the horizontal width of the text into account
			//gameButton.css('font-size', .75*size.height);
			twistyScene.resize();
		};

		function resize() {}
		this.isLegalMove = function(move) {
			// This isn't really necessary for such a simple game, but
			// it does give us some confidence that stuff is working.
			return true;
		};
		this.getDiv = function() {
			return gameDiv[0];
		};

		var gameDiv = $(document.createElement('div'));
		gameDiv.css('position', 'relative');
		// TODO - actually wait for twistyjs to load?
		var twistyScene = new twistyjs.TwistyScene();
		twistyScene.addMoveListener(function(move, moveStarted) {
			if(!moveStarted) {
				gameStateChangedCallback();
			}
		});

		gameDiv.append($(twistyScene.getDomElement()));
		var that = this;

		this.setState(null);
	};

	// The following is a hack that gives us static methods on the game constructor.
	CubeGame.generateRandomState = function() {
		// TODO - this code is copied from twisty.js
		// TODO should the 3x3 "moves" be the internal twisty.js representation?
		// i think i'd rather that they be standard notation
		var dim = DIMENSION;
		var n = 32;
		var newMoves = [];

		for (var i=0; i<n; i++) {
			var random1 = 1 + Math.floor(Math.random()*dim/2);
			var random2 = random1 + Math.floor(Math.random()*dim/2);
			var random3 = Math.floor(Math.random()*6);
			var random4 = [-2, -1, 1, 2][Math.floor(Math.random()*4)];

			var newMove = [random1, random2, ["U", "L", "F", "R", "B", "D"][random3], random4];

			newMoves.push(newMove);
		}

		return newMoves;
	};
	CubeGame.getPreferredSize = function() {
		return CubeGame.getMinimumSize();
	};
	CubeGame.getMinimumSize = function() {
		return { width: 200, height: 200 };
	};
	CubeGame.getGameName = function() { return DIMENSION + "x" + DIMENSION + "x" + DIMENSION; };

	return CubeGame;
	}

	var scriptElement = $('<script/>');
	scriptElement.attr({
		type: "text/javascript",
	});
	scriptElement.text("finishedLoadingScripts();");
	$('head').append(scriptElement);

})();
