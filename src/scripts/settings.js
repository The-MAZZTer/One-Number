function Settings(store) {
	this.settings = {};
	this.store = store ? store : localStorage;
	this.pendingGroups = [];
	this.pending = {};
	
	this.importOldSettings();
}

Settings.GroupTypes = {
	Hidden: 0,
	Normal: 1
}

Settings.SettingTypes = {
	Hidden: 0,
	Boolean: 1,
	Text: 2,
	Numeric: 3,
	Color: 4,
	Password: 5,
	List: 6,
	GReaderFeeds: 7,
	AudioFile: 8
}

Settings.prototype.getGroup = function(groupname) {
	return  this.pending[groupname] ? this.pending[groupname] :
		this.settings[groupname];
}

Settings.prototype.addGroup = function(name, group) {
	if (!group.text) {
		group.text = name;
	}

	for (var i = 0; i < this.pendingGroups.length; i++) {
		if (this.pendingGroups[i] == name) {
			this.pendingGroups.splice(i, 1);
		
			this.pending[name] = group;	
			this.pending[name].settings = {};
			return;
		}
	}

	this.settings[name] = group;	
	this.settings[name].settings = {};
}

Settings.prototype.addSetting = function(group, name, setting) {
	if (!setting.text) {
		setting.text = name;
	}
	this.getGroup(group).settings[name] = setting;
}

Settings.prototype.get = function(group, name) {
	if (!(group in this.pending) && group + "." + name in this.store) {
		return JSON.parse(this.store[group + "." + name]);
	}
	
	return this.getGroup(group).settings[name].defaultValue;
}

Settings.prototype.set = function(group, name, value) {
	if (group in this.pending) {
		throw new Error("Can't set on pending groups!");
	}
	
	this.store[group + "." + name] = JSON.stringify(value);
}

Settings.prototype.removeGroup = function(group) {
	for (var i in this.getGroup(group).settings) {
		this.resetSetting(group, i);
	}

	if (group in this.pending) {
		delete this.pending[group];
	}
	if (group in this.settings) {
		delete this.settings[group];
	}
}

Settings.prototype.removeSetting = function(group, name) {
	delete this.settings[group].settings[name];
	if (group + "." + name in this.store) {
		delete this.store[group + "." + name];
	}
}

Settings.prototype.resetSetting = function(group, name) {
	if (group + "." + name in this.store) {
		delete this.store[group + "." + name];
	}
}

Settings.colorObjectToRRGGBBAA = function(o) {
	var color = { r: 0, g: 0, b: 0, a: 255 };
	for (var i in o) {
		color[i] = o[i];
	}

	var ret = "";
	for (var i in color) {
		var hex = color[i].toString(16).toUpperCase();
		while (hex.length < 2) {
			hex = "0" + hex;
		}
		ret += hex;
	}
	return ret;
}

Settings.colorRRGGBBAAToObject = function(s) {
	var color = { r: 0, g: 0, b: 0, a: 255 };
	var pos = 0;
	for (var i in color) {
		if (pos >= s.length) {
			break;
		}
		
		var hex = s.substr(pos, 2);
		if (hex.length == 1) {
			hex += "0";
		}
		if (hex.length > 0) {
			color[i] = parseInt(hex, 16);
		}
		
		pos += 2;
	}
	
	return color;
}

