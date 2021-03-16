// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { NotificationService, HubEvent, Actor } from '../../../svc/notification.service';
import { Converter } from 'showdown/dist/showdown';
import { DocumentService } from '../../../api/document.service';
import { SettingsService } from '../../../svc/settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, auditTime, filter, distinctUntilChanged } from 'rxjs/operators';
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
    fixedOverflowWidgets: true,
    glyphMargin: true
  };
  timeLastSaved: string = '';
  statusMessage?: string;
  connectionLoading: boolean = true;
  private userTimestamps: UserSyncMap = {};
  private currentlyEditing: boolean = false;
  private editingStatus$: Subject<boolean> = new Subject<boolean>();
  private editingMonitor: any;
  private edits: DocumentEdits = {editsQueue: []};
  private editsSubject$: Subject<DocumentEdits> = new Subject<DocumentEdits>();
  private selections$: Subject<any> = new Subject<any>();
  private dirty: boolean;
  private applyingRemoteEdits: boolean = false;
  private appliedEditsLog: Array<AppliedEdit> = [];
  private editorViewState?: EditorViewState;
  private editorFocused: boolean = true;
  private tooltipMessage? = null;
  private saveInterval: Subscription;
  private editorEol? = null;
  private decorations = [];
  private colors = ["green", "purple ", "pride-yellow", "magenta", "sienna", "darkolive",  "cyan", "red", "brown", "seagreen ", "pink", "pride-red", "pride-orange", "teal"];
  private newColorIndex = 0;
  private remoteUsers = new Map<string, RemoteUserData>();
  private cursorMonitor: any;
  private startPositions = new Map<string, monaco.Position>();

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
        this.setCollaboratorsMessage();
        if (this.connectionLoading) { // TODO: handle case when someone is typing while user connects
          this.connectionLoading = false
          this.setReadOnly(false);
          this.forwardCursorSelections(this.editor?.getSelections());
        }
      }),
      this.editingStatus$.pipe(
        filter(() => !(this.readOnly || this.connectionLoading)),
      ).subscribe(
        (isEditing: boolean) => {
          this.notifier.editing(isEditing);
        }
      ),
      this.selections$.pipe(
        filter(() => !(this.readOnly || this.connectionLoading)),
        auditTime(1000) // Not essential, don't send updates frequently
      ).subscribe(
        (selections) => {
          this.notifier.cursorChanged(selections);
        }
      ),
      this.editsSubject$.pipe(
        filter(() => !(this.readOnly || this.connectionLoading)),
        auditTime(600), // Send typing updates at most every 600ms
      ).subscribe(
        (edits: DocumentEdits) => {
          this.notifier.edited(this.mapToDocumentEditsDTO(edits));
          this.edits.editsQueue = [];
        }
      ),
      this.notifier.documentEvents.subscribe(
        (event: HubEvent) => {
          if (event.action === 'DOCUMENT.CURSOR') { 
            this.updateRemotePositions(event.actor, event.model);
          } else if (event.action === 'DOCUMENT.SAVED') { 
            this.timeLastSaved = event.model.whenSaved;
            // Syncrhonize entire document from server copy when needed & available
            if (this.statusMessage == '' && (this.markdown.length != event.model.text.length || this.markdown != event.model.text)) {
              this.markdown = event.model.text; // TODO: make more efficient - only send whole document when needed (first use checksum, version id, timestamp, etc)
              this.dirty = false;
              this.render();
            }
          } else if (event.action === 'DOCUMENT.UPDATED') {
            const model: DocumentEdits = this.mapFromDocumentEditsDTO(event.model);
            const shortActorId = this.shortenId(event.actor.id);
            this.storeTransformations(model.editsQueue, shortActorId);
            this.applyRemoteEdits(model, shortActorId);
            this.render();
            this.userTimestamps[shortActorId] = model.timestamp;
          }
        }
      ),
      this.notifier.presenceEvents.subscribe(
        (event: HubEvent) => {
          if (event.action === 'PRESENCE.ARRIVED' || event.action === 'PRESENCE.GREETED') {
            this.forwardCursorSelections(this.editor?.getSelections());
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
    this.notifier.start(`${this.id}-doc`);
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
    this.currentlyEditing = true;
    this.setCollaboratorsMessage();
    clearTimeout(this.editingMonitor);
    this.editingMonitor = setTimeout(() => {
      this.currentlyEditing = false;
      this.editingStatus$.next(false);
      this.startPositions.clear();
      this.setCollaboratorsMessage();
      this.save(true);
    }, 3000);
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

  getUserColorClass(actor: Actor) {
    if (this.remoteUsers.has(actor.id)) {
      var online = "editor-offline";
      var light = "";
      if (actor.online)
        online = "editor-online"
      else 
        light = "-light"
      return `${online} editor-${this.remoteUsers.get(actor.id)?.color}${light}`;
    } else {
      return actor.online ? "online" : "";
    }
  } 

  onInitEditor(editor) {
    this.editor = editor;
    this.tooltipMessage = this.editor.getContribution('editor.contrib.messageController');
    if (this.editorViewState)
      this.restoreEditorViewState();
    else
      this.saveEditorViewState();
    this.editor.getModel().setEOL(monaco.editor.EndOfLineSequence.LF); // must be consistent across browsers
    this.editorEol = this.editor.getModel().getEOL();
    this.decorations = [];
    this.applyDecorations();
    // Save and restore editor view state when changed
    this.editor.onDidChangeCursorPosition((event) => this.editorViewChanged(event.reason) );
    this.editor.onDidChangeCursorSelection((event) => {
      this.editorViewChanged(event.reason);
      this.changedCursorSelections(event);
    });
    this.editor.onDidScrollChange(() => this.editorViewChanged(null) );
    // Provide appropriate message when in readOnly state
    this.editor.onDidAttemptReadOnlyEdit(() => {
      this.tooltipMessage?.showMessage('Loading remote document...', this.editor.getPosition());
    });
    this.editor.onDidChangeModelContent((event) => {
      if (event.isFlush || this.applyingRemoteEdits) // Only respond to local user changes
        return;
      this.forwardContentChange(event);
    });
    // Keep track of focus status to reset properly 
    this.editor.onDidFocusEditorWidget(() => this.editorFocused = true );
    this.editor.onDidBlurEditorWidget(() => this.editorFocused = false );
  }

  private forwardContentChange(event) {
    this.editing();
    const timestamp = this.generateTimestamp();
    const changeEvent = {
      changes: event.changes,
      timestamp: timestamp,
      userTimestamps: {...this.userTimestamps}, // Copy, not reference 
      startPosition: this.getStartPosition(event.changes)
    };
    this.edits.editsQueue.push(changeEvent);
    this.edits.timestamp = timestamp;
    this.storeTransformations([changeEvent], this.shortenId(this.notifier.getProfileId()));
    this.editsSubject$.next(this.edits);
    clearTimeout(this.cursorMonitor);
    this.cursorMonitor = setTimeout(() => {
      this.forwardCursorSelections(this.editor?.getSelections());
    }, 3000);
  }

  private applyRemoteEdits(changeModel: DocumentEdits, uid: string) {
    this.applyingRemoteEdits = true;
    changeModel.editsQueue.forEach(changeEvent => {
      var transformedChanges = this.applyTransformations(changeEvent, uid);
      var position = this.editor.getPosition();
      var shouldPreserveCursor = this.shouldPreserveCursor(transformedChanges, position);
      this.editor.getModel().applyEdits(transformedChanges); // TODO: use returned undo operation to store/modify so undo stack is not messed up
      if (shouldPreserveCursor)
        this.editor.setPosition(position);
    });
    this.applyingRemoteEdits = false;
  }

  /* For simple edits and selections, don't let remote users move cursor when at same position */
  private shouldPreserveCursor(changes: ChangeEvent, position: monaco.Position) {
    var selections = this.editor.getSelections();
    return (changes.length == 1 && selections.length == 1 &&
        selections[0].startLineNumber == selections[0].endLineNumber &&
        selections[0].startColumn == selections[0].endColumn &&
        changes[0].range.startLineNumber == position.lineNumber &&
        changes[0].range.startColumn == position.column);
  }
  
  /* Store any applied edits locally as a log to derive transformations */
  private storeTransformations(edits: Array<TimedChangeEvent>, uid: string) {
    var newLog = this.pruneTransformations();
    edits.forEach(changeEvent => {
      changeEvent.changes.forEach(change => {
        var selectionHeight = change.range.endLineNumber - change.range.startLineNumber;
        var startCol = (selectionHeight == 0) ? change.range.startColumn : 1;
        var selectionWidth = change.range.endColumn - startCol;
        var lines = change.text.split(this.editorEol);
        var newLinesAdded = lines.length - 1;
        var newColsAdded = lines[lines.length - 1].length;
        var lineDelta = newLinesAdded - selectionHeight;
        var colDelta = newColsAdded - selectionWidth;
        newLog.push({
          uid: uid,
          timestamp: changeEvent.timestamp,
          lineNumber: change.range.startLineNumber,
          colNumber: startCol,
          lineDelta: lineDelta,
          colDelta: colDelta,
          startPosition: changeEvent.startPosition
        });
      });
    })
    this.appliedEditsLog = newLog;
  }

  // Go through all applied edits and 
  private applyTransformations(incomingChangeEvent: TimedChangeEvent, uid: string) {
    var result: ChangeEvent = [];
    const ignoreStartPosition = incomingChangeEvent.changes.length > 1;
    incomingChangeEvent.changes.forEach(incomingChange => {
      var startLineNumber = incomingChange.range.startLineNumber;
      var startColNumber = incomingChange.range.startColumn;
      var lineOffset = 0;
      var colOffset = 0;
      this.appliedEditsLog.forEach(appliedEdit => {
        var lastHeardFromUser = incomingChangeEvent.userTimestamps[appliedEdit.uid] ?? 0;
        if (appliedEdit.uid != uid && // Not a previous edit from same user
            appliedEdit.timestamp > lastHeardFromUser) { // Happened after last received update from that user
          if (appliedEdit.lineNumber <= startLineNumber + lineOffset) { // On line number at or before new change
            lineOffset += appliedEdit.lineDelta;
          }
          if (appliedEdit.lineNumber + appliedEdit.lineDelta == startLineNumber + lineOffset && // on same line as new change
              (appliedEdit.colNumber < startColNumber + colOffset || // applied column before incoming column 
               (appliedEdit.colNumber == startColNumber + colOffset && // OR same
                appliedEdit.timestamp < incomingChangeEvent.timestamp)) && // but applied happened first
              ignoreStartPosition || (appliedEdit.startPosition.isBefore(incomingChangeEvent.startPosition) || // started typing position of applied is before incoming
                (appliedEdit.startPosition.equals(incomingChangeEvent.startPosition) && // OR same 
                appliedEdit.timestamp < incomingChangeEvent.timestamp))) { // but applied happened first
            colOffset += appliedEdit.colDelta;
          }
        }
      });
      var modifiedRange = {
        startLineNumber: incomingChange.range.startLineNumber + lineOffset,
        startColumn: incomingChange.range.startColumn + colOffset,
        endLineNumber: incomingChange.range.endLineNumber + lineOffset,
        endColumn: incomingChange.range.endColumn + colOffset
      }
      result.push({
        range: modifiedRange,
        text: incomingChange.text
      })
    });
    return result;
  }

  private pruneTransformations() {
    var recentTransformations = [];
    var currentTime = this.generateTimestamp();
    this.appliedEditsLog.forEach(edit => {
      if (currentTime - edit.timestamp < 10_000) {
        recentTransformations.push(edit);
      }
    });
    return recentTransformations;
  }

  // TODO: Finish this to find positions better 
  private getStartPosition(changes: ChangeEvent) {
    var change = changes[0];
    var length = change.range.startLineNumber == change.range.endLineNumber ? change.text.length : 0;
    var line = change.range.startLineNumber;
    var col = change.range.startColumn;
    var before = `${line},${col-1}`;
    if (this.startPositions.has(before))
      var result = this.startPositions.get(before);
    else
      var result = new monaco.Position(line, col);
    this.startPositions.set(`${line},${col}`, result);
    if (length != 0)
      this.startPositions.set(`${line},${col+length}`, result);
    return result;

  }

  private shortenId(id: string) {
    return id.substr(0, 8);
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

  private changedCursorSelections(event: monaco.editor.ICursorSelectionChangedEvent) {
    if (event.reason == CursorChangeReason.ContentFlush)
      return
    const selections = [event.selection, ...event.secondarySelections]
    this.forwardCursorSelections(selections);
  }

  private forwardCursorSelections(selections: monaco.Selection[]) {
    if (selections == null || selections.length == 0) {
      this.selections$.next([{sL: 1, sC: 1, eL: 1, eC: 1 }]);
      return;
    }
    var selectionsDTO = [];
    selections.forEach(selection => {
      selectionsDTO.push({
        sL: selection.startLineNumber,
        sC: selection.startColumn,
        eL: selection.endLineNumber,
        eC: selection.endColumn
      });
    });
    this.selections$.next(selectionsDTO);
  }

  private setReadOnly(readOnly: boolean) {
    if (this.readOnly != readOnly) {
      this.readOnly = readOnly;
      this.updateEditorOptions();
    }
  }

  private setCollaboratorsMessage() {
    var allEditors = this.actors.filter((a) => a.editing).map((a) => a.name ?? 'Anonymous');
    var message = '';
    var verb = 'are';
    if (this.currentlyEditing) {
      allEditors.unshift("You")
    } else if (allEditors.length == 1) {
      verb = 'is';
    }
    if (allEditors.length != 0) {
      message = allEditors.join(' & ')
      this.statusMessage = `${message} ${verb} editing...`
    } else {
      this.statusMessage = '';
    }
  }

  private updateEditorOptions(): void {
    const changedOptions = {
      theme: this.codeTheme,
      readOnly: this.readOnly
    };
    this.editorOptions = { ...this.editorOptions, ...changedOptions };
    this.applyDecorations();
  }

  private generateTimestamp() {
    const date = new Date();
    return date.getTime();
  }

  private updateRemotePositions(actor: Actor, selections: any) {
    if (this.remoteUsers.has(actor.id)) {
      var user = this.remoteUsers.get(actor.id);
    } else {
      var user = this.newUserData(actor.name);
      this.remoteUsers.set(actor.id, user);
    }
    user.positions = [];
    selections.forEach(selection => {
      user.positions.push(new monaco.Range(selection.sL, selection.sC, selection.eL, selection.eC));
    });
    this.applyDecorations();
  }

  private applyDecorations() {
    var newDecorations = [];
    this.remoteUsers.forEach((user, id) => {
      user.positions.forEach(position => {
        var isSingleCursor = false;
        var cursorColor = `editor-${user.color}`;
        var cursorBetween = '';
        if (position.startLineNumber == position.endLineNumber && position.startColumn == position.endColumn) {
          isSingleCursor = true;
          var cursorType = 'editor-cursor';
          if (position.startColumn != 1)
            cursorBetween = 'editor-cursor-between'; // just cursor (no selection) position in between characters
        } else {
          var cursorType = 'editor-selection';
        }
        newDecorations.push({
          range: position,
          options: {
            isWholeLine: false,
            className: `${cursorColor} ${cursorType} ${cursorBetween}`,
            hoverMessage: { value: user.name },
            stickiness: 1
          }
        });
        if (isSingleCursor) {
          newDecorations.push({
            range: position,
            options: {
              isWholeLine: false,
              className: `${cursorColor} editor-top`,
              stickiness: 1
            }
          });
        }
      });
      
    });
    this.decorations = this.editor?.deltaDecorations(this.decorations, newDecorations);
  }

  private newUserData(name: string) {
    var user: RemoteUserData = {
      positions: [],
      color: this.colors[(this.newColorIndex++) % this.colors.length],
      name: name
    }
    return user;
  }

  /* -- Manual mapping to smaller objects to transmit -- */

  private mapToDocumentEditsDTO(edits: DocumentEdits) {
    var editsQueue = []
    edits.editsQueue.forEach(changeEvent => {
      editsQueue.push(this.mapToChangeEventDTO(changeEvent));
    });
    const editsDTO: DocumentEditsDTO  = {
      q: editsQueue,
      t: edits.timestamp
    };
    return editsDTO;
  }

  private mapToChangeEventDTO(changeEvent: TimedChangeEvent) {
    var changesDTO = [];
    changeEvent.changes.forEach(change => {
      changesDTO.push({
        r: this.mapToRangeDTO(change.range),
        t: change.text
      })
    });
    const ChangeEventDTO = {
      c: changesDTO,
      t: changeEvent.timestamp,
      u: changeEvent.userTimestamps,
      s: changeEvent.startPosition // TODO: shorten this
    };
    return ChangeEventDTO;
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
      editsQueue.push(this.mapFromChangeEventDTO(changes));
    });
    const documentEdits: DocumentEdits = {
      editsQueue: editsQueue,
      timestamp: editsDTO.t,
    };
    return documentEdits;
  }
  
  private mapFromChangeEventDTO(changeEventDTO: any): TimedChangeEvent {
    var changes: ChangeEvent = [];
    changeEventDTO.c.forEach(change => {
      changes.push({
        range: this.mapFromRangeDTO(change.r),
        text: change.t
      })
    });
    const changeEvent = {
      changes: changes,
      timestamp: changeEventDTO.t,
      userTimestamps: changeEventDTO.u,
      startPosition: changeEventDTO.s
    };
    return changeEvent;
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

// Monaco Type Aliases 
import CursorChangeReason = monaco.editor.CursorChangeReason;
type TextRange = monaco.IRange;
type Editor = monaco.editor.ICodeEditor;
type Change =  monaco.editor.ISingleEditOperation;
type ChangeEvent = Array<Change>; // Multiple locations can be changed at once
type EditorOptions = monaco.editor.IStandaloneEditorConstructionOptions;
type EditorViewState = monaco.editor.ICodeEditorViewState;

export interface DocumentEdits {
  editsQueue: Array<TimedChangeEvent>;
  timestamp?: number;
}

// Data Transfer Object to efficiently transmit updates
export interface DocumentEditsDTO {
  q: any; // corresponds to editsQueue
  t: number; // corresponds to timestamp
}

export interface AppliedEdit {
  uid: string;
  timestamp: number;
  lineNumber: number;
  colNumber: number;
  lineDelta: number;
  colDelta: number;
  startPosition: monaco.Position;
}

export interface RemoteUserData {
  name: string;
  color: string;
  positions: TextRange[];
}

export interface UserSyncMap {
  [uid: string] : number;
}

export interface TimedChangeEvent {
  changes: ChangeEvent;
  timestamp: number;
  userTimestamps?: any;
  startPosition: monaco.Position;
}