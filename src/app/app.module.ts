// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PageNotFoundComponent } from './ui/core/page-not-found/page-not-found.component';
import { WelcomeComponent } from './ui/core/welcome/welcome.component';
import { ApiModule } from './api/gen/api.module';
import { SvcModule } from './svc/svc.module';
import { ExpiringDialogComponent } from './ui/shared/expiring-dialog/expiring-dialog.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatInputModule } from '@angular/material/input';
import { CoreModule } from './ui/core/core.module';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    ApiModule,
    SvcModule,
    CoreModule,
    MatSidenavModule,
    MatInputModule,
    RouterModule.forRoot([
      {
        path: 'admin',
        loadChildren: () => import('./ui/admin/admin.module').then(m => m.AdminModule)
      },
      { path: '', component: WelcomeComponent, pathMatch: 'full' },
      { path: '**', component: PageNotFoundComponent }
    ])
  ],
  exports: [
    RouterModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [
    ExpiringDialogComponent
  ]
})
export class AppModule { }
