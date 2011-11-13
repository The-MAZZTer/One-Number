function Timer(object, func, params, timeout, repeating) {
  this.object = object;
  this.func = func;
  this.params = params;
	this.repeating = repeating;
  this.timeout = timeout;
  this.timer = null;
}

Timer.prototype.start = function() {
  var object = this.object;
  var func = this.func;
  var params = this.params;
  
  if (this.timer) {
    this.stop();
  }

	function callback() {
		if (!params) {
			object[func].call(object);
		} else {
			object[func].apply(object, params);
		}
	}
	
	var me = this;
	if (this.repeating) {
		this.timer = window.setInterval(function() { me.tick(); }, this.timeout);
	} else {
		this.timer = window.setTimeout(function() { me.tick(); }, this.timeout);
	}
	this.startTime = new Date();
}

Timer.prototype.tick = function() {
	if (!this.params) {
		this.object[this.func].call(this.object);
	} else {
		this.object[this.func].apply(this.object, this.params);
	}
}

Timer.prototype.stop = function() {
  if (!this.timer) {
    return;
  }
	if (this.repeating) {
		window.clearInterval(this.timer);
	} else {
		window.clearTimeout(this.timer);
	}
  this.timer = null;
}

Timer.prototype.isRunning = function() {
	return Boolean(this.timer);
}