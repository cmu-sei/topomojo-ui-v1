// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable, InjectionToken } from '@angular/core';
import { Observable, Subject, of ,  throwError as observableThrowError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { UserManagerSettings } from 'oidc-client';
import { catchError } from 'rxjs/operators';
import { ShowdownOptions } from 'showdown';
import { PlatformLocation } from '@angular/common';

export class Layout {
    embedded: boolean;
}

@Injectable()
export class SettingsService {
    tabRefs = {};
    private storageKey = 'topomojo-local';
    settings: Settings = {
        lang: 'en',
        maintMessage: '',
        branding: {
            applicationName: 'TopoMojo'
        },
        loginUrl: '/login',
        showdown: {
            strikethrough: true,
            tables: true,
            parseImgDimensions: true,
            smoothLivePreview: true,
            tasklists: true
        }
    };
    localSettings: LocalAppSettings = {};
    url = 'assets/config/settings.json';
    basehref = '';
    absoluteUrl = '';
    hostUrl = '';
    private _layout: Subject<Layout> = new Subject<Layout>();
    layout: Layout = new Layout();
    layout$: Observable<Layout> = this._layout.asObservable();

    constructor(
      private http: HttpClient,
      platform: PlatformLocation
    ) {
      this.basehref = platform.getBaseHrefFromDOM();
      this.absoluteUrl = `${window.location.protocol}//${window.location.host}${this.basehref}`;
      this.hostUrl = window.location.origin;
      this.localSettings = this.getLocal();
    }

    changeLayout(layout: Layout): void {
        this.layout = layout;
        this._layout.next(layout);
    }

    public showTab(url: string): void {
        if (typeof this.tabRefs[url] === 'undefined' || this.tabRefs[url].closed) {
            this.tabRefs[url] = window.open(url);
        } else {
            this.tabRefs[url].focus();
        }
    }

    public load(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.http.get<Settings>(this.url)
                .pipe(
                    catchError((error: any): any => {
                        console.log('invalid settings.json');
                        return of(new Object());
                    })
                )
                .subscribe((data: Settings) => {
                    this.settings = { ...this.settings, ...data };
                    this.http.get(this.url.replace(/json$/, 'env.json'))
                        .pipe(
                            catchError((error: any): any => {
                                return of(new Object());
                            })
                        )
                        .subscribe((customData: Settings) => {
                            this.settings = { ...this.settings, ...customData };
                            resolve(true);
                        });
                });
        });
    }

    updateTheme(v: boolean) {
        if (this.localSettings.altTheme !== v) {
            this.localSettings.altTheme = v;
            this.storeLocal(this.localSettings);
        }
    }
    updateLobbyFilter(f: string) {
        if (this.localSettings.lobbyFilter !== f) {
            this.localSettings.lobbyFilter = f;
            this.storeLocal(this.localSettings);
        }
    }
    updateLobbySort(s: string) {
        if (this.localSettings.lobbySort !== s) {
            this.localSettings.lobbySort = s;
            this.storeLocal(this.localSettings);
        }
    }

    storeLocal(model: LocalAppSettings) {
        try {
            window.localStorage[this.storageKey] = JSON.stringify(model);
        } catch (e) {
        }

        // this.onThemeUpdate.emit(theme);
    }

    getLocal(): LocalAppSettings {
        try {
            return JSON.parse(window.localStorage[this.storageKey] || {});
        } catch (e) {
            return {};
        }
    }

    clearStorage() {
        try {
            window.localStorage.removeItem(this.storageKey);
        } catch (e) { }
    }

}

export const ORIGIN_URL = new InjectionToken<string>('ORIGIN_URL');
export function getOriginUrl() {
    return (window && window.location) ? window.location.origin : '';
}

export const SHOWDOWN_OPTS = new InjectionToken<string>('SHOWDOWN_OPTS');
export function getShowdownOpts() {
    return {
        strikethrough: true,
        tables: true,
        parseImgDimensions: true,
        smoothLivePreview: true,
        tasklists: true
    };
}

export interface Settings {
    oidc?: UserManagerSettings;
    urls?: AppUrlSettings;
    branding?: BrandingSettings;
    loginUrl?: string;
    lang?: string;
    maintMessage?: string;
    showdown?: ShowdownOptions;
    local?: LocalAppSettings;
    useLocalStorage?: boolean;
}

export interface AppUrlSettings {
    apiUrl?: string;
    docUrl?: string;
}

export interface BrandingSettings {
    applicationName?: string;
    logoUrl?: string;
}

export interface LocalAppSettings {
    altTheme?: boolean;
    lobbyFilter?: string;
    lobbySort?: string;
}
