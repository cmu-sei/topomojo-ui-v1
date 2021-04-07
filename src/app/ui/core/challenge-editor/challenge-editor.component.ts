import { Component, Input, OnInit } from '@angular/core';
import { Workspace } from 'src/app/api/gen/models';
import { WorkspaceService } from 'src/app/api/workspace.service';
import { SettingsService } from 'src/app/svc/settings.service';
import * as YAML from 'yaml';
import { ToolbarService } from '../../svc/toolbar.service';

@Component({
  selector: 'topomojo-challenge-editor',
  templateUrl: './challenge-editor.component.html',
  styleUrls: ['./challenge-editor.component.scss']
})
export class ChallengeEditorComponent implements OnInit {
  @Input() workspace: Workspace;
  errors = [];
  readonly yamlLimit = 4096;
  yamlText = '';
  editorDirty = false;
  codeTheme = this.settingsSvc.localSettings.altTheme ? 'vs-dark' : 'vs-light';
  editorOptions = {
    theme: this.codeTheme,
    language: 'yaml',
    minimap: { enabled: false },
    scrollbar: { vertical: 'visible' },
    lineNumbers: "on",
    quickSuggestions: false,
    readOnly: false,
    wordWrap: "on",
    scrollBeyondLastLine: false,
    automaticLayout: true,
    lineNumbersMinChars: 4
  };
  sampleOptions = this.editorOptions;
  macroOptions = this.sampleOptions;
  sampleText =
`questions:
  - text: Who's on first?
    answer: Yes
    grader: match | matchAny | matchAll`;
  macroText =
`##target:type:range##
##key:hex:8##
##key:b64:24##
##key:uid:0##
##key:int:99-9999##
##key:list## one two three`;

  constructor(
    private api: WorkspaceService,
    private settingsSvc: SettingsService,
    private toolbar: ToolbarService
  ) { }

  ngOnInit(): void {
    YAML.scalarOptions.str.fold.lineWidth = 0;

    this.yamlText = YAML.stringify(
      JSON.parse(this.workspace.challenge || '{"questions":[]}')
    );

    this.toolbar.theme$.subscribe(
      (theme: boolean) => {
        this.codeTheme = theme ? 'vs-dark' : 'vs-light';
        this.updateEditorOptions();
      }
    );

    this.configureEditorOptions();
  }

  save(): void {
    try {
      if (this.codeLimit()) {
        this.errors.push({message: "Input too long"});
        return;
      }
      const model = YAML.parse(this.yamlText);
      this.api.putWorkspaceChallenge(this.workspace.id, model).subscribe(
        (response) => {
          this.editorDirty = false;
          this.errors = [];
        },
        (error) => {
          this.errors.push({message: "Error while saving"});
        }
      );
    } catch(ex) {
      this.errors.push(ex);
    }
  }

  updateEditorOptions(): void {
    this.editorOptions = { ...this.editorOptions, theme: this.codeTheme };
  }

  editorUpdated() {
    this.editorDirty = true;
  }

  needSaving(): boolean {
    return (this.editorDirty);
  }

  codeLimit(): boolean | undefined {
    return (this.yamlText.length > this.yamlLimit) ? true : null;
  }

  configureEditorOptions() {
    const readOnlyOptions = {
      readOnly: true,
      scrollbar: { vertical: "hidden" },
      overviewRulerBorder: false,
      selectionHighlight: false,
      renderLineHighlight: false,
      glyphMargin: false,
      hideCursorInOverviewRuler: true,
      automaticLayout: false,
      selectOnLineNumbers: false,
      disableLayerHinting: true,
      occurrencesHighlight: false,
      cursorStyle: 'line-thin'
    }
    this.sampleOptions = { ...this.editorOptions, ...readOnlyOptions };
    this.macroOptions = { ...this.sampleOptions, language: 'plaintext' };
  }
}
