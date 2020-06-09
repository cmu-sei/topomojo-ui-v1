// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { AuthService, AuthTokenState } from './auth.service';
import { ProfileService } from '../api/profile.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { UserProfile } from '../api/gen/models';

@Injectable()
export class UserService {
    tokenState: AuthTokenState;
    profile: UserProfile = {};
    public profile$: BehaviorSubject<UserProfile> = new BehaviorSubject<UserProfile>(this.profile);

    constructor(
        private authSvc: AuthService,
        private profileSvc: ProfileService
    ) {
        this.authSvc.tokenState$.subscribe(
            (state: AuthTokenState) => {
                this.tokenStateChanged(state);
            }
        );
    }

    tokenStateChanged(state: AuthTokenState): void {
        this.tokenState = state;
        switch (state) {
            case AuthTokenState.valid:
                this.getProfile(true).subscribe(
                    (p: UserProfile) => {
                        this.profile = !!p ? p : {};
                        this.profile$.next(this.profile);
                    }
                );
                break;

            case AuthTokenState.invalid:
                this.profile = {};
                this.profile$.next(this.profile);
                break;
        }
    }

    getProfile(reload?: boolean): Observable<UserProfile> {
        if (this.profile.id && !reload) {
            return of(this.profile);
        }

        return this.profileSvc.load();
    }

    getTicket(): Observable<any> {
        return this.profileSvc.ticket();
    }

}
