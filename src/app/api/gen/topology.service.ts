// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiSettings } from '../api-settings';
import { GeneratedService } from './_service';
// tslint:disable-next-line:max-line-length
import { ChangedWorkspace, PrivilegedWorkspaceChanges, GameState, NewWorkspace, Player, Search, Template, Workspace, WorkspaceSearchResult, WorkspaceState, WorkspaceStateAction, WorkspaceStateActionTypeEnum, WorkspaceSummary, WorkspaceSummarySearchResult, VmOptions, VmState, Worker } from './models';

@Injectable()
export class GeneratedTopologyService extends GeneratedService {

    constructor(
       protected http: HttpClient,
       protected api: ApiSettings
    ) { super(http, api); }

    public getWorkspaceSummaries(search: Search): Observable<WorkspaceSummarySearchResult> {
        return this.http.get<WorkspaceSummarySearchResult>(this.api.url + '/api/workspace/summaries' + this.paramify(search));
    }
    public getWorkspaces(search: Search): Observable<WorkspaceSearchResult> {
        return this.http.get<WorkspaceSearchResult>(this.api.url + '/api/workspaces' + this.paramify(search));
    }
    public putWorkspace(model: ChangedWorkspace): Observable<any> {
        return this.http.put<any>(this.api.url + '/api/workspace', model);
    }
    public putWorkspacePriv(model: PrivilegedWorkspaceChanges): Observable<any> {
        return this.http.put<any>(this.api.url + '/api/workspace/priv', model);
    }
    public postWorkspace(model: NewWorkspace): Observable<Workspace> {
        return this.http.post<Workspace>(this.api.url + '/api/workspace', model);
    }
    public getWorkspace(id: number): Observable<Workspace> {
        return this.http.get<Workspace>(this.api.url + '/api/workspace/' + id);
    }
    public deleteWorkspace(id: number): Observable<boolean> {
        return this.http.delete<boolean>(this.api.url + '/api/workspace/' + id);
    }
    public getWorkspaceGames(id: number): Observable<Array<GameState>> {
        return this.http.get<Array<GameState>>(this.api.url + '/api/workspace/' + id + '/games');
    }
    public deleteTopoloyGames(id: number): Observable<boolean> {
        return this.http.delete<boolean>(this.api.url + '/api/workspace/' + id + '/games');
    }
    public postWorkspaceAction(id: number, action: WorkspaceStateAction): Observable<WorkspaceState> {
        return this.http.post<WorkspaceState>(this.api.url + '/api/workspace/' + id + '/action', action);
    }
    public postWorkerCode(code: string): Observable<boolean> {
        return this.http.post<boolean>(this.api.url + '/api/worker/enlist/' + code, {});
    }
    public deleteWorker(id: number): Observable<boolean> {
        return this.http.delete<boolean>(this.api.url + '/api/worker/' + id);
    }
    public getWorkspaceIsos(id: string): Observable<VmOptions> {
        return this.http.get<VmOptions>(this.api.url + '/api/workspace/' + id + '/isos');
    }
    public getWorkspaceNets(id: string): Observable<VmOptions> {
        return this.http.get<VmOptions>(this.api.url + '/api/workspace/' + id + '/nets');
    }

}