Settings.prototype.createSettingHTML = function(group, name, doc, func) {
	var s = this.getGroup(group).settings[name];
	
	var elements = [];
	
	if (s.type == Settings.SettingTypes.Hidden) {
		return elements;
	}
	
	if (s.header) {
		var p = doc.createElement("p");
		p.className = "header";
		p.textContent = chrome.i18n.getMessage(s.header);
		elements.push(p);
	}
	
	var div = doc.createElement("div");
	if (s.classes) {
		div.className = s.classes;
	}
	
	var id = "setting_" + group + "_" + name;
	
	switch (s.type) {
		case Settings.SettingTypes.Boolean:
			var input = doc.createElement("input");
			input.type = "checkbox";
			input.id = id;
			input.onclick = func;
			input.onkeyup = func;
			input.checked = this.get(group, name);
			div.appendChild(input);
			
			var label = doc.createElement("label");
			label.htmlFor = id;
			label.textContent = chrome.i18n.getMessage(s.text);
			div.appendChild(label);
			
			break;
		case Settings.SettingTypes.Numeric:
			if (div.className) {
				div.className += " ";
			}
			div.className += "numeric";
		case Settings.SettingTypes.Text:
			var label = doc.createElement("label");
			label.htmlFor = id;
			label.textContent = chrome.i18n.getMessage(s.text);
			div.appendChild(label);

			var input = doc.createElement("input");
			input.type = "text";
			input.id = id;
			input.maxlength = s.maxlength;
			input.onkeyup = func;
			input.value = this.get(group, name);
			div.appendChild(input);
			
			if (s.text2) {
				label = doc.createElement("label");
				label.htmlFor = id;
				label.textContent = chrome.i18n.getMessage(s.text2);
				div.appendChild(label);
			}
		
			break;
		case Settings.SettingTypes.Color:
			var label = doc.createElement("label");
			label.htmlFor = id;
			label.textContent = chrome.i18n.getMessage(s.text);
			elements.push(label);
			
			if (div.className) {
				div.className += " ";
			}
			div.className += "colorbox";
			
			var div2 = doc.createElement("div");
			div2.className = "color";
			div2.id = id + "_preview";
			div.appendChild(div2);
			
			label = doc.createElement("label");
			label.htmlFor = id;
			label.textContent = "#";
			div.appendChild(label);
			
			var input = doc.createElement("input");
			input.type = "text";
			input.maxlength = 8;
			input.onkeyup = func;
			input.id = id;
			
			var o = this.get(group, name);
			input.value = Settings.colorObjectToRRGGBBAA(o);
			div2.style.backgroundColor = "rgb(" + o.r + ", " + o.g + ", " + o.b + ")";
			div2.style.opacity = o.a / 255;
			
			div.appendChild(input);

			break;
		case Settings.SettingTypes.Password:
			var label = doc.createElement("label");
			label.htmlFor = id;
			label.textContent = chrome.i18n.getMessage(s.text);
			div.appendChild(label);

			var input = doc.createElement("input");
			input.type = "password";
			input.id = id;
			input.maxlength = s.maxlength;
			input.onkeyup = func;
			input.value = this.get(group, name);
			div.appendChild(input);
			
			if (s.text2) {
				label = doc.createElement("label");
				label.htmlFor = id;
				label.textContent = chrome.i18n.getMessage(s.text2);
				div.appendChild(label);
			}
		
			break;
		case Settings.SettingTypes.List:
			for (var i in s.options) {
				var div2 = doc.createElement("div");
			
				var input = doc.createElement("input");
				input.type = "radio";
				input.id = id + "_" + i;
				input.name = id;
				input.onchange = func;
				input.value = i;
				input.checked = (i == this.get(group, name));
				
				div2.appendChild(input);
				
				var label = doc.createElement("label");
				label.htmlFor = id + "_" + i;
				label.textContent = chrome.i18n.getMessage(s.options[i]);
				div2.appendChild(label);
				
				div.appendChild(div2);
			}
			
			break;
		case Settings.SettingTypes.GReaderFeeds:
			div.textContent = chrome.i18n.getMessage("options_grloading");

			function checkDupes(div) {
				var data = div.data;
				var warning = div.warning;
				var inputs = div.getElementsByTagName("input");
				
				var feeds = {};
				for (var i = 1; i < inputs.length; i++) {
					if (!(inputs[i].checked)) {
						continue;
					}
					
					if (inputs[i].value.startsWith("feed/")) {
						if (feeds[inputs[i].value]) {
							warning.style.display = "";
							return;
						}
						feeds[inputs[i].value] = true;
					} else {
						for (var j in data.labels[inputs[i].value].feeds) {
							if (feeds[j]) {
								warning.style.display = "";
								return;
							}
							feeds[j] = true;
						}
					}
				}
				
				warning.style.display = "none";
			}
			
			function callback(error, data) {
				var div = callback.div;
				var id = callback.id;
				var func = callback.func;
				var doc = callback.doc;
				var me = callback.me;
			
				switch (error) {
					case Service.ErrorTypes.timeout:
						div.textContent = chrome.i18n.getMessage("preview_timeout");
						return;
					case Service.ErrorTypes.responsenotfound:
					case Service.ErrorTypes.responsenotparsable:
						div.textContent = chrome.i18n.getMessage("preview_response");
						return;
				}
				
				div.textContent = "";
				div.data = data;
				
				var div2 = doc.createElement("div");
				div2.textContent = chrome.i18n.getMessage("options_grwarning");
				div2.style.display = "none";
				div.appendChild(div2);
				div.warning = div2;

				var value = me.get(group, name);
				
				var input = doc.createElement("input");
				input.type = "radio";
				input.id = id;
				input.name = id;
				input.checked = !(value.length);
				input.func = func;
				input.div = div;
				input.value = "";
				input.onchange = function() {
					if (this.div.suppress) {
						return;
					}
					
					var tags = this.div.getElementsByTagName("input");
					this.div.suppress = true;
					for (var i = 0; i < tags.length; i++) {
						if (tags[i] !== this) {
							tags[i].checked = false;
						}
					}
					this.div.suppress = false;
					
					this.div.warning.style.display = "none";
					
					this.func();
				}
				div.appendChild(input);
				
				var label = doc.createElement("label");
				label.htmlFor = id;
				label.textContent = chrome.i18n.getMessage("options_grall");
				div.appendChild(label);
				
				var table = doc.createElement("table");
				var thead = doc.createElement("thead");
				var tr = doc.createElement("tr");

				var th = doc.createElement("th");
				th.textContent = chrome.i18n.getMessage("options_grlabels");
				tr.appendChild(th);

				th = doc.createElement("th");
				th.textContent = chrome.i18n.getMessage("options_grfeeds");
				tr.appendChild(th);

				thead.appendChild(tr);
				table.appendChild(thead);
				
				var tbody = doc.createElement("tbody");
				tr = doc.createElement("tr");
				
				for (var type in data) {
					var td = doc.createElement("td");
				
					for (var i in data[type]) {
						div2 = doc.createElement("div");
				
						input = doc.createElement("input");
						input.type = "checkbox";
						input.id = id + "_" + i;
						input.checked = value.contains(i);
						input.func = func;
						input.div = div;
						input.onchange = function() {
							if (this.div.suppress) {
								return;
							}
						
							var tags = this.div.getElementsByTagName("input");
							for (var i = 1; i < tags.length; i++) {
								if (tags[i].checked) {
									break;
								}
							}
							this.div.suppress = true;
							tags[0].checked = (i == tags.length);
							this.div.suppress = false;
							
							checkDupes(this.div);
							
							this.func();
						}
						input.value = i;
						div2.appendChild(input);
						
						label = doc.createElement("label");
						label.htmlFor = id + "_" + i;
						label.textContent = data[type][i].title;
						div2.appendChild(label);
					
						td.appendChild(div2);
					}

					tr.appendChild(td);
				}
				
				tbody.appendChild(tr);
				table.appendChild(tbody);
				div.appendChild(table);
				checkDupes(div);
			}
			callback.div = div;
			callback.id = id;
			callback.me = this;
			callback.func = func;
			callback.doc = doc;
			
			func.service.getFeedsLabels(callback);
			break;
		case Settings.SettingTypes.AudioFile:
			var p = doc.createElement("div");
			
			var input = doc.createElement("input");
			input.type = "radio";
			input.id = id + "_none";
			input.name = id;
			input.value = "none";
			input.onclick = func;
			input.onkeyup = func;
			var value = this.get(group, name);
			input.checked = value.length == 0;
			p.appendChild(input);
			
			var label = doc.createElement("label");
			label.htmlFor = id + "_none";
			label.textContent = chrome.i18n.getMessage("options_audiofilenone");
			p.appendChild(label);
			
			div.appendChild(p);

			p = doc.createElement("div");
			
			input = doc.createElement("input");
			input.type = "radio";
			input.id = id + "_url";
			input.name = id;
			input.value = "url";
			input.onclick = func;
			input.onkeyup = func;
			input.checked = value.length > 0;
			p.appendChild(input);
			
			label = doc.createElement("label");
			label.htmlFor = id + "_url_text";
			label.textContent = chrome.i18n.getMessage("options_audiofileurl");
			p.appendChild(label);
			
			input = doc.createElement("input");
			input.type = "text";
			input.id = id + "_url_text";
			input.value = value;
			input.onclick = function() {
				this.ownerDocument.getElementById(this.id.substr(0,
					this.id.lastIndexOf("_"))).checked = true;
				this.onkeyup();
			}
			input.onkeyup = func;
			input.checked = value.length > 0;
			p.appendChild(input);
			
			div.appendChild(p);
			
			p = doc.createElement("div");
			
			input = doc.createElement("input");
			input.type = "radio";
			input.id = id + "_file";
			input.name = id;
			input.value = "file";
			input.onclick = func;
			input.onkeyup = func;
			input.checked = false;
			p.appendChild(input);
			
			label = doc.createElement("label");
			label.htmlFor = id + "_file";
			label.textContent = chrome.i18n.getMessage("options_audiofilefile");
			p.appendChild(label);
			
			input = doc.createElement("input");
			input.type = "file";
			input.id = id + "_file_browse";
			input.func = func;
			input.onchange = function() {
				this.ownerDocument.getElementById(this.id.substr(0,
					this.id.lastIndexOf("_"))).checked = true;
				this.func();
			}
			p.appendChild(input);
			
			div.appendChild(p);

			break;
	}
	
	elements.push(div);
	
	return elements;
}

