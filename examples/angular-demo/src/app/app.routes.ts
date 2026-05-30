import type { Routes } from '@angular/router';
import { SigninFormComponent } from './components/signin-form.component';
import { DashboardComponent } from './pages/dashboard.component';
import { LandingComponent } from './pages/landing.component';
import { UserTestPage } from './pages/user-test.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent
  },
  {
    path: 'signin',
    component: SigninFormComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'user-test',
    component: UserTestPage
  },
  {
    path: '**',
    redirectTo: ''
  }
];
