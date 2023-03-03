// based on https://github.com/niutech/x-frame-bypass/blob/master/x-frame-bypass.js

export class XFrameBypassElement extends HTMLIFrameElement {
	static readonly observedAttributes = ["src"];
	constructor() {
		super();
	}
	attributeChangedCallback(): void {
		this.load(this.src);
	}
	async load(url: string, options?: RequestInit): Promise<void> {
		// Technically if there's no proxy there's no reason for the http check,
		// but for my specific implementation I don't want other protocols anyway.
		const u = new URL(url, document.baseURI);
		if (!url || (u.protocol.toLowerCase() !== "http:" && u.protocol.toLowerCase() !== "https:")) {
			throw new Error(`X-Frame-Bypass src ${url} does not start with http(s)://`);
		}

		// I don't want the interstitial page.
		// Personally I would have the caller implment it if they really want one
		// (they can listen to onload to hide a loading overlay).
		this.srcdoc = "";

		// I removed patch support since I didn't need it.
		// Also using async/await since it's more readable and in TypeScript it can be compiled down
		// for browsers that don't support it. And I can access res.url easily now.
		const res = await fetch(url, options);
		let data = await res.text();
		if (data) {
			// Make global to replace all occurrances (there shouldn't be more than one but just in case)
			// Make sure we match on "head" and not "header" with \b
			// Use .*? to match anything non-greedily (first > will stop)
			const baseRegex = /(<base\b.*?href=)('|")(.*?)('|")(.*?>)/gi;
			const headRegex = /<head(\b.*?)>/i;
			const htmlRegex = /<html(\b.*?)>/i;

			// If there's no <head> add one.
			// If there's no <html> add one. Just in case.
			if (!headRegex.test(data)) {
				if (htmlRegex.test(data)) {
					data = data.replace(htmlRegex, `<html$1><head></head>`);
				} else {
					data = `<html><head></head>${data}</html>`;
				}
			}

			// Check for existing <base>
			const baseMatch = baseRegex.exec(data);
			let base: string | undefined;
			if (baseMatch) {
				// Grab the existing base url
				base = baseMatch[3];
			}
			// Use an existing base url. If it is a relative url, resolve it to an absolute one so it works properly.
			// Use res.url which updates in case of redirection.
			// More code will be required to support proxies since you'll want to strip off the proxy url.
			base = this.escapeHtml(new URL(res.url, base).href);
			// If there's an existing <base> replace it rather than adding a new one.
			if (baseMatch) {
				data = data.replace(baseRegex, `$1$2${base}$4$5`);
			} else {
				data = data.replace(headRegex, `<head$1><base href="${base}">`);
			}

			// I am using this in a chrome extension.
			// I suppose a more generic solution is to use document.baseURI to build the url.
			// We want to inject a reference to a JS file instead of an inline script because
			// in some contexts (such as chrome extensoons) inline scripts are blocked by default.
			// I also tried to use DOM APIs from this class to attach events to this.contentDocument events,
			// but becuase this.src is another domain this is blocked!
			// That could be worked around by changing this.src to make it look like it's the same origin as us.
			// This could also allow for cross-frame scripting (from us, not them!) to make things nicer.
			// But for now using a separate script file works.
			const scriptUrl = this.escapeHtml(chrome.runtime.getURL("/x-frame-bypass-inject.js"));
			data = data.replace(headRegex, `<head$1><script type="text/javascript" src="${scriptUrl}"></script>`);
		}
		this.srcdoc = data || "";
	}

	// Why is there no built-in API to do this? Like encode/decodeURI.
	private escapeHtml(unsafe: string): string {
		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
}
