import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from "@angular/forms";
import { DragDropModule } from "@angular/cdk/drag-drop";

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatBadgeModule } from "@angular/material/badge";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCardModule } from "@angular/material/card";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatDialogModule } from "@angular/material/dialog";
import { MatDividerModule } from "@angular/material/divider";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatListModule } from "@angular/material/list";
import { MatMenuModule } from "@angular/material/menu";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatTreeModule } from "@angular/material/tree";

import { FeedItemListComponent } from "./feed-item-list/feed-item-list.component";
import { AllEditComponent } from "./edit/all-edit/all-edit.component";
import { FeedEditComponent } from "./edit/feed-edit/feed-edit.component";
import { FolderEditComponent } from "./edit/folder-edit/folder-edit.component";
import { AddTypeSelectComponent } from "./add/add-type-select/add-type-select.component";
import { AddFolderComponent } from "./add/add-folder/add-folder.component";
import { AddFeedComponent } from "./add/add-feed/add-feed.component";
import { FolderPropertiesComponent } from "./properties/folder-properties/folder-properties.component";
import { RssAtomFeedPropertiesComponent } from "./properties/rss-atom-feed-properties/rss-atom-feed-properties.component";
import { FeedCommonPropertiesComponent } from "./properties/feed-common-properties/feed-common-properties.component";
import { FeedPreviewComponent } from "./properties/feed-preview/feed-preview.component";
import { MessageBoxComponent } from "./dialogs/message-box/message-box.component";
import { FeedListComponent } from "./feed-list/feed-list.component";
import { SearchBarComponent } from "./search-bar/search-bar.component";
import { FeedPropertiesComponent } from "./properties/feed-properties/feed-properties.component";
import { GmailPropertiesComponent } from './properties/gmail-properties/gmail-properties.component';

@NgModule({
  declarations: [
    AppComponent,

		FeedListComponent,
		FeedItemListComponent,
		AllEditComponent,
		FeedEditComponent,
		FolderEditComponent,
		AddTypeSelectComponent,
		AddFolderComponent,
		AddFeedComponent,
		FolderPropertiesComponent,
		RssAtomFeedPropertiesComponent,
		FeedCommonPropertiesComponent,
		FeedPropertiesComponent,
		FeedPreviewComponent,
		MessageBoxComponent,
		FeedListComponent,
		SearchBarComponent,
		GmailPropertiesComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
		FormsModule,
		DragDropModule,

		MatBadgeModule,
		MatButtonModule,
		MatButtonToggleModule,
		MatCardModule,
		MatCheckboxModule,
		MatDialogModule,
		MatDividerModule,
		MatExpansionModule,
		MatFormFieldModule,
		MatIconModule,
		MatInputModule,
		MatListModule,
		MatMenuModule,
		MatRadioModule,
		MatSelectModule,
		MatSidenavModule,
		MatSnackBarModule,
		MatProgressSpinnerModule,
		MatToolbarModule,
		MatTooltipModule,
		MatTreeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
