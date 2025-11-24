import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";

import { GmailFeed } from "../../../../../../extension/data/sources/gmail";
import { GoogleAccountDialogComponent } from "../google-account-dialog/google-account-dialog.component";

@Component({
    selector: "app-gmail-properties",
    templateUrl: "./gmail-properties.component.html",
    styleUrls: ["./gmail-properties.component.scss"],
    standalone: false
})
export class GmailPropertiesComponent implements OnInit {
	constructor(private dialog: MatDialog, private router: Router, private route: ActivatedRoute) { }

	@Input() public feed?: GmailFeed;
	@Input() isNew: boolean = false;
	
	public needsRefetch = true;

	async ngOnInit() {
		/*if (this.isNew) {
			const answer = await new Promise<string | false>(resolve => {
				const dialog = this.dialog.open(GoogleAccountDialogComponent,);
				dialog.afterClosed().subscribe(resolve);
			});
			if (answer === undefined || answer === null || answer === false) {
				const url = this.route.snapshot.url;
				this.router.navigate(url.take(url.length - 2).toArray());
				return;
			}
			if (answer === "") {
				this.feed!.account = undefined;
			} else {
				this.feed!.account = answer;
			}
		}*/

		this.feed?.initGapi();
	}

	auth(): void {
		this.feed?.signIn();
	}

	get valid(): boolean {
		return !!(this.feed && this.feed.isRequiredAuthed);
	}
}
