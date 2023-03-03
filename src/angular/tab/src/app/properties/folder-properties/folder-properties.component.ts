import { Component, Input } from "@angular/core";
import { Folder } from "../../../../../../extension/data/feed";

@Component({
	selector: "app-folder-properties",
	templateUrl: "./folder-properties.component.html",
	styleUrls: ["./folder-properties.component.scss"]
})
export class FolderPropertiesComponent {
	@Input() folder?: Folder;

	get name(): string {
		return this.folder?.name ?? "";
	}
	set name(value: string) {
		if (!this.folder) {
			return;
		}
		this.folder.name = value;
	}
}
