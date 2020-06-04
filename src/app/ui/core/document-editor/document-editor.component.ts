// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Converter } from 'showdown/dist/showdown';
import { DocumentService } from '../../../api/document.service';
import { SettingsService } from '../../../svc/settings.service';
import { ActivatedRoute } from '@angular/router';
import { catchError, finalize } from 'rxjs/operators';
import { of, interval, Observable, Subscription } from 'rxjs';
import { ToolbarService } from '../../svc/toolbar.service';
import { MatDrawer } from '@angular/material/sidenav';

@Component({
  selector: 'topomojo-document-editor',
  templateUrl: 'document-editor.component.html',
  styleUrls: ['document-editor.component.scss']
})
export class DocumentEditorComponent implements OnInit, OnDestroy {

  @ViewChild('imageDrawer') imageDrawer: MatDrawer;
  private converter: Converter;
  id: string;
  rendered: string;
  dirty: boolean;
  showImageDiv: boolean;
  markdown = '';
  private saveInterval: Subscription;

  constructor(
    private service: DocumentService,
    private settingsSvc: SettingsService,
    private route: ActivatedRoute,
    private toolbar: ToolbarService
  ) {
    this.converter = new Converter(settingsSvc.settings.showdown);
  }

  ngOnInit() {

    setTimeout(() => this.initToolbar(), 1);

    this.id = this.route.snapshot.params['key'];

    this.service.getDocument(this.id).pipe(
      catchError(err => of('# Document Title')),
      finalize(() => this.render())
    ).subscribe(
      (text: string) => {
        this.markdown = text;
      }
    );
  }

  ngOnDestroy() {
    this.toolbar.reset();

    if (this.saveInterval) { this.saveInterval.unsubscribe(); }
  }

  reRender() {
    if (!this.dirty) {
      if (!this.saveInterval) {
        this.saveInterval = interval(30000).subscribe(() => this.save());
      }
    }
    this.dirty = true;
    this.render();
  }

  render() {
    this.rendered = this.converter.makeHtml(this.markdown);
  }

  save() {
    if (this.dirty) {
      this.service.updateDocument(this.id, this.markdown)
        .subscribe(result => {
          this.dirty = false;
        });
    }
  }

  initToolbar() {
    this.toolbar.sideComponent = 'docimages';
    this.toolbar.sideData = { key: this.id };
    this.toolbar.addButtons([
      {
        text: 'save',
        icon: 'cloud_upload',
        clicked: () => this.save(),
      },
      {
        text: 'toggle image manager',
        icon: 'image',
        clicked: () => this.toolbar.toggleSide()
      }
    ]);
  }

}
