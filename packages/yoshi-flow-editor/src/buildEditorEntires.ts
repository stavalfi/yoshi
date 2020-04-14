import path from 'path';
import writeComponentWrapping from './wrappers/componentWrapping';
import writeEditorAppWrapping from './wrappers/editorAppWrapping';
import writeSettingsWrapping from './wrappers/settingsWrapping';
import writeCommonEditorScriptWrapping from './wrappers/commonEditorScriptWrapping';
import writeWidgetViewerScriptWrapping from './wrappers/widgetViewerScriptWrapping';
import writeCommonViewerScriptWrapping from './wrappers/commonViewerScriptWrapping';
import wixPrivateMockWrapping from './wrappers/wixPrivateMockWrapping';
import { FlowEditorModel } from './model';

const generatedWidgetEntriesPath = path.resolve(__dirname, '../tmp/components');

export const buildEditorPlatformEntries = (model: FlowEditorModel) => {
  const componentEntries = writeComponentWrapping(
    generatedWidgetEntriesPath,
    model,
  );

  const editorAppEntries = writeEditorAppWrapping(
    generatedWidgetEntriesPath,
    model,
  );
  const settingsEntries = writeSettingsWrapping(
    generatedWidgetEntriesPath,
    model,
  );

  const editorScritEntry = writeCommonEditorScriptWrapping(
    generatedWidgetEntriesPath,
    model,
  );

  const wixPrivateMockEntry = wixPrivateMockWrapping();

  return {
    ...wixPrivateMockEntry,
    ...componentEntries,
    ...editorAppEntries,
    ...settingsEntries,
    ...editorScritEntry,
  };
};

export const buildViewerScriptEntry = (model: FlowEditorModel) => {
  return {
    // TODO: Disable it if we don't need to generate viewerScript for each widget.
    ...writeWidgetViewerScriptWrapping(generatedWidgetEntriesPath, model),
    ...writeCommonViewerScriptWrapping(generatedWidgetEntriesPath, model),
  };
};
