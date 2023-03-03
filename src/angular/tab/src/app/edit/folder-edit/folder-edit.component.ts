import { Component, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { MessageBoxComponent, MessageBoxData } from "src/app/dialogs/message-box/message-box.component";
import { FolderPropertiesComponent } from "src/app/properties/folder-properties/folder-properties.component";
import { MessageService } from "src/app/services/messages/message.service";
import { Folder } from "../../../../../../extension/data/feed";

@Component({
	templateUrl: "./folder-edit.component.html",
	styleUrls: ["./folder-edit.component.scss"]
})
export class FolderEditComponent implements OnInit {
	@ViewChild("properties", { static: true }) properties!: FolderPropertiesComponent;

	constructor(private router: Router, private route: ActivatedRoute, private messages: MessageService,
		private dialog: MatDialog, private title: Title, private snack: MatSnackBar) {
	}

	caption = "Edit Folder";
	folder!: Folder;

	ngOnInit(): void {
		this.route.params.subscribe(async params => {
			const folder = await Folder.fromId(parseInt(params["id"], 10));
			if (folder) {
				this.folder = folder;
				this.properties.folder = folder;
				this.caption = `Edit Folder "${folder.name}"`;
				this.title.setTitle(`${this.caption} - One Number`);	
			}
		});
	}

	async submit(): Promise<void> {
		await this.folder.save();
		this.caption = `Edit Folder "${this.folder.name}"`;
		this.title.setTitle(`${this.caption} - One Number`);

		this.snack.open("Folder options have been saved.", undefined, { duration: 2500 });

		this.messages.onFolderEdited(this.folder);
	}

	async askDelete(): Promise<void> {
		const data: MessageBoxData = {
			title: `Delete Folder "${this.folder.name}"?`,
			glyph: "warning",
			content: "Are you sure you want to delete this folder? \
All folders and feeds inside this folder will be deleted. \
One Number will forget read, unread, and starred status for all items.",
			buttons: [{
				text: "Yes",
				color: "warn",
				value: true
			}, {
				text: "No",
				color: "primary",
				value: false
			}],
			defaultValue: false
		};
		const answer = await new Promise<boolean>(resolve => {
			const dialog = this.dialog.open(MessageBoxComponent, {
				data
			});

			dialog.afterClosed().subscribe(resolve);
		});

		if (!answer) {
			return;
		}

		const parent = await this.folder.getParent();
		const id = this.folder.id;

		await this.folder.delete();
		this.messages.onFolderDeleted(id);

		if (parent) {
			await this.router.navigate(["folder", parent.id, "add"]);
		} else {
			await this.router.navigate(["add"]);
		}
	}
}
