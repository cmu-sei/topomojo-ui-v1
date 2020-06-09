// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';

@Injectable()
export class AuthGuard implements CanActivate, CanActivateChild {

    constructor(
        private authSvc: AuthService,
        private settingsSvc: SettingsService,
        private router: Router
    ) {
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Promise<boolean> {

        return this.authSvc.isAuthenticated().then(a => {
            if (a) { return a; }
            this.authSvc.redirectUrl = state.url;
            this.router.navigate([this.settingsSvc.settings.loginUrl]);
            return false;
        });
    }

    canActivateChild(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
        ): Promise<boolean> {

        return this.canActivate(route, state);
    }

}
