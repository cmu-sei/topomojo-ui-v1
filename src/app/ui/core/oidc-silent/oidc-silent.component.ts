// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { Component } from '@angular/core';
import { SettingsService } from 'src/app/svc/settings.service';
import { UserManager } from 'oidc-client';
import { ProfileService } from 'src/app/api/profile.service';

@Component({
  templateUrl: './oidc-silent.component.html',
  styleUrls: ['./oidc-silent.component.scss']
})
export class OidcSilentComponent {

  constructor(
    private configSvc: SettingsService,
    private profileSvc: ProfileService
  ) {
    new UserManager(configSvc.settings.oidc).signinSilentCallback();
  }

}
