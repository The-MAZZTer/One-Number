import { Component, OnInit } from "@angular/core";
import { OptionChanges, Options } from "../../../../extension/services/options";
import { Enumerable } from "linq";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
    standalone: false
})
export class AppComponent implements OnInit {
	private theme: Theme = null;

	async ngOnInit(): Promise<void> {
		Options.addListener(this.onStorageChanged.bind(this));

		const theme = await Options.get("theme");
		this.theme = theme;
		this.setTheme();
		
		Enumerable.fromNodeList(window.document.getElementsByTagName("link"))
			.cast<HTMLLinkElement>().first(x => x.media == "print").media = "all";
	}

	private onStorageChanged(changes: OptionChanges): void {
		if (changes.theme) {
			this.theme = <Theme>changes.theme.newValue;
			this.setTheme();
		}
	}

	private setTheme(): void {
		let theme: Theme = this.theme;
		if (!theme) {
			if (window.matchMedia("(prefers-color-scheme)").media !== "not all") {
				theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
			} else {
				theme = "light";
			}
		}
		document.documentElement.classList.remove("light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add(theme);
	}

	openTab(): void {
		chrome.tabs.create({
			url: chrome.runtime.getURL("/tab/index.html#/edit/"),
			active: true
		});
	}
}

type Theme = null | "light" | "dark";