Settings.prototype.resetHTML = function(group, name, doc) {
	var s = this.getGroup(group).settings[name];
	
	if (s.type == Settings.SettingTypes.Hidden) {
		return;
	}
	
	var input = doc.getElementById("setting_" + group + "_" + name);
	var value = this.get(group, name);
	
	switch (s.type) {
		case Settings.SettingTypes.Boolean:
			input.checked = value;
			break;
		case Settings.SettingTypes.Numeric:
		case Settings.SettingTypes.Text:
		case Settings.SettingTypes.Password:
			input.value = value;
			break;
		case Settings.SettingTypes.Color:
			input.value = Settings.colorObjectToRRGGBBAA(value);

			var div2 = input.parentElement.getElementsByTagName("div")[0];
			div2.style.backgroundColor = "rgb(" + value.r + ", " + value.g + ", " +
				value.b + ")";
			div2.style.opacity = value.a / 255;
			
			break;
		case Settings.SettingTypes.List:
			for (var i in s.options) {
				input = doc.getElementById("setting_" + group + "_" + name + "_" + i);
				input.checked = (input.value == value);
			}
			break;
		case Settings.SettingsTypes.GReaderFeeds:
			if (input) {
				var div = input.div;
				var inputs = div.getElementsByTagName("input");

				div.suppress = true;
				inputs[0].checked = !(value.length);
				for (var i = 1; i < inputs.length; i++) {
					inputs[i].checked = value.contains(inputs[i].value);
				}
				div.suppress = false;
			}
			
			break;
		case Settings.SettingTypes.AudioFile:
			var none = doc.getElementById("setting_" + group + "_" + name + "_none");
			var url = doc.getElementById("setting_" + group + "_" + name + "_url");
			var file = doc.getElementById("setting_" + group + "_" + name + "_file");
			
			var text = doc.getElementById("setting_" + group + "_" + name +
				"_url_text");
			text.value = value;
			url.checked = value != "";
			none.checked = value == "";
	}
}

