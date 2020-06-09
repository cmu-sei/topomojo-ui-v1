// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild } from '@angular/router';
import { UserService } from './user.service';
import { UserProfile } from '../api/gen/models';
import { debounceTime } from 'rxjs/operators';

@Injectable()
export class AdminGuard implements CanActivate, CanActivateChild {

    private profile: UserProfile = {};

    constructor(
        private userSvc: UserService
    ) {

        // TODO: this fails if navigating directly to <host>/admin because profile load will race
        this.userSvc.profile$.subscribe(
            (p: UserProfile) => {
                this.profile = p;
            }
        );
    }

    canLoad(): boolean {
        return this.profile.isAdmin;
    }

    canActivate(
                ): boolean {

        return this.profile.isAdmin;
    }

    canActivateChild(
                ): boolean {

        return this.profile.isAdmin;
    }

}
