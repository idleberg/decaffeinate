import { parse } from '@codemod/parser';
import * as asi from 'automatic-semicolon-insertion';
import MagicString from 'magic-string';
import { StageResult } from '../../index';
import { Options } from '../../options';
import { logger } from '../../utils/debug';
import generateSourceMap from '../../utils/generateSourceMap';

export default class SemicolonsStage {
  static run(content: string, options: Options): StageResult {
    const log = logger(this.name);
    log(content);

    const editor = new MagicString(content, { filename: options.filename });
    const ast = parse(content, {
      tokens: true,
    });

    const { insertions, removals } = asi.process(content, ast);

    insertions.forEach(({ index, content }) => editor.appendLeft(index, content));
    removals.forEach(({ start, end }) => editor.remove(start, end));

    return {
      code: editor.toString(),
      map: generateSourceMap(editor, options),
      suggestions: [],
    };
  }
}
