// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { DataSource, CollectionViewer } from '@angular/cdk/collections';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { TemplateService } from '../api/template.service';
import { TemplateSummary, Search, VmOptions } from '../api/gen/models';
import { catchError } from 'rxjs/operators';
import { WorkspaceService } from '../api/workspace.service';

export interface IDataSource<T> extends DataSource<T> {
    total: number;
    more: boolean;
    load(search: Search): void;
}

export class VmNetDataSource implements IDataSource<IsoFile> {

    private subject = new BehaviorSubject<Array<IsoFile>>([]);
    total = 0;
    more = false;
    private cache: Array<any>;

    constructor(
        private svc: WorkspaceService,
        private topoId: string
    ) { }

    connect(collectionViewer: CollectionViewer): Observable<Array<IsoFile>> {
        return this.subject.asObservable();
    }

    disconnect(collectionViewer: CollectionViewer): void {
        this.subject.complete();
    }

    load(search: Search): void {
        if (this.cache && (search.term || search.skip)) {
            this.emitResults(search);
            return;
        }

        this.svc.getWorkspaceNets(this.topoId).pipe(
        catchError(() => of([])),
        // finally(() => { })
        ).subscribe(
        (result: VmOptions) => {
            this.cache = result.net.map(s => ({ path: s, name: s.split('#').reverse().pop() }));
            this.total = this.cache.length;
            this.emitResults(search);
        });
    }

    emitResults(search: Search) {
        this.subject.next(
            this.cache.filter(i => i.name.match(search.term))
            .slice(search.skip, search.take)
       );
    }
}

export class IsoDataSource implements IDataSource<IsoFile> {

    private subject = new BehaviorSubject<Array<IsoFile>>([]);
    total = 0;
    more = false;
    private cache: Array<any>;

    constructor(
        private svc: WorkspaceService,
        private topoId: string
    ) { }

    connect(collectionViewer: CollectionViewer): Observable<Array<IsoFile>> {
        return this.subject.asObservable();
    }

    disconnect(collectionViewer: CollectionViewer): void {
        this.subject.complete();
    }

    load(search: Search): void {
        if (this.cache && (search.term || search.skip)) {
            this.emitResults(search);
            return;
        }

        this.svc.getWorkspaceIsos(this.topoId).pipe(
        catchError(() => of([])),
        // finally(() => { })
        ).subscribe(
        (result: VmOptions) => {
            this.cache = result.iso.map(s => ({ path: s, name: s.split('/').pop() }));
            this.total = this.cache.length;
            this.emitResults(search);
        });
    }

    emitResults(search: Search) {
        this.subject.next(
            this.filterCache(search)
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(search.skip, search.skip + search.take)
       );
    }

    filterCache(search: Search): Array<IsoFile> {
        const r = (search.term)
        ? this.cache.filter(i => i.name.match(search.term))
        : this.cache;

        this.total = r.length;
        return r;
    }
}

export interface IsoFile {
    path?: string;
    name?: string;
}

export class TemplateDataSource implements IDataSource<TemplateSummary> {

    private subject = new BehaviorSubject<TemplateSummary[]>([]);
    total = 0;
    more = false;
    constructor(
      private svc: TemplateService
    ) { }

    connect(collectionViewer: CollectionViewer): Observable<TemplateSummary[]> {
      return this.subject.asObservable();
    }

    disconnect(collectionViewer: CollectionViewer): void {
      this.subject.complete();
    }

    load(search: Search): void {
      this.svc.list(search).pipe(
        catchError(() => of([])),
        // finally(() => { })
      ).subscribe(
        (result: TemplateSummary[]) => {
          this.total = result.length;
          this.more = result.length === search.take;
          this.subject.next(result);
        }
      );
    }
  }
