// Borrowed from chrome://newtab/ to aid in i18n...
// Modified to work with Extension i18n API.
			
var i18nTemplate = (function() {
	/**
	 * This provides the handlers for the templating engine. The key is used as
	 * the attribute name and the value is the function that gets called for every
	 * single node that has this attribute.
	 * @type {Object}
	 */
	var handlers = {
		/**
		 * This handler sets the textContent of the element.
		 */
		'i18n-content': function(element, attributeValue) {
			element.textContent = chrome.i18n.getMessage(attributeValue);
		},
 
		/**
		 * This is used to set HTML attributes and DOM properties,. The syntax is:
		 *   attributename:key;
		 *   .domProperty:key;
		 *   .nested.dom.property:key
		 */
		'i18n-values': function(element, attributeValue) {
			var parts = attributeValue.replace(/\s/g, '').split(/;/);
			for (var j = 0; j < parts.length; j++) {
				var a = parts[j].match(/^([^:]+):(.+)$/);
				if (a) {
					var propName = a[1];
					var propExpr = a[2];
 
					var value = chrome.i18n.getMessage(propExpr);
					
					// Ignore missing properties
					if (value) {
						if (propName.charAt(0) == '.') {
							var path = propName.slice(1).split('.');
							var object = element;
							while (object && path.length > 1) {
								object = object[path.shift()];
							}
							if (object) {
								object[path] = value;
								// In case we set innerHTML (ignoring others) we need to
								// recursively check the content
								if (path == 'innerHTML') {
									process(element, obj);
								}
							}
						} else {
							element.setAttribute(propName, value);
						}
					} else {
						console.warn('i18n-values: Missing value for "' + propExpr + '"');
					}
				}
			}
		}
	};
 
	var attributeNames = [];
	for (var key in handlers) {
		attributeNames.push(key);
	}
	var selector = '[' + attributeNames.join('],[') + ']';
 
	/**
	 * Processes a DOM tree with the {@code obj} map.
	 */
	function process(node) {
		var elements = node.querySelectorAll(selector);
		for (var element, i = 0; element = elements[i]; i++) {
			for (var j = 0; j < attributeNames.length; j++) {
				var name = attributeNames[j];
				var att = element.getAttribute(name);
				if (att != null) {
					handlers[name](element, att);
				}
			}
		}
	}
 
	return {
		process: process
	};
})();

function login() {
	chrome.extension.getBackgroundPage().updater.openLogin();
	return false;
}
function unread() {
	chrome.extension.getBackgroundPage().updater.popupOpenUnread(true);
	return false;
}

function updateNav(u) {
	$("nav_open").onclick = unread;

	window.onupdate = updateNav;

	if (!u) {
		u = chrome.extension.getBackgroundPage().updater;
	}
	
	var services = u.services;
	var anyunread = false;
	for (var i = 0; i < services.length; i++) {
		if (services[i].getUnreadCount() > 0) {
			anyunread = true;
			break;
		}
	}
	
	var noopen = document.getElementById("nav_noopen");
	var open = document.getElementById("nav_open");
	if (anyunread) {
		open.style.display = "inline";
		noopen.style.display = "none";
	} else {
		open.style.display = "none";
		noopen.style.display = "inline";
	}
}

function expandCollapse(name) {
  var button = document.getElementById(name + "button");
  var section = document.getElementById(name);
  
  if (section.style.display != "none") {
    section.style.display = "none";

		button.src = "images/pages/expand.png"
    button.alt = chrome.i18n.getMessage("expand");
    button.title = chrome.i18n.getMessage("expand");
  } else {
    section.style.display = "block";

		button.src = "images/pages/collapse.png"
    button.alt = chrome.i18n.getMessage("collapse");
    button.title = chrome.i18n.getMessage("collapse");
  }
}

document.onselectstart = function(e) {
	if (e.target.type && e.target.type.toLowerCase() == "text") {
		return true;
	}
	if (e.target.nodeName && e.target.nodeName.toLowerCase() == "textarea") {
		return true;
	}
	return false;
}

function $(a) {
	return document.getElementById(a);
}