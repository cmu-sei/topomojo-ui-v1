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
  codeTheme: string = this.settingsSvc.localSettings.altTheme ? 'vs-dark' : 'vs-light';
  readOnly: boolean = true; // Initially locked until loaded
  editorOptions: EditorOptions = {
    theme: this.codeTheme,
    language: 'markdown',
    minimap: { enabled: false },
    lineNumbers: 'on',
    quickSuggestions: false,
    readOnly: this.readOnly,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    linkedEditing: true,
    fixedOverflowWidgets: true
  };
  remoteStatusMessage?: string;
  private datetimeLastSaved?: Date;
  private timeLastSaved?: string;
  private connectionLoading: boolean = true;
  private userTimestamps: UserTimeMap = {};
  private currentlyEditing: boolean = false;
  private editingStatus$: Subject<boolean> = new Subject<boolean>();
  private editingMonitor: any;
  private edits: DocumentEdits = {editsQueue: [], timestamp: 0, beginTime: 0};
  private edits$: Subject<DocumentEdits> = new Subject<DocumentEdits>();
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
  private colors = ['green', 'purple ', 'pride-yellow', 'magenta', 'sienna', 'darkolive',  'cyan', 'red', 'brown', 'seagreen ', 'pink', 'pride-red', 'pride-orange', 'teal'];
  private newColorIndex = 0;
  private remoteUsers = new Map<string, RemoteUserData>();
  private cursorMonitor: any;
  private unlockMonitor: any;
  private beginTypingPositions: Array<Position> = [];
  private beginTypingTime?: number;

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
    this.subs.push(
      this.toolbar.theme$.subscribe(
        (theme: boolean) => {
          this.codeTheme = theme ? 'vs-dark' : 'vs-light';
          this.updateEditorOptions();
        }
      ),
      this.notifier.key$.subscribe(key => {
        this.key = key;
      }),
      this.notifier.actors$.subscribe(actors => {
        this.actors = actors;
        if (this.actors.length == 0)
          return;
        this.setCollaboratorsMessage();
        if (this.connectionLoading) {
          this.connectionLoading = false
          this.restartInitialUnlocking(4000);
          this.forwardCursorSelections(this.editor?.getSelections());
        }
        for (var actor of this.actors) { // Remove cursors if left
          if (!actor.online)
            this.updateRemotePositions(actor, []);
        }
      }),
      this.editingStatus$.pipe(
        filter(() => !this.readOnly),
      ).subscribe(
        (isEditing: boolean) => {
          this.notifier.editing(isEditing);
        }
      ),
      this.selections$.pipe(
        filter(() => !this.connectionLoading),
        auditTime(1000) // Not that important, don't send updates as frequently
      ).subscribe(
        (selections) => {
          this.notifier.cursorChanged(selections);
        }
      ),
      this.edits$.pipe(
        filter(() => !this.readOnly),
        auditTime(600), // Send editing updates at most every 600ms
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
            var datetime = new Date(event.model.whenSaved);
            var timestamp = event.model.timestamp;
            // If incoming saved copy is newest version so far
            if (!this.datetimeLastSaved || this.datetimeLastSaved < datetime || (this.datetimeLastSaved == datetime && this.timeLastSaved < timestamp)) {
              this.datetimeLastSaved = datetime;
              this.timeLastSaved = timestamp;
              // Syncrhonize entire document from server copy when needed & available
              if (this.remoteStatusMessage == '' && (this.readOnly ||
                  this.markdown.length != event.model.text.length || this.markdown != event.model.text)) {
                // TODO: Make more efficient? Only send whole document when needed (checksum, version id, timestamp, etc)
                this.markdown = event.model.text;
                this.dirty = false;
                this.render();
                this.restartInitialUnlocking(4000);
              }
            }
          } else if (event.action === 'DOCUMENT.UPDATED') {
            const model: DocumentEdits = this.mapFromDocumentEditsDTO(event.model);
            const shortActorId = this.shortenId(event.actor.id);
            var transformed = this.applyRemoteEdits(model, shortActorId);
            this.storeTransformationLog(transformed, shortActorId, model.beginTime);
            this.render();
            this.userTimestamps[shortActorId] = model.timestamp;
            if (this.readOnly)
              this.restartInitialUnlocking(4000);
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
      this.save()
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

  editing(timestamp: number) {
    this.dirty = true;
    this.reRender();
    this.currentlyEditing = true;
    this.setCollaboratorsMessage();
    if (!this.beginTypingTime)
      this.beginTypingTime = timestamp;
    clearTimeout(this.editingMonitor);
    this.editingMonitor = setTimeout(() => {
      this.currentlyEditing = false;
      this.editingStatus$.next(false);
      this.storeBeginPositions(this.editor?.getSelections());
      this.beginTypingTime = null;
      this.setCollaboratorsMessage();
      this.save();
    }, 3000);
  }

  save() {
    if (this.dirty) {
      this.service.updateDocument(this.id, this.markdown)
        .subscribe(() => { this.dirty = false; });
    }
  }

  // TODO: hover text for these buttons is hard to see over list of actor names
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

  getSavedStatusMessage() {
    if (this.connectionLoading || this.readOnly)
      return 'Loading...';
    else if (this.remoteStatusMessage.length > 0)
      return 'Saving...'
    else if (this.datetimeLastSaved)
      return 'Saved ' + this.datetimeLastSaved.toLocaleString('en-us', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit'});
    else
      return '';
  }

  getUserColorClass(actor: Actor) {
    if (this.remoteUsers.has(actor.id)) {
      var online = actor.online ? 'editor-online': 'editor-offline';
      return `${online} editor-${this.remoteUsers.get(actor.id)?.color}`;
    } else {
      return actor.online ? 'online' : '';
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
    // Save and restore editor view state when model changed
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
    const timestamp = this.generateTimestamp();
    this.editing(timestamp);
    const changeEvent: TimedChangeEvent = {
      changes: event.changes,
      timestamp: timestamp,
      userTimestamps: {...this.userTimestamps},
      beginPositions: this.beginTypingPositions.length == event.changes.length ? [...this.beginTypingPositions] : []
    };
    this.edits.editsQueue.push(changeEvent);
    this.edits.timestamp = timestamp;
    this.edits.beginTime = this.beginTypingTime;
    this.storeTransformationLog([changeEvent], this.shortenId(this.notifier.getProfileId()), this.beginTypingTime);
    this.edits$.next(this.edits);
    // Send final cursor state after all editing is done for accurate position
    clearTimeout(this.cursorMonitor);
    this.cursorMonitor = setTimeout(() => {
      this.forwardCursorSelections(this.editor?.getSelections());
    }, 1500);
  }

  private applyRemoteEdits(changeModel: DocumentEdits, uid: string): Array<TimedChangeEvent> {
    this.applyingRemoteEdits = true;
    var allTransformedChanges: Array<TimedChangeEvent> = [];
    var tracker = {start: 0, set: false};
    changeModel.editsQueue.forEach(changeEvent => {
      var transformedChanges = this.applyTransformations(changeEvent, uid, changeModel.beginTime, tracker);
      var position = this.editor.getPosition();
      var shouldPreserveCursor = this.shouldPreserveCursor(transformedChanges, position);
      // TODO: can use returned undo operations to store/modify so undo stack works with remote editors
      this.editor.getModel().applyEdits(transformedChanges);
      allTransformedChanges.push({
        changes: transformedChanges,
        timestamp: changeEvent.timestamp,
        userTimestamps: changeEvent.userTimestamps,
        beginPositions: changeEvent.beginPositions
      });
      if (shouldPreserveCursor)
        this.editor.setPosition(position);
    });
    this.applyingRemoteEdits = false;
    return allTransformedChanges;
  }

  /* For simple edits and selections, don't let remote users move cursor when at same position */
  private shouldPreserveCursor(changes: ChangeEvent, position: Position) {
    var selections = this.editor.getSelections();
    return (changes.length == 1 && selections.length == 1 &&
        selections[0].startLineNumber == selections[0].endLineNumber &&
        selections[0].startColumn == selections[0].endColumn &&
        changes[0].range.startLineNumber == position.lineNumber &&
        changes[0].range.startColumn == position.column);
  }

  /* Store any applied edits as a log to apply transformations on future incoming operations */
  private storeTransformationLog(edits: Array<TimedChangeEvent>, uid: string, beginTime: number) {
    var newLog = this.pruneTransformations();
    edits.forEach(changeEvent => {
      var newEdits = [];
      changeEvent.changes.forEach((change, index) => {
        var selectionHeight = change.range.endLineNumber - change.range.startLineNumber;
        var lines = change.text.split(this.editorEol);
        var newLinesAdded = lines.length - 1;
        var newColsAdded = lines[lines.length - 1].length;
        var lineDelta = newLinesAdded - selectionHeight;
        var appliedEdit = {
          uid: uid,
          timestamp: changeEvent.timestamp,
          lineDelta: lineDelta,
          beginPosition: changeEvent.beginPositions[index] ?? null,
          range: this.createRange(change.range),
          newLines: newLinesAdded,
          bottomLineLength: newColsAdded,
          beginTime: beginTime
        };
        newEdits.push(appliedEdit);
      });
      newLog = this.insertIntoSorted(newLog, newEdits);
    });
    this.appliedEditsLog = newLog;
  }

  /* Go through all applied edits, filtering by user and timestamp, and transform
    the range/position of incoming changes with calculated offsets */
  private applyTransformations(incomingChangeEvent: TimedChangeEvent, uid: string, incomingBeginTime: number, tracker: any) {
    var result: ChangeEvent = [];
    incomingChangeEvent.changes.forEach((incomingChange, index) => {
      var incomingRange = this.createRange(incomingChange.range);
      tracker.set = false;
      var incomingBeginPosition = incomingChangeEvent.beginPositions[index] ?? incomingRange.getStartPosition();
      for (var i = tracker.start; i < this.appliedEditsLog.length; i++) {
        var appliedEdit = this.appliedEditsLog[i];
        var appliedBeginPosition = appliedEdit.beginPosition ?? appliedEdit.range.getStartPosition();
        var lastHeardFromUser = incomingChangeEvent.userTimestamps[appliedEdit.uid] ?? 0;
        // Transform if previous edit not from same user & happened after last received update from that user
        if (appliedEdit.uid != uid && appliedEdit.timestamp > lastHeardFromUser) {
          if (!tracker.set) {
            tracker.set = true;
            tracker.start = i; // optimization to avoid repeatedly looping through same old/irrelevant logged edits
          }
          if (appliedEdit.lineDelta != 0 || Range.spansMultipleLines(appliedEdit.range)) { // Line number change/modified multiple lines
            // Case 1: added content with newline on the same line before incoming change
            if (appliedEdit.range.startLineNumber == incomingRange.startLineNumber
                && appliedEdit.range.getEndPosition().isBeforeOrEqual(incomingRange.getStartPosition())) {
              incomingRange = this.shiftRange(incomingRange, appliedEdit.lineDelta, appliedEdit.bottomLineLength - (appliedEdit.range.startColumn - 1));
            // Case 2: selection replaced all text before incoming on current line and modified lines before
            } else if (appliedEdit.range.endLineNumber == incomingRange.startLineNumber) {
              var colsReplaced = (appliedEdit.newLines > 0) ? appliedEdit.range.endColumn - 1 : appliedEdit.range.endColumn - appliedEdit.range.startColumn;
              var colDelta = appliedEdit.bottomLineLength - colsReplaced;
              incomingRange = this.shiftRange(incomingRange, appliedEdit.lineDelta, colDelta);
            // Case 3: normal line add/remove *not* affecting same line as incoming change
            } else if (appliedEdit.range.getStartPosition().isBeforeOrEqual(incomingRange.getStartPosition())) {
              incomingRange = this.shiftRange(incomingRange, appliedEdit.lineDelta, 0);
            }
          } else if (appliedEdit.range.startLineNumber == incomingRange.startLineNumber) { // Same line, but not multi-line
            // Case 4: column where began typing is before incoming or equal but timestamp before
            if (appliedBeginPosition.isBefore(incomingBeginPosition)
                || (appliedBeginPosition.equals(incomingBeginPosition) && appliedEdit.beginTime < incomingBeginTime)) {
              var colDelta = (appliedEdit.bottomLineLength - (appliedEdit.range.endColumn - appliedEdit.range.startColumn));
              incomingRange = this.shiftRange(incomingRange, 0, colDelta);
            }
          }
          // TODO: When ranges intersecting: unpredictable, more complicated conflicts need resolving
          // if (Range.areIntersecting(appliedEdit.range, incomingRange)) { }
          // if (Range.strictContainsRange(appliedEdit.range, incomingRange)) { }
        }
      }
      result.push({
        range: {...incomingRange},
        text: incomingChange.text
      });
    });
    return result;
  }

  private shiftRange(range: Range, lineDelta: number, colDelta: number) {
    return new Range(range.startLineNumber + lineDelta, range.startColumn + colDelta,
                    range.endLineNumber + lineDelta,  range.endColumn + colDelta);
  }

  private createRange(range: IRange): Range {
    return new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
  }

  /* Remove all logged transformations older than 10 seconds */
  private pruneTransformations() {
    var recentTransformations: Array<AppliedEdit> = [];
    var currentTime = this.generateTimestamp();
    this.appliedEditsLog.forEach(edit => {
      if (currentTime - edit.timestamp < 10_000) {
        recentTransformations.push(edit);
      }
    });
    return recentTransformations;
  }

  /* Takes edits from a change event and inserts in the sorted log based on timestamp */
  private insertIntoSorted(editsLog: Array<AppliedEdit>, newEdits: Array<AppliedEdit>) {
    if (newEdits == null || newEdits.length == 0)
      return;
    var index = editsLog.length - 1;
    var time = newEdits[0].timestamp;
    // In many cases, will only need to append to the end to still be sorted
    while (index >= 0) {
      if (editsLog[index].timestamp < time)
        break;
      index--;
    }
    if (index == editsLog.length - 1)
      editsLog.push(...newEdits);
    else if (index == -1)
      editsLog.unshift(...newEdits);
    else
      editsLog = [...editsLog.slice(0, index + 1), ...newEdits, ...editsLog.slice(index + 1)]
    return editsLog;
  }

  private shortenId(id: string) {
    return id.substr(0, 8);
  }

  /* Begin or restart timer to unlock editor once it is 'safe' to do so */
  private restartInitialUnlocking(delay: number) {
    if (!this.readOnly)
      return;
    clearTimeout(this.unlockMonitor);
    this.unlockMonitor = setTimeout(() => {
      this.setReadOnly(false);
    }, delay);
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
      return;
    const selections = [event.selection, ...event.secondarySelections]
    this.forwardCursorSelections(selections);
    if (event.reason == CursorChangeReason.NotSet && event.source == 'keyboard')
      return;
    if (!this.applyingRemoteEdits)
      this.storeBeginPositions(selections);
  }

  private storeBeginPositions(selections: Array<monaco.Selection>) {
    if (selections == null)
      return;
    var sortedPositions = selections.map(s => s.getStartPosition()).sort((a,b) => {
      return -Position.compare(a, b); // edits come in desc order
    });
    this.beginTypingPositions = sortedPositions;
    if (this.currentlyEditing)
      this.beginTypingTime = this.generateTimestamp();
  }

  private forwardCursorSelections(selections: Array<monaco.Selection>) {
    if (selections == null || selections.length == 0) {
      this.selections$.next([{sL: 1, sC: 1, eL: 1, eC: 1 }]);
      return;
    }
    var selectionsDTO = [];
    selections.forEach(selection => {
      var selectionDTO: any = this.mapToRangeDTO(selection);
      if (selection.getDirection() == monaco.SelectionDirection.RTL)
        selectionDTO.r = true
      selectionsDTO.push(selectionDTO);
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
      allEditors.unshift('You')
    } else if (allEditors.length == 1) {
      verb = 'is';
    }
    if (allEditors.length != 0) {
      message = allEditors.join(' & ')
      this.remoteStatusMessage = `${message} ${verb} editing...`
    } else {
      this.remoteStatusMessage = '';
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
    return date.getTime(); // TODO: shorten for transfer
  }

  private updateRemotePositions(actor: Actor, selections: any) {
    if (this.remoteUsers.has(actor.id)) {
      var user = this.remoteUsers.get(actor.id);
    } else {
      var user = this.newUserData(actor.name);
      this.remoteUsers.set(actor.id, user);
    }
    user.positions = [];
    // Could apply transformations here, but probably not worth the computation
    selections.forEach(selection => {
      user.positions.push({
        range: this.mapFromRangeDTO(selection),
        rtl: selection.r ?? false
      })
    });
    this.applyDecorations();
  }

  private applyDecorations() {
    var newDecorations = [];
    this.remoteUsers.forEach((user, id) => {
      user.positions.forEach(remoteCursor => {
        var remoteRange = remoteCursor.range;
        var isSelection = !remoteCursor.range.isEmpty();
        if (remoteCursor.rtl)
          var cursorPosition = remoteRange.getStartPosition();
        else
          var cursorPosition = remoteRange.getEndPosition();
        var cursorRange = Range.fromPositions(cursorPosition, cursorPosition);
        var cursorColor = `editor-${user.color}`;
        var cursorBetween = cursorPosition.column == 1 ? '' : 'editor-cursor-between';

        if (isSelection) { // Selection decoration
          newDecorations.push({
            range: remoteRange,
            options: {
              isWholeLine: false,
              className: `${cursorColor} editor-selection`,
              stickiness: 1
            }
          });
        }
        newDecorations.push({ // Cursor decoration
          range: cursorRange,
          options: {
            isWholeLine: false,
            className: `${cursorColor} editor-cursor ${cursorBetween}`,
            hoverMessage: { value: user.name },
            stickiness: 1
          }
        });
        newDecorations.push({ // Cursor top box decoration
          range: cursorRange,
          options: {
            isWholeLine: false,
            className: `${cursorColor} editor-top`,
            stickiness: 1
          }
        });
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

  /* ----- Manual mapping to smaller data objects to send -----
    For example,'startLineNumber' and 'endLineNumber' become 'sL' and 'eL' */

  private mapToDocumentEditsDTO(edits: DocumentEdits) {
    var editsQueue = edits.editsQueue.map(changeEvent => {
      return this.mapToChangeEventDTO(changeEvent);
    });
    return {
      q: editsQueue,
      t: edits.timestamp,
      b: edits.beginTime
    };
  }

  private mapToChangeEventDTO(changeEvent: TimedChangeEvent) {
    var changesDTO = changeEvent.changes.map(change => {
      return { r: this.mapToRangeDTO(change.range), t: change.text }
    });
    return {
      c: changesDTO,
      t: changeEvent.timestamp,
      u: changeEvent.userTimestamps,
      bp: this.mapToPositionsDTO(changeEvent.beginPositions)
    };
  }

  private mapToRangeDTO(range: IRange) {
    return {
      sL: range.startLineNumber, sC: range.startColumn,
      eL: range.endLineNumber, eC: range.endColumn
    };
  }

  private mapToPositionsDTO(positions: Array<Position>) {
    return positions.map(position => {
        return {l: position.lineNumber, c: position.column }
    })
  }

  private mapFromDocumentEditsDTO(editsDTO: any): DocumentEdits {
    var editsQueue = editsDTO.q.map(changes => {
      return this.mapFromChangeEventDTO(changes);
    });
    return {
      editsQueue: editsQueue,
      timestamp: editsDTO.t,
      beginTime: editsDTO.b
    };
  }

  private mapFromChangeEventDTO(changeEventDTO: any): TimedChangeEvent {
    var changes: ChangeEvent = changeEventDTO.c.map(change => {
      return { range: this.mapFromRangeDTO(change.r), text: change.t }
    });
    return {
      changes: changes,
      timestamp: changeEventDTO.t,
      userTimestamps: changeEventDTO.u,
      beginPositions: this.mapFromPositionsDTO(changeEventDTO.bp)
    };
  }

  private mapFromRangeDTO(rangeDTO: any): Range {
    return new Range(rangeDTO.sL, rangeDTO.sC,rangeDTO.eL, rangeDTO.eC);
  }

  private mapFromPositionsDTO(positions: any): Array<Position> {
    return positions.map(position => {
        return new Position(position.l, position.c);
    })
  }

}

// Monaco Type and Class Aliases
import CursorChangeReason = monaco.editor.CursorChangeReason;
import Position = monaco.Position;
import Range = monaco.Range;
type IRange = monaco.IRange;
type Editor = monaco.editor.ICodeEditor;
type Change =  monaco.editor.ISingleEditOperation;
type ChangeEvent = Array<Change>; // Multiple locations can be changed at once
type EditorOptions = monaco.editor.IStandaloneEditorConstructionOptions;
type EditorViewState = monaco.editor.ICodeEditorViewState;

export interface DocumentEdits {
  editsQueue: Array<TimedChangeEvent>; // Queued edits to send
  timestamp: number;
  beginTime: number;
}

// Data Transfer Object to efficiently send updates over network
export interface DocumentEditsDTO {
  q: any; // editsQueue
  t: number; // timestamp
  b: number; // beginTime
}

export interface AppliedEdit {
  uid: string; // shortened uid of editing user
  range: Range; // range replaced with text
  newLines: number; // number of new lines added
  lineDelta: number; // number of net lines added/subtracted
  bottomLineLength: number; // length of new content (after any new lines)
  timestamp: number; // timestamp of edit
  beginPosition: Position; // editor position when started typing
  beginTime: number; // time when started typing
}

export interface RemoteUserData {
  name: string;
  color: string; // color in UI/editor
  positions: Array<{range: Range; rtl: boolean;}>; // cursors
}

/* Keeping track of last time got updates from each user */
export interface UserTimeMap {
  [uid: string] : number;
}

export interface TimedChangeEvent {
  changes: ChangeEvent;
  timestamp: number;
  userTimestamps: any;
  beginPositions: Array<Position>;
}
