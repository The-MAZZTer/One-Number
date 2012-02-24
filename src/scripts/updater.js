window.PERMISSION_ALLOWED = 0;
window.PERMISSION_NOT_ALLOWED = 1;
window.PERMISSION_DENIED = 2;

function Updater(initHandler) {
	this.popup = null;
	this.notification = null;
	this.notificationTimer = new Timer(this, "showNotification", [true], 1000);
	this.initHandler = initHandler;
	
	this.hideFirstNotification = true;
	
	this.initSettings();
	this.loadServices();
}

Updater.prototype.getBadgeServices = function() {
	var services = [];
	for (var i in this.services) {
		if (this.services[i].getShowOnBadge()) {
			services.push(this.services[i]);
		}
	}
	return services;
}
	
Updater.prototype.start = function() {
	log("Updater: Starting update.");
		
	for (var i in this.services) {
		this.services[i].update();
	}
	this.update();
}

Updater.prototype.refresh = function() {
	log("Updater: Starting update.");
		
	for (var i in this.services) {
		this.services[i].resetCheckTime();
		this.services[i].update();
	}
}

Updater.prototype.isSomeError = function(services) {
	if (services instanceof Array) {
		for (var i = 0; i < services.length; i++) {
			if (services[i].getError() != Service.ErrorTypes.ok) {
				return true;
			}
		}
	} else {
		for (var i in services) {
			if (services[i].getError() != Service.ErrorTypes.ok) {
				return true;
			}
		}
	}
	return false;
}

Updater.prototype.isSomeLoggedIn = function(services) {
	if (services instanceof Array) {
		for (var i = 0; i < services.length; i++) {
			if (services[i].getLoggedIn()) {
				return true;
			}
		}
	} else {
		for (var i in services) {
			if (services[i].getLoggedIn()) {
				return true;
			}
		}
	}
	return false;
}
	
Updater.prototype.isSomeLoggedOut = function(services) {
	if (services instanceof Array) {
		for (var i = 0; i < services.length; i++) {
			if (!services[i].getLoggedIn()) {
				return true;
			}
		}
	} else {
		for (var i in services) {
			if (!services[i].getLoggedIn()) {
				return true;
			}
		}
	}
	return false;
}
	
Updater.prototype.buildTooltip = function(services) {
	var tooltip = "";
	for (var i = 0; i < services.length; i++) {
		if (tooltip != "") {
			tooltip += chrome.i18n.getMessage("tooltip_service_separator");
		}
		
		if (services[i].getError() != Service.ErrorTypes.ok) {
			tooltip += chrome.i18n.getMessage("tooltip_service_error",
				services[i].getDisplayName());
		} else if (!(services[i].getLoggedIn())) {
			tooltip += chrome.i18n.getMessage("tooltip_service_login",
				services[i].getDisplayName());
		} else {
			tooltip += chrome.i18n.getMessage("tooltip_service", [
				services[i].getDisplayName(), services[i].getUnreadCount().toString()
			]);
		}
	}
	return tooltip;
}

Updater.prototype.buildNotification = function(services, doc) {
	var nodes = [];
	var p;
	for (var i = 0; i < services.length; i++) {
		p = doc.createElement("p");
		
		if (services[i].getError() != Service.ErrorTypes.ok) {
			p.textContent = chrome.i18n.getMessage("tooltip_service_error",
				services[i].getDisplayName());
		} else if (!(services[i].getLoggedIn())) {
			p.textContent = chrome.i18n.getMessage("tooltip_service_login",
				services[i].getDisplayName());
		} else {
			p.textContent = chrome.i18n.getMessage("tooltip_service", [
				services[i].getDisplayName(), services[i].getUnreadCount().toString()
			]);
		}
		
		nodes.push(p);
	}
	return nodes;
}

