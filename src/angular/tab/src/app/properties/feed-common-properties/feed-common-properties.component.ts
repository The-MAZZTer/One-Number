import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { FeedSchema } from "../../../../../../extension/data/dbContext";
import { Feed } from "../../../../../../extension/data/feed";
import { Options, OptionChanges } from "../../../../../../extension/services/options";

@Component({
	selector: "app-feed-common-properties",
	templateUrl: "./feed-common-properties.component.html",
	styleUrls: ["./feed-common-properties.component.scss"]
})
export class FeedCommonPropertiesComponent implements OnInit, OnDestroy {
	@Input() feed?: Feed<FeedSchema>;

	defaultQueryInterval = 60;
	defaultNotification = true;

	private optionsChangedHandle!: string;

	get overrideName(): string | undefined {
		return this.feed?.overrideName;
	}
	set overrideName(value: string | undefined) {
		if (!this.feed || !value) {
			return;
		}

		this.feed.overrideName = value;
	}

	get useDefaultQueryInterval(): boolean {
		return this.feed?.queryInterval === 0;
	}
	set useDefaultQueryInterval(value: boolean) {
		if (!this.feed) {
			return;
		}

		if (this.useDefaultQueryInterval === value) {
			return;
		}

		if (value) {
			this.feed.setQueryInterval(0);
		} else {
			this.feed.setQueryInterval(this.defaultQueryInterval);
		}
	}
	get actualQueryInterval(): number {
		return this.useDefaultQueryInterval ? this.defaultQueryInterval : this.feed?.queryInterval ?? 0;
	}
	set actualQueryInterval(value: number) {
		if (!this.feed) {
			return;
		}

		this.useDefaultQueryInterval = false;
		this.feed.setQueryInterval(value);
	}

	get notification(): number {
		return this.feed?.notification ?? 0;
	}
	set notification(value: number) {
		if (!this.feed) {
			return;
		}

		this.feed.notification = value;
	}

	async ngOnInit(): Promise<void> {
		this.optionsChangedHandle = Options.addListener(this.onStorageChanged.bind(this));
		const { queryInterval, notification } = await Options.getMany("queryInterval", "notification");
		this.defaultQueryInterval = queryInterval;
		this.defaultNotification = notification;
	}
	ngOnDestroy(): void {
		Options.removeListener(this.optionsChangedHandle);
	}

	private onStorageChanged(changes: OptionChanges): void {
		if (changes.queryInterval) {
			this.defaultQueryInterval = changes.queryInterval.newValue;
		}
		if (changes.notification) {
			this.defaultNotification = changes.notification.newValue;
		}
	}
}
