function fixHeader() {
	var manifest = chrome.extension.getBackgroundPage().manifest;
	if (!manifest) {
		return;
	}

	var name = chrome.i18n.getMessage("name");
	var version = manifest.version;
		
	var text = chrome.i18n.getMessage("changelog_title", [
		name,
		version
	]);
		
	document.getElementById("title").textContent = text;
	document.getElementById("headertitle").textContent = text;
	document.getElementById("name").textContent = text;
}

window.onload = function() {
	i18nTemplate.process(document);
	fixHeader();
	updateNav();
	
	NodeList.prototype.forEach = Array.prototype.forEach;
	
	document.querySelectorAll(".section-header").forEach(function(val, index, a) {
		val.onclick = function() {
			expandCollapse(this.nextElementSibling.id);
		}
	});
}