import { Component, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { AllEditComponent } from "./edit/all-edit/all-edit.component";
import { FeedEditComponent } from "./edit/feed-edit/feed-edit.component";
import { FolderEditComponent } from "./edit/folder-edit/folder-edit.component";
import { FeedItemListComponent } from "./feed-item-list/feed-item-list.component";
import { MatSidenav } from "@angular/material/sidenav";
import { FeedListComponent } from "./feed-list/feed-list.component";
import { SearchBarComponent } from "./search-bar/search-bar.component";
import { Options, OptionChanges } from "../../../../extension/services/options";
import { Enumerable } from "linq";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
	@ViewChild("search", { static: true }) search!: SearchBarComponent;
	@ViewChild("feedDrawer", { static: true }) feedDrawer!: MatSidenav;
	@ViewChild("feedList", { static: true }) feedList!: FeedListComponent;

	drawerOpen = true;
	query = "";
	private theme: (null | "light" | "dark") = null;

	constructor(private router: Router, private route: ActivatedRoute) {
	}

	async ngOnInit(): Promise<void> {
		Options.addListener(this.onStorageChanged.bind(this));

		this.search.queryChanged.subscribe(() => {
			if (this.search.query) {
				this.router.navigate(["search"], {
					queryParams: {
						q: this.search.query
					}
				});	
			} else {
				this.router.navigate(["search"]);
			}
		});

		this.router.events.subscribe(x => {
			if (!(x instanceof NavigationEnd)) {
				return;
			}

			if (this.editMode) {
				document.documentElement.classList.add("edit");
			} else {
				document.documentElement.classList.remove("edit");
			}

			this.feedList.editMode = this.editMode;

			if (this.route.children[0] && this.route.children[0].snapshot.routeConfig?.path === "search") {
				const query = this.route.snapshot.queryParams["q"];
				this.search.query = query ?? "";
			}
		});

		const { drawerOpen, theme } = await Options.getMany("drawerOpen", "theme");
		this.feedDrawer.opened = this.drawerOpen = drawerOpen;
		this.theme = theme;
		this.setTheme();

		Enumerable.fromNodeList(window.document.getElementsByTagName("link"))
			.cast<HTMLLinkElement>().first(x => x.media == "print").media = "all";
	}

	private onStorageChanged(changes: OptionChanges): void {
		if (changes.drawerOpen) {
			this.drawerOpen = changes.drawerOpen.newValue;
		}
		if (changes.theme) {
			this.theme = changes.theme.newValue;
			this.setTheme();
		}
	}

	private setTheme(): void {
		let theme: (null | "light" | "dark") = this.theme;
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

	get editMode(): boolean {
		const component = this.route.snapshot.children.length &&
			this.route.snapshot.children[0].routeConfig?.component;
		return component !== FeedItemListComponent;
	}

	async toggleEditMode(): Promise<void> {
		const id = this.route.snapshot.children[0].params["id"];
		switch (this.route.snapshot.children[0].routeConfig?.component) {
			case AllEditComponent:
				await this.router.navigate([""]);
				break;
			case FolderEditComponent:
				await this.router.navigate(["folder", id]);
				break;
			case FeedEditComponent:
				await this.router.navigate(["feed", id]);
				break;
			default:
				const editMode = this.editMode;
				if (this.route.snapshot.children[0].routeConfig?.path?.startsWith("folder")) {
					if (!editMode) {
						await this.router.navigate(["folder", id, "edit"]);
					} else {
						await this.router.navigate(["folder", id]);
					}
				} else if (this.route.snapshot.children[0].routeConfig?.path?.startsWith("feed")) {
					if (!editMode) {
						await this.router.navigate(["feed", id, "edit"]);
					} else {
						await this.router.navigate(["feed", id]);
					}
				} else if (!editMode) {
					await this.router.navigate(["edit"]);
				} else {
					await this.router.navigate([""]);
				}
				break;
		}
	}

	drawerOpened(state: boolean): void {
		this.drawerOpen = state;
		Options.set({
			drawerOpen: this.drawerOpen
		});
	}
}
