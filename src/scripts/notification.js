var bp = chrome.extension.getBackgroundPage();
var u = bp.updater;

var timer = new Timer(this, "timerTick", null, 50, true);
var timeCanvas;
var timeContext;
var timeout;

function update() {
	var services = u.getBadgeServices();
	for (var i = 0; i < services.length; i++) {
		if (services[i].getUnreadCount() > 0) {
			$("nav_open").style.display = "block";
			break;
		}
	}
	
	u.buildImage(services, $("icon"));
	
	var nodes = u.buildNotification(services, document);
	$("content").textContent = "";
	for (var i = 0; i < nodes.length; i++) {
		$("content").appendChild(nodes[i]);
	}
	
	timeCanvas = $("time");
	timeContext = timeCanvas.getContext("2d");
	timeContext.fillStyle = "black";
	
	startTimer();
}

function stopTimer() {
	timer.stop();
	
	timeContext.clearRect(0, 0, timeCanvas.width, timeCanvas.height);
}

function startTimer() {
	timeout = bp.settings.get("notifications", "timeout");
	if (timeout > 0) {
		timer.start();
		timerTick();
	}
}

function timerTick() {
	var elapsed = (new Date() - timer.startTime) / 1000;
	if (elapsed >= timeout) {
		hide();
		return;
	}
	
	timeContext.clearRect(0, 0, timeCanvas.width, timeCanvas.height);
	
	timeContext.beginPath();
	timeContext.moveTo(8, 8)
	timeContext.arc(8, 8, 8, -(Math.PI / 2), -(Math.PI / 2) +
		(2 * Math.PI * elapsed / timeout), true);
	timeContext.fill();
	timeContext.closePath();
}

function hide() {
	stopTimer();
	u.notification = null;
	this.close();
}

window.onfocus = function() {
	window.hasFocus = true;
	stopTimer();
}

window.onblur = function() {
	window.hasFocus = false;
	if (!window.mouseOver) {
		startTimer();
	}
}

window.onmouseover = function() {
	window.mouseOver = true;
	stopTimer();
}

window.onmouseout = function(e) {
	if (e.target !== document.documentElement) {
		return;
	}
	
	window.mouseOver = false;
	if (!window.hasFocus) {
		startTimer();
	}
}

window.onload = function() {
	i18nTemplate.process(document);
	update();
	
	$("nav_open").onclick = function() {
		unread();
		hide();
	}
}