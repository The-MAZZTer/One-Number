import { GApiCall, GApiBase, GApiEndpoint } from "./base";

export class YouTube extends GApiBase	{
	private _channels?: YouTubeChannels;
	public get channels(): YouTubeChannels {
		if (!this._channels) {
			this._channels = new YouTubeChannels(this);
		}
		return this._channels;
	}
}

export class YouTubeChannels extends GApiBase {
	private _list?: GApiEndpoint<ChannelList, ChannelListParams>;
	public get list() {
		if (!this._list) {
			this._list = new GApiEndpoint<ChannelList, ChannelListParams>(
				(params: ChannelListParams) => {
					return {
						api: `channels`,
						query: params as unknown as {
							[key: string]: string
						}
					};
				}, this.callApi);
		}
		return this._list;
	}
}

export type ChannelListParams = {
	part: string,
	forHandle?: string
	forUsername?: string,
	id?: string,
	managedByMe?: boolean,
	mine?: boolean,
	hl?: string,
	maxResults?: number,
	onBehalfOfContentOwner?: string,
	pageToken: string
};

export type ChannelList = {
	kind: "youtube#channelListResponse",
	etag: string,
	nextPageToken?: string,
	prevPageToken?: string,
	pageInfo: {
		totalResults: number,
		resultsPerPage: number
	},
	items: Channel[]
};

export type ChannelThumbnail = {
	url: string;
	width: number;
	height: number;
};

export type ChannelSnippet = {
	title: string;
	description: string;
	customUrl: string;
	publishedAt: Date;
	thumbnails: Record<string, ChannelThumbnail>;
	defaultLanguage: string;
	localized: {
		title: string;
		description: string;
	};
	country: string;
};

export type ChannelRelatedPlaylists = {
	likes: string;
	favorites: string;
	uploads: string;
};

export type ChannelContentDetails = {
	relatedPlaylists: ChannelRelatedPlaylists;
};

export type ChannelStatistics = {
	viewCount: number;
	subscriberCount: number;
	hiddenSubscriberCount: boolean;
	videoCount: number;
};

export type ChannelTopicDetails = {
	topicIds: string[];
	topicCategories: string[];
};

export type ChannelStatus = {
	privacyStatus: string;
	isLinked: boolean;
	longUploadsStatus: string;
	madeForKids: boolean;
	selfDeclaredMadeForKids: boolean;
};

export type ChannelBrandingSettingsChannel = {
	title: string;
	description: string;
	keywords: string;
	trackingAnalyticsAccountId: string;
	unsubscribedTrailer: string;
	defaultLanguage: string;
	country: string;
};

export type ChannelBrandingSettingsWatch = {
	textColor: string;
	backgroundColor: string;
	featuredPlaylistId: string;
};

export type ChannelBrandingSettings = {
	channel: ChannelBrandingSettingsChannel;
	watch: ChannelBrandingSettingsWatch;
};

export type ChannelAuditDetails = {
	overallGoodStanding: boolean;
	communityGuidelinesGoodStanding: boolean;
	copyrightStrikesGoodStanding: boolean;
	contentIdClaimsGoodStanding: boolean;
};

export type ChannelContentOwnerDetails = {
	contentOwner: string;
	timeLinked: Date;
};

export type ChannelLocalization = {
	title: string;
	description: string;
};

export type Channel = {
	kind: "youtube#channel",
	etag: string,
	id: string,
	snippet?: ChannelSnippet,
  contentDetails?: ChannelContentDetails,
  statistics?: ChannelStatistics,
  topicDetails?: ChannelTopicDetails,
  status?: ChannelStatus,
  brandingSettings?: ChannelBrandingSettings,
  auditDetails?: ChannelAuditDetails,
  contentOwnerDetails?: ChannelContentOwnerDetails,
  localizations?: Record<string, ChannelLocalization>
};
