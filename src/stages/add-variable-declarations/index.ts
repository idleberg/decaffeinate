import { addVariableDeclarations } from 'add-variable-declarations';
import MagicString from 'magic-string';
import { StageResult } from '../../index';
import { Options } from '../../options';
import { logger } from '../../utils/debug';
import generateSourceMap from '../../utils/generateSourceMap';

export default class AddVariableDeclarationsStage {
  static run(content: string, options: Options): StageResult {
    const log = logger(this.name);
    log(content);

    const editor = new MagicString(content, { filename: options.filename });
    addVariableDeclarations(content, editor);

    return {
      code: editor.toString(),
      map: generateSourceMap(editor, options),
      suggestions: [],
    };
  }
}
