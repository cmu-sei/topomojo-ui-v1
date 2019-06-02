// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../svc/auth.service';

@Component({
  templateUrl: './oidc-silent.component.html',
  styleUrls: ['./oidc-silent.component.scss']
})
export class OidcSilentComponent implements OnInit {

  constructor(
    private authSvc: AuthService
  ) { }

  ngOnInit() {
    this.authSvc.silentLoginCallback();
  }

}
