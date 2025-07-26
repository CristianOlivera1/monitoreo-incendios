import { NewReport } from './pages/new-report/new-report';
import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { HomeClient } from './pages/home-client/home-client';

export const routes: Routes = [
    {path:'', component: HomeClient},
  {path:'register', component: Register},
  {path:'login', component: Login},
  {path:'reportar', component: NewReport},

];
