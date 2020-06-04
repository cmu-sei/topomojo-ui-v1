// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiSettings } from '../api-settings';
import { GeneratedService } from './_service';
import { UserProfile, Search } from './models';

@Injectable()
export class GeneratedProfileService extends GeneratedService {

    constructor(
       protected http: HttpClient,
       protected api: ApiSettings
    ) { super(http, api); }

    public list(search: Search): Observable<UserProfile[]> {
        return this.http.get<UserProfile[]>(this.api.url + '/api/users' + this.paramify(search));
    }
    public load(): Observable<UserProfile> {
        return this.http.get<UserProfile>(this.api.url + '/api/user');
    }
    public update(profile: UserProfile): Observable<any> {
        return this.http.put<any>(this.api.url + '/api/user', profile);
    }
    public delete(id: number): Observable<any> {
        return this.http.delete<any>(this.api.url + '/api/user/' + id);
    }
    public sync(): Observable<any> {
        return this.http.get(this.api.url + '/api/version?ts=' + Date.now());
    }
    public ticket(): Observable<any> {
        return this.http.get(this.api.url + '/api/user/ticket');
    }

}
