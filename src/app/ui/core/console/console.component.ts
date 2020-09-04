// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import {
  Component, OnInit, ViewChild, AfterViewInit,
  ElementRef, Input, Injector, HostListener, OnDestroy
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VmService } from '../../../api/vm.service';
import { ConsoleSummary, VmOperationTypeEnum } from '../../../api/gen/models';
import { catchError, debounceTime, map, distinctUntilChanged, tap } from 'rxjs/operators';
import { throwError as ObservableThrower, fromEvent, Subscription, timer } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { MockConsoleService } from './services/mock-console.service';
import { WmksConsoleService } from './services/wmks-console.service';
import { ConsoleService } from './services/console.service';
import { ToolbarService } from '../../svc/toolbar.service';
import { MatDrawer } from '@angular/material/sidenav';
import { AuthService, AuthTokenState } from '../../../svc/auth.service';
import { IsoDataSource, IsoFile, VmNetDataSource } from '../../datasources';
import { WorkspaceService } from '../../../api/workspace.service';
import { ClipboardService } from 'src/app/svc/clipboard.service';

@Component({
  selector: 'topomojo-console',
  templateUrl: './console.component.html',
  styleUrls: ['./console.component.scss'],
  providers: [
    MockConsoleService,
    WmksConsoleService
  ]
})
export class ConsoleComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() index = 0;
  @Input() id: string;
  info: ConsoleSummary = {};
  state = 'loading';
  shadowstate = 'loading';
  shadowTimer: any;
  canvasId = '';
  stateButtonIcons: any = {};
  stateIcon = '';
  console: ConsoleService;
  @ViewChild(MatDrawer) drawer: MatDrawer;
  @ViewChild('consoleCanvas') consoleCanvas: ElementRef;
  subs: Array<Subscription> = [];
  private hotspot = { x: 0, y: 0, w: 8, h: 8 };
  isoSource: IsoDataSource;
  netSource: VmNetDataSource;
  feedback = '';
  feedbackState = '';
  showCog = true;
  justClipped = false;
  justPasted = false;
  cliptext = '';

  constructor(
    private injector: Injector,
    private route: ActivatedRoute,
    private titleSvc: Title,
    private vmSvc: VmService,
    private topologySvc: WorkspaceService,
    private toolbar: ToolbarService,
    private tokenSvc: AuthService,
    private clipSvc: ClipboardService
  ) {
  }

  ngOnInit() {
    this.info.id = this.id || this.route.snapshot.paramMap.get('id');
  }

  ngAfterViewInit() {
    this.toolbar.visible(false);

    this.initTokenWatch();
    this.initHotspot();

    const el = this.consoleCanvas['nativeElement'];
    this.canvasId = el.id + this.index;
    el.id += this.index;

    this.titleSvc.setTitle(`console: ${this.route.snapshot.paramMap.get('name')}`);
    setTimeout(() => this.reload(), 1);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    if (this.console) { this.console.dispose(); }
  }

  changeState(state: string): void {
    if (state.startsWith('clip:')) {
      this.cliptext = state.substring(5);
      this.clipSvc.copyToClipboard(this.cliptext);
      return;
    }

    this.state = state;
    this.shadowState(state);
    this.drawer.close();

    switch (state) {
      case 'stopped':
        this.stateIcon = 'power_settings_new';
        break;

      case 'disconnected':
        this.stateIcon = 'refresh';
        break;

      case 'forbidden':
        this.stateIcon = 'block';
        break;

      case 'failed':
        this.stateIcon = 'close';
        break;

      default:
        this.stateIcon = '';
    }
  }

  stateButtonClicked(): void {
    switch (this.state) {
      case 'stopped':
        this.start();
        break;

      default:
        this.reload();
        break;
    }
  }

  reload() {
    this.changeState('loading');

    this.vmSvc.getVmTicket(this.info.id)
      .pipe(
        catchError(((err: Error) => {
          return ObservableThrower(err);
        })
        ))
      .subscribe(
        (info: ConsoleSummary) => {
          if (info.isolationId !== this.info.isolationId) {
            this.isoSource = new IsoDataSource(this.topologySvc, info.isolationId);
            this.netSource = new VmNetDataSource(this.topologySvc, info.isolationId);
          }
          this.info = info;
          this.console = (this.isMock())
            ? this.injector.get(MockConsoleService)
            : this.injector.get(WmksConsoleService);
          if (info.id) {
            if (info.isRunning) {
              this.console.connect(
                this.info.url,
                (state: string) => this.changeState(state),
                { canvasId: this.canvasId }
              );
            } else {
              this.changeState('stopped');
            }
          } else {
            this.changeState('failed');
          }
        },
        () => {
          // show error
          this.changeState('failed');
        },
        () => {
        }
      );

  }

  start(): void {
    this.changeState('starting');
    this.vmSvc.updateState({
      id: this.info.id,
      type: VmOperationTypeEnum.start
    }).subscribe(
      () => {
        this.reload();
      }
    );
  }

  isoSelected(iso: IsoFile) {
    this.reconfigureFeedback('pending', '');
    this.vmSvc.updateConfig(this.info.id, { key: 'iso', value: iso.path })
    .subscribe(
      () => {
        this.reconfigureFeedback('success', '');
      },
      (err) => this.reconfigureFeedback('fail', err.error?.message || err.message)
    );
  }

  netSelected(net: IsoFile) {
    this.reconfigureFeedback('pending', '');
    this.vmSvc.updateConfig(this.info.id, { key: 'net', value: net.path })
    .subscribe(
      () => {
        this.reconfigureFeedback('success', '');
      },
      (err) => this.reconfigureFeedback('fail', err.error?.message || err.message)
    );

  }

  reconfigureFeedback(state: string, msg: string) {
    this.feedbackState = state;
    this.feedback = `Configuration: ${msg || state}.`;
    if (msg !== 'pending') {
      timer(3000).subscribe(() => { this.feedback = ''; });
    }
  }

  shadowState(state: string): void {
    this.shadowstate = state;
    if (this.shadowTimer) { clearTimeout(this.shadowTimer); }
    this.shadowTimer = setTimeout(() => { this.shadowstate = ''; }, 5000);
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  isMock(): boolean {
    return this.info.url && this.info.url.match(/mock/) !== null;
  }

  showMockConnected(): boolean {
    return this.isMock() && this.state === 'connected';
  }

  toggleDrawer(): void {
    this.drawer.toggle();
  }

  initTokenWatch(): void {
    this.subs.push(
      this.tokenSvc.tokenState$.subscribe(
        (state: AuthTokenState) => {
          if (state === AuthTokenState.expired) {
            this.console.disconnect();
          }
        }
      )
    );
  }

  clip() {
    this.console.copy();
    this.justClipped = true;
    timer(2000).subscribe(i => this.justClipped = false);
  }

  paste() {
    this.console.paste(this.cliptext);
    this.justPasted = true;
    timer(2000).subscribe(i => this.justPasted = false);
  }

  initHotspot(): void {
    // this.hotspot.x = window.innerWidth - this.hotspot.w;
    this.subs.push(
      fromEvent(document, 'mousemove').pipe(
        debounceTime(100),
        tap((e: MouseEvent) => {
          if (this.drawer.opened && e.clientX > 400) {
            this.drawer.close();
          }
        }),
        map((e: MouseEvent) => {
          return this.isConnected() && !this.showCog && e.clientX < 4; // > this.hotspot.x;
        }),
        distinctUntilChanged()
      ).subscribe((hot: boolean) => {
        if (hot) { this.drawer.open(); }
      })
    );
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    // this.hotspot.x = event.target.innerWidth - this.hotspot.w;
    this.console.refresh();
  }
}
