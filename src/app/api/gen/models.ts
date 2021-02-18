// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { SettingsService } from "src/app/svc/settings.service";

export interface CachedConnection {
    id?: string;
    room?: string;
    profileId?: string;
    profileName?: string;
}

export interface Message {
    id?: number;
    roomId?: string;
    authorName?: string;
    text?: string;
    whenCreated?: string;
    edited?: boolean;
}

export interface NewMessage {
    roomId?: string;
    text?: string;
}

export interface ChangedMessage {
    id?: number;
    text?: string;
}

export interface ImageFile {
    filename?: string;
}

export interface Gamespace {
    id?: number;
    globalId?: string;
    name?: string;
    slug?: string;
    audience?: string;
    whenCreated?: string;
    workspaceDocument?: string;
    workspaceId?: number;
    players?: Array<Player>;
}

export interface Player {
    id?: number;
    personId?: number;
    personName?: string;
    personGlobalId?: string;
    canManage?: boolean;
    canEdit?: boolean;
}

export interface GameState {
    id?: number;
    name?: string;
    globalId?: string;
    audience?: string;
    whenCreated?: string;
    workspaceDocument?: string;
    shareCode?: string;
    players?: Array<Player>;
    vms?: Array<VmState>;
}

export interface VmState {
    id?: string;
    templateId?: number;
    name?: string;
    isRunning?: boolean;
}

export interface Search {
    term?: string;
    skip?: number;
    take?: number;
    sort?: string;
    filter?: Array<string>;
}

export interface UserProfile {
    id?: number;
    globalId?: string;
    name?: string;
    role?: string;
    isAdmin?: boolean;
    workspaceLimit?: number;
    whenCreated?: string;
}

export interface ChangedUser {
    globalId?: string;
    name?: string;
}

export interface TemplateSummary {
    id?: number;
    name?: string;
    description?: string;
    workspaceId?: number;
    workspaceName?: string;
    parentId?: string;
    parentName?: string;
    isPublished?: boolean;
}

export interface Template {
    id?: number;
    parentId?: number;
    canEdit?: boolean;
    name?: string;
    description?: string;
    networks?: string;
    iso?: string;
    guestinfo?: string;
    isHidden?: boolean;
    workspaceId?: number;
    workspaceGlobalId?: string;
}

export interface ChangedTemplate {
    id?: number;
    name?: string;
    description?: string;
    networks?: string;
    iso?: string;
    guestinfo?: string;
    isHidden?: boolean;
    workspaceId?: number;
}

export interface TemplateLink {
    templateId?: number;
    workspaceId?: number;
}

export interface TemplateDetail {
    id?: number;
    name?: string;
    description?: string;
    networks?: string;
    guestinfo?: string;
    detail?: string;
    isPublished?: boolean;
}

export interface WorkspaceSummary {
    id?: number;
    globalId?: string;
    name?: string;
    slug?: string;
    description?: string;
    canManage?: boolean;
    canEdit?: boolean;
    isPublished?: boolean;
    author?: string;
    audience?: string;
    whenCreated?: string;
}

export interface Workspace {
    id?: number;
    globalId?: string;
    name?: string;
    slug?: string;
    description?: string;
    documentUrl?: string;
    shareCode?: string;
    author?: string;
    audience?: string;
    whenCreated?: string;
    canManage?: boolean;
    canEdit?: boolean;
    templateLimit?: number;
    isPublished?: boolean;
    gamespaceCount?: number;
    challenge?: string;
    workers?: Array<Worker>;
    templates?: Array<Template>;
}

export interface Worker {
    id?: number;
    personName?: string;
    personGlobalId?: string;
    canManage?: boolean;
    canEdit?: boolean;
}

export interface NewWorkspace {
    name?: string;
    description?: string;
}

export interface ChangedWorkspace {
    id?: number;
    name?: string;
    description?: string;
    author?: string;
    audience?: string;
    isPublished?: boolean;
    documentUrl?: string;
    templateLimit?: number;
}

export interface WorkspaceState {
    id?: number;
    shareCode?: string;
}

export interface VmOptions {
    iso?: Array<string>;
    net?: Array<string>;
}

export interface ConsoleSummary {
    id?: string;
    isolationId?: string;
    name?: string;
    url?: string;
    isRunning?: boolean;
}

export interface Vm {
    id?: string;
    name?: string;
    host?: string;
    path?: string;
    reference?: string;
    diskPath?: string;
    stats?: string;
    status?: string;
    groupName?: string;
    state?: VmStateEnum;
    question?: VmQuestion;
    task?: VmTask;
}

export interface VmQuestion {
    id?: string;
    prompt?: string;
    defaultChoice?: string;
    choices?: Array<VmQuestionChoice>;
}

export interface VmTask {
    id?: string;
    name?: string;
    progress?: number;
    whenCreated?: string;
}

export interface VmQuestionChoice {
    key?: string;
    label?: string;
}

export interface VmOperation {
    id?: string;
    type?: VmOperationTypeEnum;
    workspaceId?: number;
}

export interface KeyValuePair {
    key?: string;
    value?: string;
}

export interface VmAnswer {
    questionId?: string;
    choiceKey?: string;
}

export enum VmStateEnum {
    off = <any>'off',
    running = <any>'running',
    suspended = <any>'suspended'
}

export enum VmOperationTypeEnum {
    start = <any>'start',
    stop = <any>'stop',
    save = <any>'save',
    revert = <any>'revert',
    delete = <any>'delete'
}

export interface JanitorReport {
  id?: number;
  name?: string;
  reason?: string;
  age?: string;
}
