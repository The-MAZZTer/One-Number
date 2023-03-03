import { Deltas } from "../data/feed";

export interface Message {
	type: string;
}

export interface ObjectChangedMessage extends Message {
	type: "folderAdded" | "folderEdited" | "folderMoved" | "folderDeleted" |
		"feedAdded" | "feedEdited" | "feedMoved" | "feedDeleted" | "feedUpdateError" |
		"feedItemStarChanged",
	id: number
}

export interface FeedItemsPropertyChangedMessage extends Message {
	type: "feedItemsReadChanged",
	feedItems: number[]
};

export interface FeedItemsChangedMessage extends Message, Deltas<number> {
	type: "feedItemsChanged" | "notification",
	feedId: number
};
