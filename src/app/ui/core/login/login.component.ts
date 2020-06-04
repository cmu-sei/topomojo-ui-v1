// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../../svc/settings.service';
import { AuthService } from '../../../svc/auth.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'topomojo-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  authority = '';
  authfrag = '';
  authmsg = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authSvc: AuthService
  ) { }

  ngOnInit() {

    this.authority = this.authSvc.authority;

    if (this.authority) {
      this.login();
    }
  }

  login(): void {
    this.authSvc.externalLogin(
      this.authSvc.redirectUrl || this.route.snapshot.params['url']
    );
  }

}
