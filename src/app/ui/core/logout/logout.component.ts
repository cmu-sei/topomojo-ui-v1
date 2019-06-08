// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../svc/auth.service';

@Component({
  selector: 'topomojo-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss']
})
export class LogoutComponent implements OnInit {

  constructor(
    private authSvc: AuthService
  ) { }

  ngOnInit() {
    this.authSvc.logout();
  }

}
