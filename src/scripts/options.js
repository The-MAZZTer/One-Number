var bg = chrome.extension.getBackgroundPage();
var updater = bg.updater;
var Settings = bg.Settings;
var settings = bg.settings;

var deletedServices = [];

function colorChanged(id) {
	var textbox = $(id);
	var preview = $(id + "_preview");
	var o = Settings.colorRRGGBBAAToObject(textbox.value);
	
	preview.style.backgroundColor = "rgb(" + o.r + ", " + o.g + ", " + o.b
		+ ")";
	preview.style.opacity = o.a / 255;
	
	itemChanged();
}

function itemChanged() {
	$("ok").disabled = false;
	$("cancel").textContent = chrome.i18n.getMessage("cancel");
	$("apply").disabled = false;
}

function applySettings(callback) {
	settings.applyPendingGroups();
	for (var i = 0; i < deletedServices.length; i++) {
		settings.removeGroup(deletedServices[i]);
	}
	
	window.callbacks = 0;
	window.callback = callback;
	
	var groups = settings.settings;
	for (var i in groups) {
		if (groups[i].type == Settings.GroupTypes.Hidden) {
			continue;
		}
	
		var s = groups[i].settings;
		if (s["service"]) {
			// Ensure stored in localStorage
			settings.set(i, "service", settings.get(i, "service"));
		}
		
		for (var j in s) {
			if (s[j].type == Settings.SettingTypes.Hidden) {
				continue;
			}
			
			if (settings.validate(i, j, document)) {
				if (!settings.applyHTMLValue(i, j, document, savedSetting)) {
					window.callbacks++;
				}
			}
		}
	}
	
	if (window.callbacks == 0) {
		finishSavingSettings();
	}
}

function savedSetting() {
	if (--window.callbacks == 0) {
		finishSavingSettings();
	}
}

function finishSavingSettings() {
	var order = [];
	for (var node = $("enabledservices").firstChild; node; node =
		node.nextSibling) {
		
		if (node.nodeType != Node.ELEMENT_NODE) {
			continue;
		}
		
		order.push(node.service);
	}
	
	settings.set("hidden", "serviceOrder", order);

	deletedServices = [];
	
	updater.hideFirstNotification = false;
	updater.initHandler = function() {
		updater.start();
	}
	updater.loadServices();
	bg.applySettings();
	
	for (var node = $("enabledservices").firstChild; node; node =
		node.nextSibling) {
		
		if (node.nodeType != Node.ELEMENT_NODE) {
			continue;
		}
		
		var name = updater.services[node.service].getDisplayName();
		node.getElementsByTagName("p")[0].textContent = name;
	}

	$("ok").disabled = true;
	$("cancel").textContent = chrome.i18n.getMessage("close");
	$("apply").disabled = true;
	
	if (window.callback) {
		window.callback();
	}
}

window.onbeforeunload = function() {
	if (!document.getElementById("ok").disabled) {				
		return chrome.i18n.getMessage("leave_prompt");
	}
	return null;
}

function createGroup(name) {
	var elements = [];
	var groups = settings.settings;
	
	var a = document.createElement("a");
	a.className = "section-header";
	a.href = "javascript:;";
	a.sectionId = "group_" + name;
	a.onclick = function() {
		expandCollapse(this.sectionId);
	}
	
	var img = document.createElement("img");
	if (groups[name].startCollapsed) {
		img.src = "images/pages/expand.png";
		img.setAttribute("i18n-values", "alt:expand; title:expand;");
	} else {
		img.src = "images/pages/collapse.png";
		img.setAttribute("i18n-values", "alt:collapse; title:collapse;");
	}
	img.id = "group_" + name + "button";
	a.appendChild(img);

	a.appendChild(document.createTextNode(" "));
	
	var span = document.createElement("span");
	span.setAttribute("i18n-content", groups[name].text);
	a.appendChild(span);
	
	elements.push(a);
	
	var div = document.createElement("div");
	div.className = "section"
	div.id = "group_" + name;
	
	if (groups[name].startCollapsed) {
		div.style.display = "none";
	}
	
	elements.push(div);
	
	return elements;
}

function init() {
	settings.resetPendingGroups();

	var options = $("options");
	var groups = settings.settings;
	for (var i in groups) {
		if (groups[i].type != Settings.GroupTypes.Normal) {	
			continue;
		}
		
		var elements = createGroup(i);
		for (var j = 0; j < elements.length; j++) {
			options.appendChild(elements[j]);
		}
		
		var container = $("group_" + i);
		
		var s = groups[i].settings;
		for (var j in s) {
			var func;
			if (s[j].type == Settings.SettingTypes.Color) {
				func = function() {
					colorChanged(this.id);
				}
			} else {
				func = itemChanged;
			}

			func.service = updater.services.i;
			elements = settings.createSettingHTML(i, j, document, func);
			delete func.service;
			
			for (var k = 0; k < elements.length; k++) {
				container.appendChild(elements[k]);
			}
		}
	}
	
	var allservices = updater.getAvailableServices();
	for (var i = 0; i < allservices.length; i++) {
		var div = document.createElement("div");
		div.draggable = true;
		div.service = i;
		div.ondragstart = function(e) {
			window.dragorigin = "allservices";
			e.dataTransfer.setData("Text", this.service);
			return true;
		}

		var img = document.createElement("img");
		img.src = allservices[i].imagelist.normal;
		div.appendChild(img);
		
		div.appendChild(document.createTextNode(allservices[i].displayname));
	
		$("allservices").appendChild(div);
	}
	
	for (var i in updater.services) {
		createListItem(updater.services[i], i, null);
	}
	
	$("ok").disabled = true;
	$("cancel").textContent = chrome.i18n.getMessage("close");
	$("apply").disabled = true;
}

