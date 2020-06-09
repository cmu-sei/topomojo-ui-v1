// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiSettings } from '../api-settings';
import { GeneratedService } from './_service';
import { ChangedTemplate, Search, Template, TemplateDetail, TemplateLink, TemplateSummary } from './models';

@Injectable()
export class GeneratedTemplateService extends GeneratedService {

    constructor(
       protected http: HttpClient,
       protected api: ApiSettings
    ) { super(http, api); }

    public list(search: Search): Observable<TemplateSummary[]> {
        return this.http.get<TemplateSummary[]>(this.api.url + '/api/templates' + this.paramify(search));
    }
    public load(id: number): Observable<Template> {
        return this.http.get<Template>(this.api.url + '/api/template/' + id);
    }
    public delete(id: number): Observable<any> {
        return this.http.delete<any>(this.api.url + '/api/template/' + id);
    }
    public update(template: ChangedTemplate): Observable<any> {
        return this.http.put<any>(this.api.url + '/api/template', template);
    }
    public link(link: TemplateLink): Observable<Template> {
        return this.http.post<Template>(this.api.url + '/api/template', link);
    }
    public unlink(link: TemplateLink): Observable<Template> {
        return this.http.post<Template>(this.api.url + '/api/template/unlink', link);
    }
    public loadDetail(id: number): Observable<TemplateDetail> {
        return this.http.get<TemplateDetail>(this.api.url + '/api/template-detail/' + id);
    }
    public createDetail(model: TemplateDetail): Observable<TemplateDetail> {
        return this.http.post<TemplateDetail>(this.api.url + '/api/template-detail', model);
    }
    public updateDetail(template: TemplateDetail): Observable<any> {
        return this.http.put<any>(this.api.url + '/api/template-detail', template);
    }

}
