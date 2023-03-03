import { Component, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { MessageService } from "src/app/services/messages/message.service";
import { Folder } from "../../../../../../extension/data/feed";

@Component({
	templateUrl: "./add-folder.component.html",
	styleUrls: ["./add-folder.component.scss"]
})
export class AddFolderComponent implements OnInit {
	constructor(private router: Router, private route: ActivatedRoute, private messages: MessageService,
		private title: Title) {
	}

	caption = "Add New Folder";
	folder = new Folder();

	ngOnInit(): void {
		this.route.params.subscribe(async params => {
			if (params["id"]) {
				const folder = await Folder.fromId(parseInt(params["id"], 10));
				if (folder) {
					this.caption = `Add New Folder To "${folder.name}"`;
				} else {
					this.caption = "Add New Folder";
				}
			} else {
			}
			this.title.setTitle(`${this.caption} - One Number`);
		});
	}

	async submit(): Promise<void> {
		const id = this.route.snapshot.params["id"];
		if (id) {
			const parent = await Folder.fromId(parseInt(id, 10));
			this.folder.setParent(parent);
		}
		await this.folder.save();

		this.messages.onFolderAdded(this.folder);

		await this.router.navigate(["folder", this.folder.id, "add"]);
	}
}
