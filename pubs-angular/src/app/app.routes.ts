import { Routes } from '@angular/router';
import { Authors } from './authors/authors';
import { AuthorDetails } from './author-details/author-details';
import { AuthorCreate } from './author-create/author-create';
import { Login } from './login/login';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';
import { RegisterInvite } from './register-invite/register-invite';
import { ManageEmployees } from './manage-employees/manage-employees';
import { ManageEmployeeCreate } from './manage-employee-create/manage-employee-create';

const managementRoles = [
  'System Administrator',
  'Chief Executive Officer',
  'Business Operations Manager',
  'Chief Financial Officer',
  'Publisher',
  'Managing Editor',
  'Marketing Manager',
  'Public Relations Manager',
  'Acquisitions Manager',
  'Productions Manager',
  'Operations Manager'
];

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'authors',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'authors',
    component: Authors,
    canActivate: [authGuard]
  },
  {
    path: 'authors/new',
    component: AuthorCreate,
    canActivate: [authGuard]
  },
  {
    path: 'authors/:id',
    component: AuthorDetails,
    canActivate: [authGuard]
  },
  {
    path: 'manage-employees',
    component: ManageEmployees,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: managementRoles
    }
  },
  {
    path: 'manage-employees/new',
    component: ManageEmployeeCreate,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: managementRoles
    }
  },
  {
    path: 'register-invite',
    component: RegisterInvite
  }
];