function createListItem(s, id, beforeNode) {
	var div = document.createElement("div");
	div.draggable = true;
	div.service = id;
	div.ondragstart = function(e) {
		window.dragorigin = "enabledservices";
		e.dataTransfer.setData("Text", this.service);
		return true;
	}
	
	var img = document.createElement("img");
	img.src = (s.prototype || s.__proto__).constructor.imagelist.normal;
	div.appendChild(img);
	
	var p = document.createElement("p");
	p.textContent = s.getDisplayName();
	div.appendChild(p);
	
	var p = document.createElement("p");
	p.textContent = "";
	div.appendChild(p);

	var clear = document.createElement("clear");
	clear.className = "clear";
	
	$("enabledservices").insertBefore(div, beforeNode);
	
	var div2 = document.createElement("div");
	div2.item = div;
	div.properties = div2;
	
	for (var j in settings.getGroup(id).settings) {
		var func;
		if (settings.getGroup(id).settings[j].type ==
			Settings.SettingTypes.Color) {
			
			func = function() {
				colorChanged(this.id);
			}
		} else {
			func = itemChanged;
		}
		
		func.service = s;
		elements = settings.createSettingHTML(id, j, document, func);
		delete func.service;
		for (var k = 0; k < elements.length; k++) {
			div2.appendChild(elements[k]);
		}
	}
	
	$("servicesettings").appendChild(div2);
}

function selectitem(list, item, props) {
	while (item.nodeType != Node.ELEMENT_NODE || item.nodeName != "DIV") {
		item = item.parentNode;
	}

	if (item.hasAttribute("selected")) {
		return;
	}
	
	for (var node = list.firstChild; node; node = node.nextSibling) {
		if (node.nodeType != Node.ELEMENT_NODE) {
			continue;
		}
			
		node.removeAttribute("selected");
	}

	if (props) {
		updateProps(item);
	}
	
	if (list == item) {
		return;
	}
	
	item.setAttribute("selected", "selected");
}

function updateProps(item) {
	$("servicesettingsheader").style.display = "";

	for (var node = $("servicesettings").firstChild; node; node =
		node.nextSibling) {
		
		if (node.nodeType != Node.ELEMENT_NODE) {
			continue;
		}
		
		node.style.display = (node === item.properties) ? "block" : "";
		if (node.style.display) {
			$("servicesettingsheader").style.display = "block";
		}
	}
}

function drop(e) {
	var beforeNode = null;
	if ($("enabledservices") !== e.target) {
		beforeNode = e.target;
		while (beforeNode.parentNode !== $("enabledservices")) {
			beforeNode = beforeNode.parentNode;
		}
	}

	if (window.dragorigin == "allservices") {
		var service = updater.getAvailableServices()[e.dataTransfer.getData(
			"Text")];
		var id = settings.createUniqueGroupId("service");

		settings.markPendingGroup(id);
		var newservice = new service(id);
		
		createListItem(newservice, id, beforeNode);
		
		itemChanged();
	} else if (window.dragorigin == "enabledservices") {
		var servicename = e.dataTransfer.getData("Text");
		var dropnode = null;
		
		// We have to find the dragged node again.
		// Chrome certainly won't tell us!
		var isBelow = true;
		for (var node = $("enabledservices").firstChild; node; node =
			node.nextSibling) {
			
			if (node === beforeNode) {
				isBelow = false;
			}
			
			if (node.service === servicename) {
				dropnode = node;
				break;
			}
		}
		
		if (dropnode === beforeNode) {
			return;
		}
		
		$("enabledservices").removeChild(dropnode);

		if (isBelow && beforeNode) {
			beforeNode = beforeNode.nextSibling;
		}
		
		$("enabledservices").insertBefore(dropnode, beforeNode);
		
		itemChanged();
	}
}

window.ondrop = function(e) {
	if (window.dragorigin != "enabledservices") {
		return;
	}
	
	var node = e.target;
	while (node !== document.body) {
		if (node === $("enabledservices")) {
			return;
		}
		
		node = node.parentNode;
	}
	
	var servicename = e.dataTransfer.getData("Text");
	deletedServices.push(servicename);
	var dropnode = null;
		
	// We have to find the dragged node again.
	// Chrome certainly won't tell us!
	for (var node = $("enabledservices").firstChild; node; node =
		node.nextSibling) {
		
		if (node.service === servicename) {
			dropnode = node;
			break;
		}
	}
	
	$("enabledservices").removeChild(dropnode);
	$("servicesettings").removeChild(dropnode.properties);
	$("servicesettingsheader").style.display = "";
	
	itemChanged();
}

window.onload = function() {
	init();
	i18nTemplate.process(document);
	updateNav();
	
	NodeList.prototype.forEach = Array.prototype.forEach;
	
	document.querySelectorAll(".section-header").forEach(function(val, index, a) {
		val.onclick = function() {
			expandCollapse(this.nextElementSibling.id);
		}
	});
	
	$("allservices").onmousedown = function(e) {
		selectitem(this, e.target, false);
	}
	$("enabledservices").onmousedown = function(e) {
		selectitem(this, e.target, true);
	}
	$("enabledservices").ondragover = function() {
		return false;
	}
	$("enabledservices").ondrop = drop;
	
	$("ok").onclick = function() {
		applySettings(window.close.bind(window));
	}
	$("cancel").onclick = window.close.bind(window);
	$("apply").onclick = applySettings();
}

window.ondragover = function() {
	return window.dragorigin != 'enabledservices';
}