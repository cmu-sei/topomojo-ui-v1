// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { Component, OnInit, OnDestroy } from '@angular/core';
import { TopologyService } from '../../../api/topology.service';
import { Workspace, WorkspaceSearchResult, Search } from '../../../api/gen/models';
import { ToolbarService } from '../../svc/toolbar.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'topomojo-workspaces',
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.scss']
})
export class WorkspacesComponent implements OnInit, OnDestroy {

  current = 0;
  topos: Array<Workspace> = [];
  search: Search = {take: 26};
  hasMore = false;
  subs: Array<Subscription> = [];
  changedTopo = new Subject<Workspace>();
  changedTopo$ = this.changedTopo.asObservable();
  constructor(
    private topoSvc: TopologyService,
    private toolbar: ToolbarService
  ) { }

  ngOnInit() {
    this.subs.push(
      this.toolbar.term$.subscribe(
        (term: string) => {
          this.search.term = term;
          this.fetch();
        }
      ),

      this.changedTopo$.pipe(
        debounceTime(500)
      ).subscribe((topo) => {
        this.topoSvc.putWorkspacePriv(topo).subscribe();
      })
    );
    this.toolbar.search(true);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.toolbar.reset();
  }

  fetch() {
    this.search.skip = 0;
    this.topos = [];
    this.more();
  }

  more() {
    this.topoSvc.getWorkspaces(this.search).subscribe(
      (data: WorkspaceSearchResult) => {
        this.topos.push(...data.results);
        this.search.skip += data.results.length;
        this.hasMore = data.results.length === this.search.take;
      }
    );
  }

  filterChanged(e) {
    this.search.filters = [ e.value ];
    this.fetch();
  }

  workers(topo: Workspace): string {
    return topo.workers.map(p => p.personName).join();
  }

  select(topo: Workspace) {
    this.current = (this.current !== topo.id) ? topo.id : 0;
  }

  delete(topo: Workspace) {
    this.topoSvc.deleteWorkspace(topo.id).subscribe(
      () => {
        this.topos.splice(this.topos.indexOf(topo), 1);
      }
    );
  }

  trackById(i: number, item: Workspace): number {
    return item.id;
  }

  changeLimit(topo: Workspace, count: number) {
    topo.templateLimit += count;
    this.changedTopo.next(topo);
  }
}
