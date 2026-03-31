import MagicString from 'magic-string';
import type { SourceMap } from '../index';
import type { Options } from '../options';

/**
 * If sourceMap generation is enabled, produce a hi-res V3 sourcemap from the
 * given MagicString editor. Returns `undefined` when sourceMap is off.
 */
export default function generateSourceMap(editor: MagicString, options: Options): SourceMap | undefined {
  if (!options.sourceMap) {
    return undefined;
  }
  return editor.generateMap({
    source: options.filename,
    includeContent: true,
    hires: true,
  });
}