Updater.prototype.update = function() {
	log("Updater: Updating UI.");

	var services = this.getBadgeServices();
		
	var color = null;
	if (this.getShowLoggedOut() && this.isSomeLoggedOut(services)) {
		color = this.getLoggedOutColor();
	} else if (this.getShowError() && this.isSomeError(services)) {
		color = this.getErrorColor();
	} else {
		var count = 0;
		for (var i = 0; i < services.length; i++) {
			var c = services[i].getUnreadCount();
			if (c > 0) {
				if (color == null) {
					count = c;
					color = services[i].getColor();
				} else if (settings.get("toolbar_buttons", "showmulti")) {
					color = this.getMultiColor();
					break;
				} else if (c > count) {
					count = c;
					color = services[i].getColor();
				}
			}
		}
	}
	
	if (color != null) {
		chrome.browserAction.setBadgeBackgroundColor({color: [color.r, color.g,
			color.b, color.a]});
	}
	
	var total = 0;
	for (var i = 0; i < services.length; i++) {
		total += services[i].getUnreadCount();
	}
	if (total <= 0) {
		if (this.getShowLoggedOut() && this.isSomeLoggedOut(services)) {
			chrome.browserAction.setBadgeText({
				text: chrome.i18n.getMessage("badge_login")
			});
			chrome.browserAction.setIcon({
				path: "images/browser_action/logo-err.png"
			});
		} else if (this.getShowError() && this.isSomeError(services)) {
			chrome.browserAction.setBadgeText({
				text: chrome.i18n.getMessage("badge_error")
			});
			chrome.browserAction.setIcon({
				path: "images/browser_action/logo-err.png"
			});
		} else {
			chrome.browserAction.setBadgeText({
				text: chrome.i18n.getMessage("badge_no_unread")
			});
			chrome.browserAction.setIcon({
				path: "images/browser_action/logo.png"
			});
		}
	} else {
		total = Math.min(total, 9999);
		chrome.browserAction.setBadgeText({text: total.toString()});
		
		/* var path = "";
		for (var i = 0; i < services.length; i++) {
			if (services[i].getUnreadCount() > 0) {
				if (path != "") {
					path += "-";
				}
				path += services[i].__proto__.constructor.name.toLowerCase();
			}
		}
		chrome.browserAction.setIcon({path: "images/browser_action/" + path +
			".png"}); */
		chrome.browserAction.setIcon({imageData: this.buildImage(services,
			$("canvas"))});
	}
	chrome.browserAction.setTitle({title: this.buildTooltip(services)});
	
	var views = chrome.extension.getViews();
	for (var i = 0; i < views.length; i++) {
		if (views[i].onupdate) {
			views[i].onupdate(this);
		}
	}
	
	this.updatePopup();

	var showNotification = false;
	var isFirstNotification = true;
	for (var i = 0; i < services.length; i++) {
		showNotification = showNotification || services[i].hasNewMessages();
		
		if (services[i].timesUpdated >= 2) {
			isFirstNotification = false;
		}
	}
	if (showNotification && (!this.hideFirstNotification ||
		(this.hideFirstNotification && !isFirstNotification))) {
		
		this.showNotification();
	}
	
	this.fixPopupShown();
}

Updater.prototype.fixPopupShown = function() {
	if (chrome.browserAction.setPopup) {
		if (this.getOneClickOpenUnread() &&
			this.getUnreadServices(false).length > 0) {
			
			chrome.browserAction.setPopup({popup: ""});
		} else {
			chrome.browserAction.setPopup({popup: "popup.html"});
		}
	}
}

Updater.prototype.showNotification = function(timerFired) {
	if (!timerFired) {
		this.notificationTimer.start();
		return;
	}

	this.hideNotification();
	
	log("Updater: Showing notification.");
	
	this.playNotifySound();
	
	if (!settings.get("notifications", "desktopnotifications")) {
		return;
	}
	
	var notifications = window.notifications || window.webkitNotifications;
	if (!notifications) {
		return;
	}
	
	if (notifications.checkPermission() !== window.PERMISSION_ALLOWED) {
		return;
	}
	
	this.notification = notifications.createHTMLNotification("notification.html");
	this.notification.updater = this;
	this.notification.onerror = function() {
		log("Updater: Notification error.");
		this.updater.notification = null;
	}
	this.notification.onclose = function() {
		log("Updater: Notification closed.");
		this.updater.notification = null;
	}
	
	this.notification.show();
}
	
Updater.prototype.hideNotification = function() {
	if (this.notification) {
		log("Updater: Hiding notification.");

		this.notification.cancel();
		this.notification = null;
	}
}
	
Updater.prototype.popupOpened = function(p) {
	log("Updater: Popup opened.");
	
	this.popup = p;
	
	if (this.getOneClickOpenUnread() && this.getUnreadServices(false).length >
		0) {
		
		this.popup.window.close();
		this.popupOpenUnread(false);
		return;
	}
		
	this.updatePopup();
	
	if (settings.get("hidden", "showPopupHint")) {
		p.document.getElementById("popupHint").style.display = "block";
	}
}
	
