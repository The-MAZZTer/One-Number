import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AddFolderComponent } from "./add/add-folder/add-folder.component";
import { AddFeedComponent } from "./add/add-feed/add-feed.component";
import { AddTypeSelectComponent } from "./add/add-type-select/add-type-select.component";
import { AllEditComponent } from "./edit/all-edit/all-edit.component";
import { FeedEditComponent } from "./edit/feed-edit/feed-edit.component";
import { FolderEditComponent } from "./edit/folder-edit/folder-edit.component";
import { FeedItemListComponent } from "./feed-item-list/feed-item-list.component";

const routes: Routes = [
  { path: "", component: FeedItemListComponent },
	{ path: "edit", component: AllEditComponent },
	{ path: "star", component: FeedItemListComponent },
	{ path: "add", component: AddTypeSelectComponent },
	{ path: "add/folder", component: AddFolderComponent },
	{ path: "add/feed/:type", component: AddFeedComponent },
	{ path: "folder/:id", component: FeedItemListComponent },
	{ path: "folder/:id/edit", component: FolderEditComponent },
	{ path: "folder/:id/add", component: AddTypeSelectComponent },
	{ path: "folder/:id/add/folder", component: AddFolderComponent },
	{ path: "folder/:id/add/feed/:type", component: AddFeedComponent },
	{ path: "feed/:id", component: FeedItemListComponent },
	{ path: "feed/:id/edit", component: FeedEditComponent },
	{ path: "search", component: FeedItemListComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
		onSameUrlNavigation: "reload",
		useHash: true
	})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
