import { Routes } from '@angular/router';
import { Authors } from './authors/authors';
import { AuthorDetails } from './author-details/author-details';
import { AuthorCreate } from './author-create/author-create';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'authors',
    pathMatch: 'full'
  },
  {
    path: 'authors',
    component: Authors
  },
  {
  path: 'authors/new',
  component: AuthorCreate
  },
  {
    path: 'authors/:id',
    component: AuthorDetails
  }
];