import path from 'path';
import globby from 'globby';
import { getProjectArtifactId } from 'yoshi-helpers/build/utils';
import { isTypescriptProject } from 'yoshi-helpers/build/queries';
import resolve from 'resolve';
import fs from 'fs-extra';
import { Config } from 'yoshi-config/build/config';
import {
  WIDGET_FILENAME,
  VIEWER_CONTROLLER_FILENAME,
  EDITOR_CONTROLLER_FILENAME,
  SETTINGS_CONTROLLER_FILENAME,
  APPLICATION_CONFIG_FILENAME,
  COMPONENT_CONFIG_FILENAME,
  VIEWER_APP_FILENAME,
  EDITOR_APP_FILENAME,
  WIDGET_COMPONENT_TYPE,
  PAGE_COMPONENT_TYPE,
} from './constants';

export interface FlowEditorModel {
  appName: string;
  appDefId: string | null;
  artifactId: string;
  viewerAppFileName: string;
  editorEntryFileName: string | null;
  components: Array<ComponentModel>;
}

export type ComponentType =
  | typeof WIDGET_COMPONENT_TYPE
  | typeof PAGE_COMPONENT_TYPE;

const DEFAULT_COMPONENT_TYPE: ComponentType = 'widget';

export interface ComponentModel {
  name: string;
  type: ComponentType;
  widgetFileName: string | null;
  viewerControllerFileName: string;
  editorControllerFileName: string | null;
  settingsFileName: string | null;
  id: string | null;
}

export interface AppConfig {
  appDefinitionId: string;
}
export interface ComponentConfig {
  id: string;
  type?: ComponentType;
}

const extensions = ['.tsx', '.ts', '.js', '.json'];
function resolveFrom(dir: string, fileName: string): string | null {
  try {
    return resolve.sync(path.join(dir, fileName), {
      extensions,
    });
  } catch (error) {
    return null;
  }
}

function formatPathsForLog(paths: Array<string>, ext: string) {
  return paths.map(path => (ext ? `${path}.${ext}` : path)).join(' or ');
}

function resolveFileNamesFromDirectory(dir: string, fileNames: Array<string>) {
  return (
    fileNames.map(fileName => resolveFrom(dir, fileName)).find(Boolean) || null
  );
}

function getLocalConfig<C extends AppConfig | ComponentConfig>(
  path: string,
): C {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

export async function generateFlowEditorModel(
  config: Config,
): Promise<FlowEditorModel> {
  const artifactId = getProjectArtifactId();
  if (!artifactId) {
    throw new Error(`artifact id not provided.
    Please insert <artifactId>yourArtifactId</artifactId> in your "pom.xml"`);
  }
  const fileExtension = isTypescriptProject() ? 'ts' : 'js';

  const rootPath = process.cwd();
  const srcPath = path.join(rootPath, 'src');
  const resolveFromRoot = resolveFileNamesFromDirectory.bind(null, rootPath);
  const resolveFromSrc = resolveFileNamesFromDirectory.bind(null, srcPath);
  const viewerAppFileName = resolveFromSrc(VIEWER_APP_FILENAME);
  if (!viewerAppFileName) {
    throw new Error(
      `Please create "${formatPathsForLog(
        VIEWER_APP_FILENAME,
        fileExtension,
      )}" file in "${path.resolve('./src')}" directory`,
    );
  }

  const editorEntryFileName = resolveFromSrc(EDITOR_APP_FILENAME);
  const appConfigFileName = resolveFromRoot(APPLICATION_CONFIG_FILENAME);
  const appConfig =
    appConfigFileName && getLocalConfig<AppConfig>(appConfigFileName);

  if (!appConfig || !appConfig.appDefinitionId) {
    console.warn(`Seems like your app doesn't contain ${formatPathsForLog(
      APPLICATION_CONFIG_FILENAME,
      'json',
    )}.json with appDefinitionId specified. You should register it in dev-center and add appDefinitionId field for ${rootPath}.
For more info, visit http://tiny.cc/dev-center-registration`);
  }

  const componentsDirectories = await globby('./src/components/*', {
    onlyDirectories: true,
    absolute: true,
  });

  const componentModels: Array<ComponentModel> = componentsDirectories.reduce(
    (processedModels, componentDirectory) => {
      const componentName = path.basename(componentDirectory);
      const resolveFromComponents = resolveFileNamesFromDirectory.bind(
        null,
        componentDirectory,
      );

      const configFileName = resolveFromComponents(COMPONENT_CONFIG_FILENAME);
      const componentConfig =
        configFileName && getLocalConfig<ComponentConfig>(configFileName);
      const componentPathRelativeToRoot = path.relative(
        rootPath,
        componentDirectory,
      );

      /* If no config specified, we are going to completely ignore this component and
      warn users to add it. */
      if (!componentConfig) {
        console.warn(`Seems like you didn't add "${formatPathsForLog(
          COMPONENT_CONFIG_FILENAME,
          'json',
        )}" to some of you components: ${componentPathRelativeToRoot}.
For more info, visit http://tiny.cc/dev-center-registration`);
        // Ignore components w/o config file.
        return processedModels;
      }
      if (!componentConfig.type) {
        componentConfig.type = DEFAULT_COMPONENT_TYPE;
      }
      if (!componentConfig.id) {
        console.warn(`Seems like you added new component and didn't specify "id" for it.
You should register it in dev-center and paste id to "${formatPathsForLog(
          COMPONENT_CONFIG_FILENAME,
          'json',
        )}" in the widget directory: ${componentPathRelativeToRoot}.
For more info, visit http://tiny.cc/dev-center-registration`);
      }

      const viewerControllerFileName = resolveFromComponents(
        VIEWER_CONTROLLER_FILENAME,
      );
      if (!viewerControllerFileName) {
        throw new Error(`Missing controller file for the component in "${componentPathRelativeToRoot}".
        Please create "controller.${fileExtension}" file in "${componentPathRelativeToRoot}" directory`);
      }

      const editorControllerFileName = resolveFromComponents(
        EDITOR_CONTROLLER_FILENAME,
      );
      const widgetFileName = resolveFromComponents(WIDGET_FILENAME);
      if (!widgetFileName && !editorControllerFileName) {
        throw new Error(`Missing widget or page file for the component in "${componentPathRelativeToRoot}".
        Please create either index.${fileExtension} or Widget.${fileExtension} file in "${componentPathRelativeToRoot}" directory`);
      }

      const settingsFileName = resolveFromComponents(
        SETTINGS_CONTROLLER_FILENAME,
      );

      const componentModel: ComponentModel = {
        name: componentName,
        widgetFileName,
        type: componentConfig.type,
        viewerControllerFileName,
        editorControllerFileName,
        settingsFileName,
        id: componentConfig.id,
      };
      return processedModels.concat(componentModel);
    },
    [] as Array<ComponentModel>,
  );

  return {
    appName: config.name,
    appDefId: appConfig ? appConfig.appDefinitionId : null,
    editorEntryFileName,
    artifactId,
    viewerAppFileName,
    components: componentModels,
  };
}
