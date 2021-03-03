// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { NotificationService, HubEvent, Actor } from '../../../svc/notification.service';
import { Converter } from 'showdown/dist/showdown';
import { DocumentService } from '../../../api/document.service';
import { SettingsService } from '../../../svc/settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, catchError, finalize, distinctUntilChanged, auditTime, filter } from 'rxjs/operators';
import { of, interval, Observable, Subscription, Subject } from 'rxjs';
import { ToolbarService } from '../../svc/toolbar.service';
import { MatDrawer } from '@angular/material/sidenav';
import * as monaco from 'monaco-editor';

import Position = monaco.Position;
import CursorChangeReason = monaco.editor.CursorChangeReason;
type Editor = monaco.editor.ICodeEditor;
type Change =  monaco.editor.IModelContentChange;
type Changes = Array<Change>;
type EditorOptions = monaco.editor.IStandaloneEditorConstructionOptions;
type EditorViewState = monaco.editor.ICodeEditorViewState;

@Component({
  selector: 'topomojo-document-editor',
  templateUrl: 'document-editor.component.html',
  styleUrls: ['document-editor.component.scss']
})
export class DocumentEditorComponent implements OnInit, OnDestroy {

  @ViewChild('imageDrawer') imageDrawer: MatDrawer;
  private converter: Converter;
  id: string;
  subs = [];
  key: string;
  actors: Array<Actor>;
  documentMessage? : string;
  lastSaved: string = '';
  diffPatcher = new diff.diff_match_patch();
  // Subscription for local user typing status
  editingDoc: boolean = false;
  private editingSource: Subject<boolean> = new Subject<boolean>();
  private editing$: Observable<boolean> = this.editingSource.asObservable();
  private editingMonitor: any;
  // Subscription for new changes to text content in editor
  private textEditsSource: Subject<any> = new Subject<any>();
  private textEdits$: Observable<any> = this.textEditsSource.asObservable();
  // Monitor for unlocking the document 
  private lockedMonitor: any;
  // markdown subject
  private editorChangeStatus$: Subject<any> = new Subject<any>();
  rendered: string;
  dirty: boolean;
  showImageDiv: boolean;
  markdown: string = '';
  applyingEdits: boolean = false;
  editor?: Editor = null;
  editorViewState?: EditorViewState;
  editorFocused: boolean = true;
  userEditing?: string;
  remoteCursor?: Position = null;
  tooltipMessage? = null;
  connectionLoading: boolean = true;
  readOnly = false; // start locked until loaded 
  codeTheme = this.settingsSvc.localSettings.altTheme ? 'vs-dark' : 'vs-light';
  editorOptions: EditorOptions = {
    theme: this.codeTheme,
    language: 'markdown',
    minimap: { enabled: false },
    lineNumbers: "on",
    quickSuggestions: false,
    readOnly: this.readOnly,
    wordWrap: "on",
    scrollBeyondLastLine: false,
    linkedEditing: true,
    hover: { delay: 0 },
    fixedOverflowWidgets: true
  };
  private saveInterval: Subscription;

