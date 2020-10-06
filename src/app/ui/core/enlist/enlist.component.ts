// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { WorkspaceService } from '../../../api/workspace.service';
import { GamespaceService } from '../../../api/gamespace.service';

@Component({
  selector: 'topomojo-enlist',
  templateUrl: './enlist.component.html',
  styleUrls: ['./enlist.component.scss']
})
export class EnlistComponent implements OnInit {
  complete = false;
  errors = new Array<Error>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workspaceSvc: WorkspaceService,
    private gamespaceSvc: GamespaceService
  ) { }

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code');

    const url = this.route.snapshot.pathFromRoot.map(o => o.url[0]).join('/');
    console.log(url);
    // TODO: clean this up with a single api endpoint
    const query = (url.startsWith('/invite-gs'))
      ? this.gamespaceSvc.createPlayer(code)
      : this.workspaceSvc.createWorker(code);

    query.pipe(
      finalize(() => this.complete = true)
    ).subscribe(
      (result) => {
        this.router.navigate(['/topo'] );
      },
      (err) => this.errors.push(err.error || err)
    );
  }

}