Updater.prototype.popupClosed = function() {
	log("Updater: Popup closed.");
		
	this.popup = null;
}
	
Updater.prototype.updatePopup = function() {
	log("Updater: Updating popup.");
	
	if (this.popup == null) {
		return;
	}
	
	var doc = this.popup.document;
	
	var any = false;
	var anyunread = false;
	for (var i in this.services) {
		any = true;
		if (this.services[i].getUnreadCount() > 0) {
			anyunread = true;
			break;
		}
	}

	var noopen = doc.getElementById("noopen");
	var open = doc.getElementById("open");
	if (anyunread) {
		open.style.display = "inline";
		noopen.style.display = "none";
	} else {
		open.style.display = "none";
		noopen.style.display = "inline";
	}
	
	var content = doc.getElementById("dynamiccontent");
	while (content.firstChild != null) {
		content.removeChild(content.firstChild);
	}
	
	var first = true;
	
	for (var i in this.services) {
		var div;
		if (settings.get("popup", "showiconstext") == "icons" &&
			!settings.get("popup", "showseparators")) {
			
			div = doc.createElement("span");
		} else {
			div = doc.createElement("div");
		}
		
		if (first || settings.get("popup", "showseparators")) {
			var hr = doc.createElement("hr");
			if (first) {
				content.appendChild(hr);
			} else {
				div.appendChild(hr);
			}
		}
		
		var extra = this.services[i].getExtraUrl();
		if (div.nodeName != "SPAN" && extra && settings.get(i, "showextra")) {
			var compose = doc.createElement("a");
			compose.href = "javascript:;";
			compose.setAttribute("onclick", "openExtra('" + this.services[i].uid +
				"');");
			compose.className = "compose";
			compose.textContent = chrome.i18n.getMessage("gmail_compose");
			div.appendChild(compose);
		}
		
		var a = doc.createElement("a");
		a.href = "javascript:;";
		a.className = "name";
		a.setAttribute("onclick", "tabopen('" + this.services[i].uid + "');");
		
		var unread = this.services[i].getUnreadCount();
		var preview = this.services[i].getPreview();
		
		if (settings.get("popup", "showiconstext") != "text") {
			var img = doc.createElement("img");
			img.src = this.services[i].getImage();
			img.alt = this.services[i].getDisplayName();
			img.title = (this.services[i].getDisplayName() + " (" + unread + ") " +
				preview.htmlstriptags()).trim();
			
			var size = settings.get("popup", "bigicons") ? 32 : 16;
			img.style.width = size + "px";
			img.style.height = size + "px";
			
			a.appendChild(img);
			if (settings.get("popup", "showiconstext") == "iconstext") {
				a.appendChild(doc.createTextNode(" "));
			}
		}
		
		if (settings.get("popup", "showiconstext") != "icons") {
			a.appendChild(doc.createTextNode(this.services[i].getDisplayName()));
		}
		
		div.appendChild(a);
		//div.appendChild(doc.createTextNode(" - "));
		 
		if (settings.get("popup", "showiconstext") != "icons") {
			if ((this.services[i].getLoggedIn() && this.services[i].getError() ==
				Service.ErrorTypes.ok && !this.services[i].refreshing) || unread > 0) {
				
				div.appendChild(doc.createTextNode(" ("));
				
				var span = doc.createElement("span");
				span.className = "unread";
				span.appendChild(doc.createTextNode(unread));
				div.appendChild(span);

				div.appendChild(doc.createTextNode(")"));
			}
			
			if (this.services[i].refreshing) {
				div.appendChild(doc.createTextNode(chrome.i18n.
					getMessage("popup_refreshing")));
			} else if (this.services[i].getError() != Service.ErrorTypes.ok) {
				div.appendChild(doc.createTextNode(chrome.i18n.
					getMessage("popup_error")));
			} else if (!this.services[i].getLoggedIn()) {
				div.appendChild(doc.createTextNode(chrome.i18n.
					getMessage("popup_need_login")));
			}
		
			var previewtag;
			if (settings.get("popup", "showpreviews") && preview && preview.length) {
				if (settings.get("popup", "showiconstext") == "text" ||
					!settings.get("popup", "bigicons")) {
					
					previewtag = doc.createElement("span");
					div.appendChild(doc.createTextNode(" "));
				} else {
					previewtag = doc.createElement("p");
				}
				previewtag.className = "preview";
				previewtag.innerHTML = preview;
				div.appendChild(previewtag);
			}
			
			var clear = doc.createElement("div");
			clear.className = "clear";
			div.appendChild(clear);
		}

		content.appendChild(div);
		
		first = false;
	}
}

