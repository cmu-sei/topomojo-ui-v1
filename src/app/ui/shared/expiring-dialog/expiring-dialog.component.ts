// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.
import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'topomojo-expiring-dialog',
  templateUrl: './expiring-dialog.component.html',
  styleUrls: ['./expiring-dialog.component.scss']
})
export class ExpiringDialogComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit() {
  }

}
