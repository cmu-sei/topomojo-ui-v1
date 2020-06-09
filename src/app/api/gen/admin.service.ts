// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiSettings } from '../api-settings';
import { GeneratedService } from './_service';
import { CachedConnection, JanitorReport } from './models';

@Injectable()
export class GeneratedAdminService extends GeneratedService {

    constructor(
       protected http: HttpClient,
       protected api: ApiSettings
    ) { super(http, api); }

    public loadVersion(): Observable<any> {
      return this.http.get<any>(this.api.url + '/api/version');
    }
    public createAnnouncement(text: string): Observable<boolean> {
        return this.http.post<boolean>(this.api.url + '/api/admin/announce', text);
    }
    public export(ids: Array<number>): Observable<Array<string>> {
        return this.http.post<Array<string>>(this.api.url + '/api/admin/export', {});
    }
    public import(): Observable<Array<string>> {
        return this.http.get<Array<string>>(this.api.url + '/api/admin/import');
    }
    public listConnections(): Observable<Array<CachedConnection>> {
        return this.http.get<Array<CachedConnection>>(this.api.url + '/api/admin/live');
    }
    public cleanup(): Observable<JanitorReport[]> {
      return this.http.post<JanitorReport[]>(this.api.url + '/api/admin/janitor', null);
    }
}