// openedFromPopup is false when opened straight from the badge
Updater.prototype.getUnreadServices = function(openedFromPopup) {
	var ret = [];
	
	for (var i in this.services) {
		if (this.services[i].getUnreadCount() <= 0) {
			continue;
		}
		
		if (!this.services[i].getShowOnBadge() && !openedFromPopup && !this.
			getOpenHiddenUnread()) {
			
			continue;
		}
		
		ret.push(this.services[i]);
	}
	
	return ret;
}

Updater.prototype.popupOpenUnread = function(openedFromPopup) {
	log("Updater: Open Unread clicked in popup.");
	
	var services = this.getUnreadServices(openedFromPopup);
	for (var i = 0; i < services.length; i++) {
		this.openPage(services[i].getUrl(), services[i], i == 0);
	}
}

Updater.prototype.getUpdateInterval = function() {
	return settings.get("server_queries", "updateint");
}

Updater.prototype.getTimeout = function() {
	return settings.get("server_queries", "timeout");
}
	
Updater.prototype.getErrorColor = function() {
	return settings.get("toolbar_buttons", "errorcolor");
}

Updater.prototype.getLoggedOutColor = function() {
	return settings.get("toolbar_buttons", "loggedoutcolor");
}

Updater.prototype.getMultiColor = function() {
	return settings.get("toolbar_buttons", "multicolor");
}
	
Updater.prototype.getProtocol = function() {
	return settings.get("basic_options", "protocol") ? "https" : "http";
}

Updater.prototype.getAlwaysRefresh = function() {
	return settings.get("basic_options", "alwaysrefresh");
}

Updater.prototype.openPage = function(url, service, createWindow) {
	log("Updater: Opening " + url);

	var compareurl = url.toLowerCase();
	var index = url.indexOf("://");
	if (index > -1) {
		compareurl = url.substr(index + 3);
	}
	
	if (this.getReuseTabs()) {
		var me = this;
				
		chrome.windows.getAll({ populate: true }, function(windows) {
			//chrome.tabs.getAllInWindow(null, function(tabs) {
			for (var i = 0; i < windows.length; i++) {
				var tabs = windows[i].tabs;
				for (var j = 0; j < tabs.length; j++) {
					var taburl = tabs[j].url.toLowerCase();
					
					index = taburl.indexOf("://");
					if (index <= -1) {
						continue;
					}
					
					var protocol = taburl.substr(0, index);
					if (protocol != "https" && protocol != "http") {
						continue;
					}
					
					taburl = taburl.substr(index + 3);
					
					var allow = (compareurl == taburl);
					if (me.getBePickyAboutReuse()) {
						allow = allow || (service && service.isURLReusable(taburl));
					} else {
						allow = allow || taburl.startsWith(compareurl);
					}
					
					if (allow) {
						chrome.tabs.update(tabs[j].id, {selected: true});
						if (me.getAlwaysRefresh()) {
							chrome.tabs.update(tabs[j].id, {url: url});
						}
						return;
					}
				}
			}
			//}	
				
			if (createWindow && me.getOpenInNewWindow()) {
				chrome.windows.create({ url: url });
				return;
			}
			chrome.tabs.create({ url: url });
		});
	}
}

Updater.prototype.openByUID = function(index) {
	log("Updater: openByUID fired.");
	this.openPage(this.services[index].getUrl(), this.services[index], true);
}

Updater.prototype.getReuseTabs = function() {
	return settings.get("basic_options", "reusetabs");
}

Updater.prototype.getBePickyAboutReuse = function() {
	return settings.get("basic_options", "bepickyaboutreuse");
}

Updater.prototype.getOpenInNewWindow = function() {
	return settings.get("basic_options", "openinnewwindow");
}

