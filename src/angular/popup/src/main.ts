import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import { ArrayEnumerable } from "linq";
import { Feed, FeedItem } from "../../../extension/data/feed";
import { RssAtomFeed, RssAtomFeedItem } from "../../../extension/data/sources/rssatom";
import { GmailFeed, GmailFeedItem } from "../../../extension/data/sources/gmail";

if (environment.production) {
  enableProdMode();
}

ArrayEnumerable.extend(Array);

Feed.registerType(RssAtomFeed);
FeedItem.registerType(RssAtomFeedItem);
Feed.registerType(GmailFeed);
FeedItem.registerType(GmailFeedItem);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