Settings.prototype.applyHTMLValue = function(group, name, doc, callback) {
	var s = this.getGroup(group).settings[name];
	
	if (s.type == Settings.SettingTypes.Hidden) {
		return true;
	}

	var input = doc.getElementById("setting_" + group + "_" + name);
	
	switch (s.type) {
		case Settings.SettingTypes.Boolean:
			this.set(group, name, input.checked);
			return true;
		case Settings.SettingTypes.Numeric:
			this.set(group, name, parseInt(input.value));
			return true;
		case Settings.SettingTypes.Text:
		case Settings.SettingTypes.Password:
			this.set(group, name, input.value);
			return true;
		case Settings.SettingTypes.Color:
			this.set(group, name, Settings.colorRRGGBBAAToObject(input.value));
			return true;
		case Settings.SettingTypes.List:
			for (var i in s.options) {
				input = doc.getElementById("setting_" + group + "_" + name + "_" + i);
				if (input.checked) {
					this.set(group, name, input.value);
					return true;
				}
			}
			this.set(group, name, s.defaultValue);
			return true;
		case Settings.SettingTypes.GReaderFeeds:
			if (input) {
				var div = input.div;
				var inputs = div.getElementsByTagName("input");
				var value = [];
			
				for (var i = 1; i < inputs.length; i++) {
					if (inputs[i].checked) {
						value.push(inputs[i].value);
					}
				}
				this.set(group, name, value);
			}
			return true;
		case Settings.SettingTypes.AudioFile:
			var url = doc.getElementById("setting_" + group + "_" + name + "_url");
			if (url.checked) {
				this.set(group, name, doc.getElementById("setting_" + group + "_" + 
					name + "_url_text").value);
				return true;
			}
			
			var file = doc.getElementById("setting_" + group + "_" + name + "_file");
			if (file.checked) {
				var browse = doc.getElementById("setting_" + group + "_" + name +
					"_file_browse");
					
				var fr = new FileReader();
				fr.onabort = fr.onerror = function() {
					var text = "";
					switch (this.error.code) {
						case FileError.NOT_FOUND_ERR:
							text = chrome.i18n.getMessage("options_audiofileerr_notfound");
							break;
						case FileError.SECURITY_ERR:
							text = chrome.i18n.getMessage("options_audiofileerr_access");
							break;
						case FileError.NOT_READABLE_ERR:
							text = chrome.i18n.getMessage("options_audiofileerr_noshare");
							break;
						case FileError.ENCODING_ERR:
							text = chrome.i18n.getMessage("options_audiofileerr_encoding");
							break;
						default:
							for (i in FileError) {
								if (FileError[i] === this.error.code) {
									text = i;
									break;
								}
							}
							if (text === "") {
								text = this.error.code.toString();
							}
							break;
					}
					
					alert(chrome.i18n.getMessage("options_audiofileerr", text));
					callback();
				}
				var me = this;
				fr.group = group;
				fr.name = name;
				fr.onloadend = function() {
					me.set(this.group, this.name, this.result);
					callback();
				}
				fr.readAsDataURL(browse.files[0]);
				
				return false;
			}
			this.set(group, name, "");
			return true;
	}
}