Updater.prototype.openExtra = function(index) {
	if (this.getOpenInNewWindow()) {
		chrome.windows.create({ url: this.services[index].getExtraUrl() });
	} else {
		chrome.tabs.create({ url: this.services[index].getExtraUrl() });
	}
}

Updater.prototype.getOneClickOpenUnread = function() {
	return settings.get("basic_options", "oneclickopenunread");
}

Updater.prototype.getOpenHiddenUnread = function() {
	return settings.get("basic_options", "openhiddenunread");
}
	
Updater.prototype.getShowError = function() {
	return settings.get("toolbar_buttons", "showerror");
}

Updater.prototype.getShowLoggedOut = function() {
	return settings.get("toolbar_buttons", "showloggedout");
}

Updater.prototype.buildImage = function(services, canvas) {
	services = services.clone();
	for (var i = 0; i < services.length; i++) {
		if (!services[i].getUnreadCount()) {
			services.removeAt(i);
			i--;
		}
	}
	
	QuickSort(services, function(services, index) {
		return services[index].getUnreadCount();
	});
	
	if (this.getMaxActionIcons() > 0) {
		while (services.length > this.getMaxActionIcons()) {
			services.removeAt(0);
		}
	}
	
	var size = Math.min(canvas.width, canvas.height);
	var imgsize = size * Math.pow(services.length, -0.5);
	var offset;
	if (services.length > 1) {
		offset = (size - imgsize) / (services.length - 1);
	} else {
		offset = 0;
	}
	
	var canvasContext = canvas.getContext("2d");
	canvasContext.clearRect(0, 0, canvas.width, canvas.height);
	
	for (var i = 0; i < services.length; i++) {
		var img = $("service_" + services[i].__proto__.constructor.name.
			toLowerCase() + "_" +	services[i].getImageKey());
		canvasContext.drawImage(img, size - imgsize - (offset * i), offset * i,
			imgsize, imgsize);
	}
	
	if (services.length == 0) {
		canvasContext.drawImage($("logo"), 0, 0, canvas.width, canvas.height);
	}
	
	return canvasContext.getImageData(0, 0, canvas.width, canvas.height);
}

Updater.prototype.getMaxActionIcons = function() {
	return settings.get("toolbar_buttons", "maxactionicons");
}

