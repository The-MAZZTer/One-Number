var bp;
var u;

window.onload = function() {
	bp = chrome.extension.getBackgroundPage();
	u = bp.updater;

	$("open").onclick = function() {
		u.popupOpenUnread(true);
		window.close();
	}

	$("refresh").onclick = function() {
		u.refresh();
	}

	$("openOptions").onclick = function() {
		u.openPage("options.html");
		window.close();
	}

	$("openServiceConfig").onclick = function() {
		u.openPage("options.html#services");
		bp.settings.set("hidden", "showPopupHint", false)
		window.close();
	}

	i18nTemplate.process(document);
	u.popupOpened(this);
	
	NodeList.prototype.forEach = Array.prototype.forEach;
	
	document.querySelectorAll(".extra").forEach(function(val, index, a) {
		val.onclick = openExtra;
	});
	document.querySelectorAll(".name").forEach(function(val, index, a) {
		val.onclick = tabopen;
	});
	document.querySelectorAll(".loginlink").forEach(function(val, index, a) {
		val.onclick = tabopen;
	});
}

window.onunload = function() {
	u.popupClosed();
}

function tabopen() {
	u.openByUID(this.parentNode.uid || this.parentNode.parentNode.uid);
	window.close();
}

function openExtra() { 
	u.openExtra(this.parentNode.uid);
	window.close();
}