Settings.prototype.validate = function(group, name, doc) {
	var g = this.getGroup(group);
	var s = g.settings[name];
	var input = doc.getElementById("setting_" + group + "_" + name);
	
	switch (s.type) {
		case Settings.SettingTypes.Hidden:
		case Settings.SettingTypes.Boolean:
		case Settings.SettingTypes.Text:
		case Settings.SettingTypes.Password:
		case Settings.SettingTypes.Color:
		case Settings.SettingTypes.List:
		case Settings.SettingTypes.GReaderFeeds:
			return true;
		case Settings.SettingTypes.Numeric:
			var ret = input.value.isNumeric();
			if (ret && "minValue" in s) {
				ret = input.value >= s.minValue;
			}
			if (ret && "maxValue" in s) {
				ret = input.value <= s.maxValue;
			}

			if (!ret) {
				doc.defaultView.alert(chrome.i18n.getMessage("bad_number", [
					chrome.i18n.getMessage(g.text),
					chrome.i18n.getMessage(s.text),
					chrome.i18n.getMessage(s.text2)
				]));
			}
			return ret;
		case Settings.SettingTypes.AudioFile:
			var url = doc.getElementById("setting_" + group + "_" + name + "_url");
			if (url.checked) {
				return true;
			}
			
			var file = doc.getElementById("setting_" + group + "_" + name + "_file");
			if (!file.checked) {
				return true;
			}
			
			var browse = doc.getElementById("setting_" + group + "_" + name +
				"_file_browse");
			var file = browse.files[0];
			if (!file) {
				doc.defaultView.alert(chrome.i18n.getMessage(
					"options_audiofileerr_nofile", [
					chrome.i18n.getMessage(g.text),
					chrome.i18n.getMessage(s.header)
				]));
				return false;
			}
			
			if (!file.type.toLowerCase().startsWith("audio/")) {
				doc.defaultView.alert(chrome.i18n.getMessage(
					"options_audiofileerr_notaudio", [
					chrome.i18n.getMessage(g.text),
					chrome.i18n.getMessage(s.header)
				]));
				return false;
			}
			
			return true;
	}
}

Settings.prototype.createUniqueGroupId = function(base) {
	var num = 0;
	var curr = base + num.toString();
	while (curr in this.settings || curr in this.pending) {
		num++;
		curr = base + num.toString();
	}
	return curr;
}

Settings.prototype.markPendingGroup = function(groupname) {
	this.pendingGroups.push(groupname);
}

Settings.prototype.applyPendingGroups = function() {
	for (var i in this.pending) {
		this.settings[i] = this.pending[i];
	}
	
	this.resetPendingGroups();
}

Settings.prototype.resetPendingGroups = function() {
	this.pendingGroups = [];
	this.pending = {};
}

