// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiSettings } from '../api-settings';
import { GeneratedService } from './_service';
import { ImageFile } from './models';

@Injectable()
export class GeneratedDocumentService extends GeneratedService {

    constructor(
       protected http: HttpClient,
       protected api: ApiSettings
    ) { super(http, api); }

    public updateDocument(id: string, text: string): Observable<any> {
        return this.http.put<any>(this.api.url + '/api/document/' + id, text);
    }
    public listImages(id: string): Observable<Array<ImageFile>> {
        return this.http.get<Array<ImageFile>>(this.api.url + '/api/images/' + id);
    }
    public deleteImage(id: string, filename: string): Observable<ImageFile> {
        return this.http.delete<ImageFile>(this.api.url + '/api/image/' + id + this.paramify({filename: filename}));
    }

}
