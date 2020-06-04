// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, Input, ViewChild, ElementRef, EventEmitter, Output, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { IDataSource } from '../../datasources';

@Component({
  selector: 'topomojo-select-table',
  templateUrl: './select-table.component.html',
  styleUrls: ['./select-table.component.scss']
})
export class SelectTableComponent implements OnInit, AfterViewInit {
  @Input() term = '';
  @Input() take = 10;
  @Input() dataSource: IDataSource<any>;
  @Input() tableColumns: Array<string> = ['name'];
  @Input() filters: Array<string> = [];
  @Output() selected = new EventEmitter<any>();
  @ViewChild('input') input: ElementRef;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  skip = 0;

  constructor() { }

  ngOnInit() {
  }

  ngAfterViewInit() {

    fromEvent(this.input.nativeElement, 'input').pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(() => {
      this.term = this.term;
      this.queryChanged();
    });

    this.paginator.page
      .pipe(tap(() => this.queryChanged()))
      .subscribe();

    this.queryChanged();
  }

  queryChanged(): void {
    this.skip = this.paginator.pageIndex * this.paginator.pageSize;

    this.dataSource.load({
      term: this.term,
      skip: this.paginator.pageIndex * this.paginator.pageSize,
      take: this.paginator.pageSize,
      filter: this.filters
    });
  }

  clicked(item): void {
    this.selected.emit(item);
  }

}