Settings.prototype.importOldSettings = function() {
	if (!("timeout" in localStorage)) {
		return;
	}

	var oldsettings = {};
	for (var i = 0; i < localStorage.length; i++) {
		var key = localStorage.key(i);
		oldsettings[key] = localStorage[key];
	}
	
	localStorage.clear();
	this.store.clear();
	
	function colorTranslate(x) {
		var a = x.split(",");
		return {
			r: parseInt(a[0], 10),
			g: parseInt(a[1], 10),
			b: parseInt(a[2], 10),
			a: parseInt(a[3], 10)
		};
	}
	function timeTranslate(x) {
		return parseInt(x, 10) / 1000;
	}
	
	var map = {
		"bePickyAboutReuse": "basic_options.bepickyaboutreuse",
		"oneClickOpenUnread": "basic_options.oneclickopenunread",
		"openHiddenUnread": "basic_options.openhiddenunread",
		"openInNewWindow": "basic_options.openinnewwindow",
		"errorBadgeColor": {
			mapTo: "toolbar_buttons.errorcolor", 
			translate: colorTranslate
		},
		"loggedOutBadgeColor": {
			mapTo: "toolbar_buttons.loggedoutcolor",
			translate: colorTranslate
		},
		"multiBadgeColor": {
			mapTo: "toolbar_buttons.multicolor",
			translate: colorTranslate
		},
		"protocol": "basic_options.protocol",
		"reuseTabs": "basic_options.reusetabs",
		"showError": "toolbar_buttons.showerror",
		"showLoggedOut": "toolbar_buttons.showloggedout",
		"timeout": {
			mapTo: "server_queries.timeout",
			translate: timeTranslate
		},
		"updateInterval": {
			mapTo: "server_queries.updateint",
			translate: timeTranslate
		}
	};
		
	var serviceMaps = {
		"$": {
			map: {
				"BadgeColor": {
					mapTo: "badgeColor",
					translate: colorTranslate
				},
				"ShowOnBadge": "showOnBadge"
			}
		},
		"gm": {
			className: "Gmail",
			map: {
				"AppsDomain": {
					mapTo: "appsDomain",
					translate: function(x) { return x; } // JSON.stringify will be used
				},
				"ShowAll": {
					mapTo: "label",
					translate: function(x) { return x ? "unread" : "" }
				}
			}
		},
		"gr": {
			className: "GoogleReader",
			map: {}
		},
		"gv": {
			className: "GoogleVoice",
			map: {
				"ShowAll": "showAll"
			}
		},
		"gw": {
			className: "GoogleWave",
			map: {
				"AppsDomain": {
					mapTo: "appsDomain",
					translate: function(x) { return x; } // JSON.stringify will be used
				},
				"MinimizeContact": "minimizeContact",
				"MinimizeNav": "minimizeNav",
				"MinimizeSearch": "minimizeSearch"
			}
		}
	};

	for (var i in map) {
		if (!(i in oldsettings)) {
			continue;
		}
		
		if (typeof(map[i]) == "string") {
			this.store[map[i]] = oldsettings[i];
			continue;
		}
		
		this.store[map[i].mapTo] = JSON.stringify(map[i].translate(oldsettings[i]));
	}
	
	var services = 0;
	for (var i in serviceMaps) {
		if (i == "$") {
			continue;
		}
		
		if (oldsettings[i + "Enabled"] == "true") {
			var service = "service" + services + ".";
			services++;
			
			this.store[service + "service"] =
				JSON.stringify(serviceMaps[i].className);
			
			for (var j in serviceMaps.$.map) {
				if (!(i + j in oldsettings)) {
					continue;
				}
				
				var value = serviceMaps.$.map[j];
				if (typeof(value) == "string") {
					this.store[service +value] = oldsettings[i + j];
					continue;
				}
				
				this.store[service + value.mapTo] = JSON.stringify(
					value.translate(oldsettings[i + j]));
			}
			for (var j in serviceMaps[i].map) {
				if (!(i + j in oldsettings)) {
					continue;
				}
				
				var value = serviceMaps[i].map[j];
				if (typeof(value) == "string") {
					this.store[service +value] = oldsettings[i + j];
					continue;
				}
				
				this.store[service + value.mapTo] = JSON.stringify(
					value.translate(oldsettings[i + j]));
			}
		}
	}
	
	var a = [];
	for (var i = 0; i < services; i++) {
		a.push("service" + i);
	}
	this.store["hidden.serviceOrder"] = JSON.stringify(a);
	this.store["hidden.showmulti"] = JSON.stringify(true);
}