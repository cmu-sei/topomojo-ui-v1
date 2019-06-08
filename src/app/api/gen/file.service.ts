// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiSettings } from '../api-settings';
import { GeneratedService } from './_service';
import {  } from './models';

@Injectable()
export class GeneratedFileService extends GeneratedService {

    constructor(
       protected http: HttpClient,
       protected api: ApiSettings
    ) { super(http, api); }

    public getFileProgress(id: string): Observable<number> {
        return this.http.get<number>(this.api.url + '/api/file/progress/' + id);
    }
    public postFileUpload(): Observable<boolean> {
        return this.http.post<boolean>(this.api.url + '/api/file/upload', {});
    }

}
