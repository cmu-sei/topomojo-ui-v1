// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiSettings } from './api-settings';
import { GeneratedAdminService } from './gen/admin.service';
import { CachedConnection } from './gen/models';

@Injectable()
export class AdminService extends GeneratedAdminService {

    constructor(
       protected http: HttpClient,
       protected api: ApiSettings
    ) { super(http, api); }

    public postAdminExport(ids: Array<number>): Observable<Array<string>> {
        return this.http.post<Array<string>>(this.api.url + '/api/admin/export', ids);
    }
}
