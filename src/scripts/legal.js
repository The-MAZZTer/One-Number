window.onload = function() {
	i18nTemplate.process(document);
	updateNav();
	
	NodeList.prototype.forEach = Array.prototype.forEach;
	
	document.querySelectorAll(".section-header").forEach(function(val, index, a) {
		val.onclick = function() {
			expandCollapse(this.nextElementSibling.id);
		}
	});
}