  constructor(
    private service: DocumentService,
    private settingsSvc: SettingsService,
    private router: Router,
    private route: ActivatedRoute,
    private toolbar: ToolbarService,
    private notifier: NotificationService
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
        this.startListening();
      }
    );
    this.toolbar.theme$.subscribe(
      (theme: boolean) => {
        this.codeTheme = theme ? 'vs-dark' : 'vs-light';
        this.updateEditorOptions();
      }
    )
    this.subs.push(
      this.notifier.key$.subscribe(key => {
        this.key = key;
      }),
      this.notifier.actors$.subscribe(actors => {
        this.actors = actors;
        if (this.actors.length == 0)
          return;
        if (this.connectionLoading) {
          this.connectionLoading = false
          this.setReadOnly(false);
        }
      }),
      this.editing$.subscribe(
        (isEditing: boolean) => {
          if (!isEditing) // only send when stop typing => DOCUMENT.IDLE
            this.notifier.editing(isEditing);
        }
      ),
      // this.textEdits$.pipe(
      //     auditTime(200),
      //     distinctUntilChanged()
      //   ).subscribe(
      //   (edits: DocumentUpdates) => {
      //     console.log("debounce");
      //     this.notifier.edited(edits);
      //   }
      // ),
      this.editorChangeStatus$.pipe(
          filter(() => !(this.readOnly || this.connectionLoading)),
          auditTime(200), // send updates at most every 200ms
          distinctUntilChanged((prev, curr) => prev.markdown === curr.markdown)
        ).subscribe(
        (status: EditorStatus) => {
          console.log("debounce");
          const model: DocumentUpdates = {
            position: status.position,
            changes: null,
            patches: this.createPatchModel()
          };
          setTimeout( () => { this.notifier.edited(model); }, 1000 );
          // this.notifier.edited(model);
          this.previousMarkdown = this.markdown;
        }
      ),
      this.notifier.documentEvents.subscribe(
        (event: HubEvent) => {
          console.log("Doc Event", event);
          if (event.action == 'DOCUMENT.IDLE') {
            // this.resetRemoteEditor();
          } else if (event.action == 'DOCUMENT.SAVED') { 
            // this.lastSaved = event.model.whenSaved;
            // if (!this.editingDoc) // syncrhonize entire document when possible
            //   this.markdown = event.model.text;
            // this.resetRemoteEditor(); // treat SAVED as end of typing... bad bc autosave, etc
          } else if (event.action == 'DOCUMENT.UPDATED') {
            this.remoteEditingStarted();
            this.userEditing = event.actor.name;
            this.documentMessage = this.userEditing + ' is editing...';
            // this.setReadOnly(true);
            console.log(event.model.patches);
            this.applyPatches(event.model.patches);
            this.previousMarkdown = this.markdown;
            // this.applyRemoteEdit(event.model.changes);
            this.remoteCursor = event.model.position;
            // this.setRemoteCursor();
            this.render();
          }
        }
      )
    );
  }

  ngOnDestroy() {
    this.toolbar.reset();
    this.notifier.stop();
    if (this.saveInterval) { this.saveInterval.unsubscribe(); }
    this.subs.forEach(sub => { sub.unsubscribe(); });
  }

  startListening(): void {
    this.notifier.start(this.id);
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

  editing() {
    if (this.readOnly)
      return
    this.reRender();
    this.editingDoc = true;
    this.editingSource.next(this.editingDoc);
    clearTimeout(this.editingMonitor);
    this.editingMonitor = setTimeout(() => {
      this.editingDoc = false;
      this.editingSource.next(this.editingDoc);
      this.save();
    }, 2000);
  }

  remoteEditingStarted() { 
    clearTimeout(this.lockedMonitor);
    this.lockedMonitor = setTimeout(() => {
      // shouldn't ever get past 2000ms without IDLE or UPDATED event to clear monitor
      this.resetRemoteEditor();
    }, 5000); 
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
        text: 'return to workspace',
        icon: 'arrow_back',
        clicked: () => this.returnToWorkspace()
      },
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

  returnToWorkspace(): void {
    this.router.navigate([`/topo/`] );
  }

  docCurrentlyEdited() {
    return !this.connectionLoading && (this.readOnly || this.editingDoc);
  }

  onInitEditor(editor: Editor) {
    this.editor = editor;
    this.tooltipMessage = this.editor.getContribution('editor.contrib.messageController');
    if (this.editorViewState)
      this.restoreEditorViewState();
    else
      this.saveEditorViewState();
    // save and restore editor view state when changed
    this.editor.onDidChangeCursorPosition((event) => this.editorViewChanged(event.reason) );
    this.editor.onDidChangeCursorSelection((event) => this.editorViewChanged(event.reason) );
    this.editor.onDidScrollChange(() => this.editorViewChanged(null) );
    // give appropriate message when in readOnly state
    this.editor.onDidAttemptReadOnlyEdit(() => {
      const message = this.userEditing ? `Wait for ${this.userEditing} to finish typing` : 'Loading remote document...';
      this.tooltipMessage?.showMessage(message, this.editor.getPosition());
    });
    this.editor.onDidChangeModelContent((event) => {
      if (event.isFlush || this.applyingEdits) { // only respond to local/user-made changes
        console.log("flush");
        this.previousMarkdown = this.markdown;
        return;
      }
      // const diffs = this.diffPatcher.diff_main(this.previousMarkdown, this.markdown);
      // const patches = this.diffPatcher.patch_make(diffs);
      const patches = this.diffPatcher.patch_make(this.previousMarkdown, this.markdown);
      console.log(patches);
      // const model: DocumentUpdates = {
      //   changes: event.changes,
      //   position: this.getNewCursorPosition(event.changes),
      //   patches: patches
      // };
      this.editing();
      // this.textEditsSource.next(model);
      const model: EditorStatus = {
        markdown: this.markdown,
        position: this.getNewCursorPosition(event.changes)
      };
      this.editorChangeStatus$.next(model);
    });
    // keep track of focus status to reset properly 
    this.editor.onDidFocusEditorWidget(() => this.editorFocused = true );
    this.editor.onDidBlurEditorWidget(() => this.editorFocused = false );
  }

  private createPatchModel() {
    const patches = this.diffPatcher.patch_make(this.previousMarkdown, this.markdown);
    return patches;
  }

  private applyPatches(patches) {
    const result = this.diffPatcher.patch_apply(patches, this.markdown);
    console.log(result);
    if (result[1][0] == false)
      alert(result);
    this.markdown = result[0];
    this.previousMarkdown = this.markdown;
  }

  private applyRemoteEdit(changes: Changes) {
    this.applyingEdits = true;
    this.editor.getModel().applyEdits(changes);
    this.applyingEdits = false;
  }

  private saveEditorViewState() {
    this.editorViewState = this.editor?.saveViewState();
  }
  
  private restoreEditorViewState() {
    this.editor?.restoreViewState(this.editorViewState);
    if (this.editorFocused)
      this.editor?.focus();
    this.tooltipMessage = this.editor.getContribution('editor.contrib.messageController');
    // this.setRemoteCursor();
  }
  
  private editorViewChanged(reason?: CursorChangeReason) {
    if (reason && reason == CursorChangeReason.ContentFlush)
      this.restoreEditorViewState();
    else
      this.saveEditorViewState();
  }

  private setReadOnly(readOnly: boolean) {
    this.readOnly = readOnly;
    this.updateEditorOptions();
  }

  private updateEditorOptions(): void {
    const changedOptions = {
      theme: this.codeTheme,
      readOnly: this.readOnly
    }
    this.editorOptions = { ...this.editorOptions, ...changedOptions }
  }

  private resetRemoteEditor() {
    this.documentMessage = '';
    this.userEditing = '';
    this.setReadOnly(false);
    clearTimeout(this.lockedMonitor);
  }

  private getNewCursorPosition(changes: Changes): Position {
    const change = changes[0];
    const newLineNumber = change.range.startLineNumber;
    const newColumn = change.range.startColumn + change.text.length;
    return new Position(newLineNumber, newColumn);
  }
  
  private setRemoteCursor() {
    if (this.tooltipMessage && this.remoteCursor && this.userEditing)
        this.tooltipMessage.showMessage(this.userEditing, this.remoteCursor);
  }
}

export interface DocumentUpdates {
  changes: Changes;
  position: Position;
  patches: any;
}

export interface EditorStatus {
  markdown: string;
  position: Position;
}