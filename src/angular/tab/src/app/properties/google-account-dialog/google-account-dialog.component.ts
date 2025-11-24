import { Component } from '@angular/core';

@Component({
	selector: 'app-google-account-dialog',
	standalone: false,
	templateUrl: './google-account-dialog.component.html',
	styleUrl: './google-account-dialog.component.scss'
})
export class GoogleAccountDialogComponent {
	which: number = 0;
	email: string = "";
}
