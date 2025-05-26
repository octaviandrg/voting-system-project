import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { VoterComponent } from './components/voter/voter.component';
import { HomeComponent } from './components/home/home.component';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
    { path: 'admin', component: AdminComponent, canActivate: [AuthGuard]  },
    { path: 'voter', component: VoterComponent },
    { path: '', component: HomeComponent },
  ];
