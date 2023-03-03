import { Component, OnInit } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { Feed, Folder } from "../../../../../../extension/data/feed";

@Component({
	templateUrl: "./add-type-select.component.html",
	styleUrls: ["./add-type-select.component.scss"]
})
export class AddTypeSelectComponent implements OnInit {
	constructor(private route: ActivatedRoute, private title: Title) {
	}

	caption = "Add";
	typeButtons!: TypeButton[];

	ngOnInit(): void {
		this.route.params.subscribe(async params => {
			if (params["id"]) {
				const folder = await Folder.fromId(parseInt(params["id"], 10));
				if (folder) {
					this.caption = `Add To "${folder.name}"`;
				} else {
					this.caption = "Add";
				}
			} else {
				this.caption = "Add";
			}
			this.title.setTitle(`${this.caption} - One Number`);
		});

		const ret: TypeButton[] = [];
		ret.push({
			name: "Folder",
			glyph: "create_new_folder",
			link: ["folder"]
		});

		for (const x of Feed.Types) {
			ret.push({
				name: x.typeName,
				glyph: x.typeGlyph,
				link: ["feed", x.typeId]
			});
		}
		this.typeButtons = ret;
	}
}

type TypeButton = {
	name: string,
	glyph: string,
	link: string | any[]
};
