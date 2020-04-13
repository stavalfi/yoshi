import path from 'path';
import config from 'yoshi-config';

// accepts a file path and return true if it needs to be transpiled
export default (fileName: string): boolean => {
  const allSourcesButExternalModules = (filePath: string) => {
    filePath = path.normalize(filePath);

    return (
      filePath.startsWith(process.cwd()) && !filePath.includes('node_modules')
    );
  };

  // Hacky until `editor-elements`' build is ready
  const isEditorElements = (filePath: string) => {
    return (
      config.name === 'thunderbolt' && filePath.includes('editor-elements')
    );
  };

  const isWixStyleReactSource = (filePath: string) => {
    return filePath.includes('node_modules/wix-style-react/src');
  };

  const externalRegexList = config.externalUnprocessedModules.map(
    m => new RegExp(`node_modules/${m}`),
  );

  const isFlowEditorEntryPoint = (filePath: string) => {
    return filePath.includes('yoshi-flow-editor/.custom-entries');
  };

  // Don't transpile the output of Carmi with Babel/TypeScript
  // https://github.com/wix/yoshi/pull/2227
  if (/\.carmi.(js|ts)$/.test(fileName)) {
    return false;
  }

  return (
    externalRegexList.some(regex => regex.test(fileName)) ||
    allSourcesButExternalModules(fileName) ||
    isWixStyleReactSource(fileName) ||
    isFlowEditorEntryPoint(fileName) ||
    isEditorElements(fileName)
  );
};
