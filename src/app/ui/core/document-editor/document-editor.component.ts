// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { NotificationService, HubEvent, Actor } from '../../../svc/notification.service';
import { Converter } from 'showdown/dist/showdown';
import { DocumentService } from '../../../api/document.service';
import { SettingsService } from '../../../svc/settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, auditTime, filter } from 'rxjs/operators';
import { of, interval, Subscription, Subject } from 'rxjs';
import { ToolbarService } from '../../svc/toolbar.service';
import { MatDrawer } from '@angular/material/sidenav';
import * as monaco from 'monaco-editor';

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
  markdown: string = '';
  rendered: string;
  editor?: Editor = null;
  editorModel?: EditorModel = null;
  codeTheme: string = this.settingsSvc.localSettings.altTheme ? 'vs-dark' : 'vs-light';
  readOnly: boolean = true; // Initially locked until loaded
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
    // hover: { delay: 0 },
    fixedOverflowWidgets: true
  };
  timeLastSaved: string = '';
  statusMessage?: string;
  connectionLoading: boolean = true;
  private editStartTime?: number;
  private lastOutTime?: number;
  private userTimestamps: UserSyncMap = {};
  private currentlyEditing: boolean = false;
  private editingMonitor: any;
  private lockedMonitor: any;
  private edits: DocumentEdits = {editsQueue: []};
  private editsSubject$: Subject<DocumentEdits> = new Subject<DocumentEdits>();
  private dirty: boolean;
  private applyingRemoteEdits: boolean = false;
  private appliedEditsLog: Array<AppliedEditOffset> = [];
  private editorViewState?: EditorViewState;
  private editorFocused: boolean = true;
  private userEditing?: string;
  private tooltipMessage? = null;
  remoteCursor?: Position = null; // NOT USED
  private saveInterval: Subscription;
  private editorEol? = null;
  

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
      this.editsSubject$.pipe(
        filter(() => !(this.readOnly || this.connectionLoading)),
        auditTime(800), // Send updates at most every 300ms
      ).subscribe(
        (edits: DocumentEdits) => {
          console.log("edits about to send",edits.editsQueue, edits);
          // this.notifier.edited(this.mapToDocumentEditsDTO(edits)); 
          this.notifier.edited(edits);
          this.edits.editsQueue = [];
          console.log("SENT update @", edits.timestamp);
        }
      ),
      this.notifier.documentEvents.subscribe(
        (event: HubEvent) => {
          console.log(event);
          if (event.action == 'DOCUMENT.SAVED') { 
            this.timeLastSaved = event.model.whenSaved;
            if (!this.currentlyEditing && (this.markdown.length != event.model.text.length || this.markdown != event.model.text)) {
              // this.markdown = event.model.text; // Syncrhonize entire document from server copy when available
              // this.render();
            }
            this.resetRemoteEditor(); // Unlock once remote edits are saved
          } else if (event.action == 'DOCUMENT.UPDATED') {
            // console.log(event.model);
            // const model = this.mapFromDocumentEditsDTO(event.model);
            const model: DocumentEdits = event.model;
            // if (this.currentlyEditing) { // Conflict
            //   if (this.hasPriority(event.actor, model.timestamp)) { 
            //     return; // Don't apply changes and don't lock document
            //   } else {
            //     this.currentlyEditing = false;
            //     this.editStartTime = null;
            //     clearTimeout(this.editingMonitor);
            //   }
            // }
            this.storeTransformations(model.editsQueue, event.actor.id);
            this.remoteEditingStarted();
            this.userEditing = event.actor.name;
            this.statusMessage = this.userEditing + ' is editing...';
            // this.setReadOnly(true);
            console.log("Applied edits before applying remote change", this.appliedEditsLog);
            this.applyRemoteEdit(model, event.actor.id);
            this.remoteCursor = model.position;
            this.render();
            this.userTimestamps[event.actor.id] = model.timestamp;
          }
        }
      )
    );
  }

  ngOnDestroy() {
    this.toolbar.reset();
    this.notifier.stop();
    if (this.saveInterval) { this.saveInterval.unsubscribe(); }
    if (this.currentlyEditing)
      this.save(true)
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
    this.dirty = true;
    this.reRender();
    if (!this.currentlyEditing) {
      this.currentlyEditing = true;
      this.editStartTime = this.generateTimestamp();
    }
    clearTimeout(this.editingMonitor);
    this.editingMonitor = setTimeout(() => {
      this.currentlyEditing = false;
      this.editStartTime = null;
      this.save(true);
    }, 3000);
  }

  /* Use a timer to monitor remote typing and locking. If they are disconnected 
    before sending a message to unlock, automatically release the lock after 7s. 
    Because an error may have occurred, reload the document from the server. */
  remoteEditingStarted() { 
    clearTimeout(this.lockedMonitor);
    this.lockedMonitor = setTimeout(() => {
      this.service.getDocument(this.id).pipe(
        catchError(err => of('# Document Title')),
        finalize(() => this.render())
      ).subscribe(
        (text: string) => {
          this.markdown = text;
          this.render();
          this.resetRemoteEditor();
          console.log({t:"reloaded document from disk"});
        }
      );
    }, 7000); 
  }

  save(fromTyping: boolean = false) {
    if (this.dirty || fromTyping) { 
      this.service.updateDocument(this.id, this.markdown, fromTyping)
        .subscribe(() => { this.dirty = false; });
    }
  }

  initToolbar() {
    this.toolbar.sideComponent = 'docimages';
    this.toolbar.sideData = { key: this.id };
    this.toolbar.addButtons([
      {
        text: 'return to workspaces',
        icon: 'arrow_back',
        clicked: () => this.returnToWorkspaces()
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

  returnToWorkspaces(): void {
    this.router.navigate([`/topo/`] );
  }

  docCurrentlyEdited() {
    return !this.connectionLoading && (this.readOnly || this.currentlyEditing);
  }

  onInitEditor(editor: Editor) {
    this.editor = editor;
    this.tooltipMessage = this.editor.getContribution('editor.contrib.messageController');
    if (this.editorViewState)
      this.restoreEditorViewState();
    else
      this.saveEditorViewState();
    this.editor.getModel().setEOL(monaco.editor.EndOfLineSequence.LF); // must be consistent across browsers
    this.editorEol = this.editor.getModel().getEOL();
    // Save and restore editor view state when changed
    this.editor.onDidChangeCursorPosition((event) => this.editorViewChanged(event.reason) );
    this.editor.onDidChangeCursorSelection((event) => this.editorViewChanged(event.reason) );
    this.editor.onDidScrollChange(() => this.editorViewChanged(null) );
    // Provide appropriate message when in readOnly state
    this.editor.onDidAttemptReadOnlyEdit(() => {
      const message = this.userEditing ? `Wait for ${this.userEditing} to finish typing` : 'Loading remote document...';
      this.tooltipMessage?.showMessage(message, this.editor.getPosition());
    });
    this.editor.onDidChangeModelContent((event) => {
      if (event.isFlush || this.applyingRemoteEdits) { // Only respond to local user changes
        return;
      }
      this.editing();
      const timestamp = this.generateTimestamp();
      const changeEvent = {
        changes: event.changes, 
        timestamp: timestamp,
        userTimestamps: {...this.userTimestamps}
      };
      this.edits.editsQueue.push(changeEvent);
      this.edits.position = this.getNewCursorPosition(event.changes);
      // this.edits.timestamp = this.editStartTime;
      this.edits.timestamp = timestamp;
      this.edits.userTimestamps = this.userTimestamps;
      this.storeTransformations([changeEvent], this.notifier.getProfileId());
      console.log("Applied edits after storing", timestamp, this.appliedEditsLog);
      this.editsSubject$.next(this.edits);
    });
    // Keep track of focus status to reset properly 
    this.editor.onDidFocusEditorWidget(() => this.editorFocused = true );
    this.editor.onDidBlurEditorWidget(() => this.editorFocused = false );
  }

  /* Check if local changes have priority over incoming remote changes. 
    Attempt to fairly choose first to begin typing. Use Profile ID for 
    deterministic tie breaker across browsers. */
  private hasPriority(actor: Actor, remoteStartTime: number, ): boolean {
    if (this.editStartTime < remoteStartTime)
      return true;
    else if (this.editStartTime > remoteStartTime)
      return false
    else
      return (this.notifier.getProfileId() < actor.id);
  }

  private applyRemoteEdit(changeModel: DocumentEdits, uid: string) {
    this.applyingRemoteEdits = true;
    changeModel.editsQueue.forEach(changeEvent => {
      console.log("about to transform remote edits", changeModel);
      var transformedChanges = this.applyTransformations(changeEvent, uid);
      this.editor.getModel().applyEdits(transformedChanges);
    });
    this.applyingRemoteEdits = false;
  }
  
  private storeTransformations(edits: Array<TimedChangeEvent>, uid: string) {
    console.log("Storing transforms");
    edits.forEach(changeEvent => {
      changeEvent.changes.forEach(change => {
        var selectionHeight = change.range.endLineNumber - change.range.startLineNumber;
        // console.log(selectionHeight);
        // console.log(change);
        console.log({eol:this.editorEol, code: this.editorEol.charCodeAt(0)});
        var newLinesAdded = change.text.split(this.editorEol).length - 1;
        var delta = newLinesAdded - selectionHeight;
        console.log("Delta", delta);
        if (delta != 0) {
          this.appliedEditsLog.push({
            uid: uid,
            timestamp: changeEvent.timestamp,
            lineNumber: change.range.startLineNumber,
            delta: delta
          })
        }
      });
    })
  }

  private applyTransformations(changeEvent: TimedChangeEvent, uid: string) {
    console.log("applying transforms");
    var result: ChangeEvent = [];
    changeEvent.changes.forEach(incomingChange => {
      var startLineNumber = incomingChange.range.startLineNumber;
      // get offset
      var lineOffset = 0;
      this.appliedEditsLog.forEach(appliedEdit => {
        var lastHeardFromUser = changeEvent.userTimestamps[appliedEdit.uid] ?? 0;
        if (appliedEdit.uid != uid &&
            appliedEdit.timestamp > lastHeardFromUser &&
            appliedEdit.lineNumber < startLineNumber + lineOffset) {
              // console.log("apply offset!");
              // console.log({
              //   e: previousEdit,
              //   c: incomingChange
              // });
              lineOffset += appliedEdit.delta;
        }
      });
      var modifiedRange = {
        startLineNumber: incomingChange.range.startLineNumber + lineOffset,
        startColumn: incomingChange.range.startColumn,
        endLineNumber: incomingChange.range.endLineNumber + lineOffset,
        endColumn: incomingChange.range.endColumn
      }
      console.log("incomimg:", incomingChange.range);
      console.log("new range", modifiedRange);
      result.push({
        range: modifiedRange,
        rangeOffset: incomingChange.rangeOffset,
        rangeLength: incomingChange.rangeLength,
        text: incomingChange.text
      })
    });
    return result;
  }

  private saveEditorViewState() {
    this.editorViewState = this.editor?.saveViewState();
  }
  
  private restoreEditorViewState() {
    this.editor?.restoreViewState(this.editorViewState);
    if (this.editorFocused)
      this.editor?.focus();
    this.tooltipMessage = this.editor.getContribution('editor.contrib.messageController');
  }
  
  private editorViewChanged(reason?: CursorChangeReason) {
    if (reason && reason == CursorChangeReason.ContentFlush)
      this.restoreEditorViewState();
    else
      this.saveEditorViewState();
  }

  private setReadOnly(readOnly: boolean) {
    if (this.readOnly != readOnly) {
      this.readOnly = readOnly;
      this.updateEditorOptions();
    }
  }

  private updateEditorOptions(): void {
    const changedOptions = {
      theme: this.codeTheme,
      readOnly: this.readOnly
    };
    this.editorOptions = { ...this.editorOptions, ...changedOptions };
  }

  private resetRemoteEditor() {
    this.userEditing = '';
    this.statusMessage = '';
    this.setReadOnly(false);
    clearTimeout(this.lockedMonitor);
  }

  private getNewCursorPosition(changes: ChangeEvent): Position {
    const change = changes[0];
    const newLineNumber = change.range.startLineNumber;
    const newColumn = change.range.startColumn + change.text.length;
    return new Position(newLineNumber, newColumn);
  }

  private generateTimestamp() {
    const date = new Date();
    console.log("Time stamp generated", date.getTime());
    return date.getTime();
  }


  private mapToDocumentEditsDTO(edits: DocumentEdits) {
    var editsQueue = []
    edits.editsQueue.forEach(changeEvent => {
      editsQueue.push(this.mapToChangesDTO(changeEvent.changes));
    });
    const editsDTO: DocumentEditsDTO  = {
      q: editsQueue,
      p: this.mapToPositionDTO(edits.position),
      t: edits.timestamp,
      u: this.userTimestamps
    };
    return editsDTO;
  }

  private mapToChangesDTO(changes: ChangeEvent) {
    var changesDTO = [];
    changes.forEach(change => {
      changesDTO.push({
        r: this.mapToRangeDTO(change.range),
        t: change.text
      })
    });
    return changesDTO;
  }

  private mapToPositionDTO(position: Position) {
    const positionDTO = {
      l: position.lineNumber,
      c: position.column
    }
    return positionDTO;
  }

  private mapToRangeDTO(range: TextRange) {
    return {
      sL: range.startLineNumber,
      sC: range.startColumn,
      eL: range.endLineNumber,
      eC: range.endColumn
    };
  }

  private mapFromDocumentEditsDTO(editsDTO: any): DocumentEdits {
    var editsQueue = []
    editsDTO.q.forEach(changes => {
      editsQueue.push(this.mapFromChangesDTO(changes));
    });
    const documentEdits: DocumentEdits = {
      editsQueue: editsQueue,
      position: this.mapFromPositionDTO(editsDTO.p),
      timestamp: editsDTO.t,
      userTimestamps: editsDTO.u
    };
    return documentEdits;
  }
  
  private mapFromChangesDTO(changesDTO: any): ChangeEvent {
    var changes: ChangeEvent = [];
    changesDTO.forEach(change => {
      changes.push({
        range: this.mapFromRangeDTO(change.r),
        rangeOffset: change.o,
        rangeLength: change.l,
        text: change.t
      })
    });
    return changes;
  }

  private mapFromPositionDTO(positionDTO: any): Position {
    return new Position(positionDTO.l, positionDTO.c);
  }

  private mapFromRangeDTO(rangeDTO: any): TextRange {
    const range: TextRange = {
      startLineNumber: rangeDTO.sL,
      startColumn: rangeDTO.sC,
      endLineNumber: rangeDTO.eL,
      endColumn: rangeDTO.eC
    }
    return range;
  }
}

// Monaco aliases 
import Position = monaco.Position;
import CursorChangeReason = monaco.editor.CursorChangeReason;
type TextRange = monaco.IRange;
type Editor = monaco.editor.ICodeEditor;
type EditorModel = monaco.editor.ITextModel;
type Change =  monaco.editor.IModelContentChange;
type ChangeEvent = Array<Change>; // Multiple locations can be changed at once
type EditorOptions = monaco.editor.IStandaloneEditorConstructionOptions;
type EditorViewState = monaco.editor.ICodeEditorViewState;

export interface DocumentEdits {
  editsQueue: Array<TimedChangeEvent>;
  position?: Position;
  timestamp?: number;
  userTimestamps?: any;
}

// Data Transfer Object to efficiently transmit updates
export interface DocumentEditsDTO {
  q: any; // editsQueue DTO
  p: any; // position DTO
  t: number; // timestamp
  u: any;
}

export interface AppliedEditOffset {
  uid: string;
  timestamp: number;
  lineNumber: number;
  delta: number;
}

export interface UserSyncMap {
  [uid: string] : number;
}

export interface TimedChangeEvent {
  changes: ChangeEvent;
  timestamp: number;
  userTimestamps?: any;
}