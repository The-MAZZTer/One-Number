var debug = false;
var manifest = null;

window.onload = function() {
	var frag = document.createDocumentFragment();
	
	var canvas = document.createElement("canvas");
	canvas.id = "canvas";
	canvas.width = 19;
	canvas.height = 19;
	frag.appendChild(canvas);
	
	var audio = document.createElement("audio");
	audio.id = "notificationsound";
	audio.setAttribute("preload", "auto");
	frag.appendChild(audio);
	
	var img = document.createElement("img");
	img.src = "images/browser_action/logo.png";
	img.id = "logo";
	frag.appendChild(img);
	
	document.body.appendChild(frag);

	var xhr = new XMLHttpRequest();  
	xhr.open("GET", "/manifest.json", true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4) {
			return;
		}
		if (!xhr.responseText) {
			debug = true;
			log("Unable to load manifest.json.");
			afterManifestLoad();
			return;
		}
		
		manifest = JSON.parse(xhr.responseText);
		if (!manifest) {
			debug = true;
			log("Unable to parse manifest.json.");
			afterManifestLoad();
			return;
		}

		// If we have an update url we have been installed from the gallery
		// (or elsewhere).  Don't print debug messages,
		debug = !manifest.update_url;
		afterManifestLoad();
	}
	xhr.send();
}

function $(a) {
	return document.getElementById(a);
}

function log() {
	if (debug) {
		console.log.apply(console, arguments);
	}
}

var settings;
var updater;
function afterManifestLoad() {
	settings = new Settings();
	updater = new Updater(afterInit);
}

function afterInit() {
	if (chrome.browserAction.onClicked) {
		chrome.browserAction.onClicked.addListener(function() {
			if (updater.getOneClickOpenUnread() &&
				updater.getUnreadServices(false).length > 0) {
				
				updater.popupOpenUnread(false);
				return;
			}
		});
	}
	applySettings();
	
	updater.start();
}

function applySettings() {
	updater.fixPopupShown();
	
	if (!settings.get("notifications", "desktopnotifications")) {
		updater.hideNotification();
	}
}