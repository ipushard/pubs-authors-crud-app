import { Component, signal } from '@angular/core';

import { Authors } from './authors/authors';

import { RouterOutlet } from '@angular/router';

// routing will ahndel authors so we dont need them here in the main app component
@Component({
  selector: 'app-root',
  imports: [  RouterOutlet ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('pubs-angular');
}
