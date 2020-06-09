// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy } from '@angular/core';
import { GamespaceService } from '../../../api/gamespace.service';
import { Gamespace, Vm } from '../../../api/gen/models';
import { Observable, BehaviorSubject, combineLatest, timer, Subscription } from 'rxjs';
import { VmService } from '../../../api/vm.service';
import { map, switchMap, filter, shareReplay } from 'rxjs/operators';
import { ToolbarService } from '../../svc/toolbar.service';

@Component({
  selector: 'topomojo-gamespaces',
  templateUrl: './gamespaces.component.html',
  styleUrls: ['./gamespaces.component.scss']
})
export class GamespacesComponent implements OnDestroy {

  currentId = 0;
  currentSubject = new BehaviorSubject<string>('');
  refreshSubject = new BehaviorSubject(<boolean>(true));
  games: Observable<Array<Gamespace>>;
  vms: Observable<Array<Vm>>;

  private subs: Subscription[] = [];

  constructor(
    private gameSvc: GamespaceService,
    vmSvc: VmService,
    toolbar: ToolbarService
  ) {
    toolbar.search(true);

    this.games = combineLatest([
      this.refreshSubject.pipe(
        switchMap(() => this.gameSvc.list('all')
      )),
      toolbar.term$
    ]).pipe(
      map(([gamespaces, term]) => gamespaces.filter(g => g.name.includes(term)))
    );

    this.vms = this.currentSubject.pipe(
      filter(id => !!id),
      switchMap(id => vmSvc.list(id)),
      shareReplay(1)
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  refresh() {
    this.refreshSubject.next(true);
  }

  select(game: Gamespace) {
    this.currentId = 0;
    this.subs.push(
      timer(500).subscribe(() => {
        this.currentId = game.id;
        this.currentSubject.next(game.globalId);
      })
    );
  }

  players(game: Gamespace): string {
    return game.players.map(p => p.personName).join() || game.audience;
  }

  delete(game: Gamespace): void {
    this.gameSvc.delete(game.id).subscribe(
      () => {
        this.refreshSubject.next(true);
      }
    );
  }

  trackById(item: Gamespace): number {
    return item.id;
  }
}