Updater.prototype.initSettings = function() {
	settings.addGroup("basic_options", {
		type: Settings.GroupTypes.Normal,
		startCollapsed: false
	});
	
	settings.addSetting("basic_options", "oneclickopenunread", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: false
	});
	settings.addSetting("basic_options", "openhiddenunread", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: false,
		classes: "indent"
	});
	settings.addSetting("basic_options", "protocol", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: true
	});
	
	settings.addSetting("basic_options", "openinnewwindow", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: false,
		header: "opening_service"
	});
	settings.addSetting("basic_options", "reusetabs", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: true
	});
	settings.addSetting("basic_options", "bepickyaboutreuse", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: true,
		classes: "indent"
	});
	settings.addSetting("basic_options", "alwaysrefresh", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: true,
		classes: "indent"
	});
	
	settings.addGroup("server_queries", {
		type: Settings.GroupTypes.Normal,
		startCollapsed: true
	});
	
	settings.addSetting("server_queries", "updateint", {
		type: Settings.SettingTypes.Numeric,
		defaultValue: 300,
		minValue: 1,
		text: "before_updateint",
		text2: "after_updateint"
	});
	settings.addSetting("server_queries", "timeout", {
		type: Settings.SettingTypes.Numeric,
		defaultValue: 15,
		minValue: 1,
		text: "before_timeout",
		text2: "after_timeout"
	});
	
	settings.addGroup("toolbar_buttons", {
		type: Settings.GroupTypes.Normal,
		startCollapsed: true
	});
	settings.addSetting("toolbar_buttons", "showerror", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: true,
		header: "no_unread_messages"
	});
	settings.addSetting("toolbar_buttons", "errorcolor", {
		type: Settings.SettingTypes.Color,
		defaultValue: { r: 127, g: 127, b: 127, a: 255 }
	});
	settings.addSetting("toolbar_buttons", "showloggedout", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: true
	});
	settings.addSetting("toolbar_buttons", "loggedoutcolor", {
		type: Settings.SettingTypes.Color,
		defaultValue: { r: 127, g: 127, b: 127, a: 255 }
	});
	settings.addSetting("toolbar_buttons", "showmulti", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: false
	});
	settings.addSetting("toolbar_buttons", "multicolor", {
		type: Settings.SettingTypes.Color,
		defaultValue: { r: 127, g: 0, b: 255, a: 255 }
	});
	settings.addSetting("toolbar_buttons", "maxactionicons", {
		type: Settings.SettingTypes.Numeric,
		defaultValue: 3,
		minValue: 1
	});

	settings.addGroup("popup", {
		text: "options_popup",
		type: Settings.GroupTypes.Normal,
		startCollapsed: true
	});
	settings.addSetting("popup", "showiconstext", {
		header: "options_showiconstextheader",
		type: Settings.SettingTypes.List,
		options: {
			"text": "options_showtext",
			"icons": "options_showicons",
			"iconstext": "options_showiconstext"
		},
		defaultValue: "iconstext"
	});
	settings.addSetting("popup", "bigicons", {
		text: "options_bigicons",
		type: Settings.SettingTypes.Boolean,
		defaultValue: true,
	});
	settings.addSetting("popup", "showpreviews", {
		text: "options_showpreviews",
		type: Settings.SettingTypes.Boolean,
		defaultValue: true
	});
	settings.addSetting("popup", "showseparators", {
		text: "options_showseparators",
		type: Settings.SettingTypes.Boolean,
		defaultValue: true
	});
	
	settings.addGroup("notifications", {
		text: "options_notifications",
		type: Settings.GroupTypes.Normal,
		startCollapsed: true
	});
	settings.addSetting("notifications", "desktopnotifications", {
		text: "options_desktopnotifications",
		type: Settings.SettingTypes.Boolean,
		defaultValue: false
	});
	settings.addSetting("notifications", "timeout", {
		type: Settings.SettingTypes.Numeric,
		defaultValue: 5,
		minValue: 0,
		text: "before_notifytimeout",
		text2: "after_notifytimeout"
	});
	settings.addSetting("notifications", "audiofile", {
		type: Settings.SettingTypes.AudioFile,
		defaultValue: "",
		header: "options_audiofile"
	});

	settings.addGroup("hidden", {
		type: Settings.GroupTypes.Hidden,
		startCollapsed: false
	});
	settings.addSetting("hidden", "serviceOrder", {
		type: Settings.SettingTypes.Hidden,
		defaultValue: null
	});
	settings.addSetting("hidden", "showPopupHint", {
		type: Settings.SettingTypes.Hidden,
		defaultValue: true
	});
}

Updater.prototype.getAvailableServices = function() {
	var all = [];
	for (var i in window) {
		if (window[i] && window[i].superClass_ === Service.prototype) {
			all.push(window[i]);
		}
	}
	return all;
}

Updater.prototype.loadServices = function() {
	var order = settings.get("hidden", "serviceOrder");
	if (!order) {
		settings.set("hidden", "serviceOrder", order = ["service0", "service1"]);
		this.services = {
			"service0": new Gmail("service0"),
			"service1": new GoogleReader("service1")
		}
		settings.set("service0", "service", "Gmail");
		settings.set("service1", "service", "GoogleReader");
	} else {
		this.services = {};
		for (var i = 0; i < order.length; i++) {
			var classname = settings.get(order[i], "service");
			this.services[order[i]] = new window[classname](order[i]);
		}
	}

	var allservices = this.getAvailableServices();
	
	this.imgLoading = 0;
	for (var i = 0; i < allservices.length; i++) {
		for (var j in allservices[i].imagelist) {
			this.imgLoading++;
		}
	}
	for (var i = 0; i < allservices.length; i++) {
		for (var j in allservices[i].imagelist) {
			var img = document.createElement("img");
			img.onload = function() { updater.onImgLoad(); }
			img.src = allservices[i].imagelist[j];
			img.id = "service_" + allservices[i].name.toLowerCase() + "_" + j;
			document.body.appendChild(img);
		}
	}
}

Updater.prototype.onImgLoad = function() {
	if (!--this.imgLoading && this.initHandler) {
		this.initHandler(this);
	}
}

Updater.prototype.playNotifySound = function() {
	// Have to reload sound every time due to Chrome bug...
	var sound = document.getElementById("notificationsound");
	sound.src = settings.get("notifications", "audiofile") || "about:blank";
	sound.play();
}