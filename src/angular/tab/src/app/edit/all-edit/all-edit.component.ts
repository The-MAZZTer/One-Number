import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Title } from "@angular/platform-browser";
import { All } from "../../../../../../extension/data/feed";
import { Options, OptionValues, OptionChanges, OptionKeys } from "../../../../../../extension/services/options";

@Component({
	templateUrl: "./all-edit.component.html",
	styleUrls: ["./all-edit.component.scss"]
})
export class AllEditComponent implements OnInit, OnDestroy {
	options!: Partial<OptionValues>;
	savedQueryInterval = 60;
	private optionsChangedHandle!: string;

	constructor(private title: Title, private snack: MatSnackBar) {
	}

	async ngOnInit(): Promise<void> {
		this.title.setTitle("Options - One Number");

		this.optionsChangedHandle = Options.addListener(this.onStorageChanged.bind(this));
		this.options = await Options.getMany("queryInterval", "notification", "purgeAfter", "showAudioVideo",
			"showImages", "theme", "customNotificationIcons", "notifyOnFeedError");
	}

	ngOnDestroy(): void {
		Options.removeListener(this.optionsChangedHandle);
	}

	private onStorageChanged(changes: OptionChanges): void {
		for (const key in changes) {
			(this.options as any)[key] = changes[key as OptionKeys].newValue;
		}
		if (changes.queryInterval) {
			this.savedQueryInterval = changes.queryInterval.newValue;
		}
	}

	async submit(): Promise<void> {
		Options.set(this.options);

		if (this.savedQueryInterval !== this.options.queryInterval!) {
			await new All().adjustNextRefresh(this.savedQueryInterval, this.options.queryInterval!);
			this.savedQueryInterval = this.options.queryInterval!;
		}

		this.snack.open("Options have been saved.", undefined, { duration: 2500 });
	}
}
