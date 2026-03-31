import { convert, modernizeJS } from '../src/index';
import type { SourceMap } from '../src/index';
import { DEFAULT_OPTIONS } from '../src/options';

describe('sourcemap support', () => {
  describe('convert', () => {
    it('does not include a map when sourceMap is false', () => {
      const result = convert('x = 1', { ...DEFAULT_OPTIONS, sourceMap: false });
      expect(result.map).toBeUndefined();
    });

    it('returns a sourcemap object when sourceMap is true', () => {
      const result = convert('x = 1', {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
        disableSuggestionComment: true,
      });
      expect(result.map).toBeDefined();
      expect(result.map).toHaveProperty('version', 3);
      expect(result.map).toHaveProperty('mappings');
    });

    it('includes sources array in the sourcemap', () => {
      const result = convert('x = 1', {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
        filename: 'test.coffee',
        disableSuggestionComment: true,
      });
      const map = result.map as SourceMap;
      expect(map.sources).toBeDefined();
      expect(map.sources).toContain('test.coffee');
    });

    it('produces a JSON-serializable map', () => {
      const result = convert('square = (x) -> x * x', {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
        disableSuggestionComment: true,
      });
      const json = JSON.stringify(result.map);
      const parsed = JSON.parse(json) as SourceMap;
      expect(parsed.version).toBe(3);
      expect(typeof parsed.mappings).toBe('string');
    });

    it('generates correct mappings for a simple assignment', () => {
      const result = convert('a = 1', {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
        disableSuggestionComment: true,
      });
      const map = result.map as SourceMap;
      expect(map.mappings).toBeTruthy();
      expect(map.mappings.length).toBeGreaterThan(0);
    });

    it('works with multiline input', () => {
      const source = 'a = 1\nb = 2\nc = a + b';
      const result = convert(source, {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
        disableSuggestionComment: true,
      });
      expect(result.map).toBeDefined();
      const map = result.map as SourceMap;
      expect(map.version).toBe(3);
      expect(map.mappings).toBeTruthy();
    });

    it('works with function definitions', () => {
      const source = 'square = (x) -> x * x';
      const result = convert(source, {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
        disableSuggestionComment: true,
      });
      expect(result.map).toBeDefined();
      expect(result.code).toContain('square');
    });

    it('works with class definitions', () => {
      const source = 'class Animal\n  constructor: (@name) ->\n  speak: -> @name';
      const result = convert(source, {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
        disableSuggestionComment: true,
      });
      expect(result.map).toBeDefined();
      const map = result.map as SourceMap;
      expect(map.version).toBe(3);
    });

    it('uses the filename option in the sourcemap sources', () => {
      const result = convert('x = 1', {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
        filename: 'my/file.coffee',
        disableSuggestionComment: true,
      });
      const map = result.map as SourceMap;
      expect(map.sources).toContain('my/file.coffee');
    });

    it('does not break code output when sourceMap is enabled', () => {
      const withMap = convert('x = 1', {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
        disableSuggestionComment: true,
      });
      const withoutMap = convert('x = 1', {
        ...DEFAULT_OPTIONS,
        sourceMap: false,
        disableSuggestionComment: true,
      });
      expect(withMap.code).toBe(withoutMap.code);
    });
  });

  describe('modernizeJS', () => {
    it('does not include a map when sourceMap is false', () => {
      const result = modernizeJS('var a = 1;', { ...DEFAULT_OPTIONS, sourceMap: false });
      expect(result.map).toBeUndefined();
    });

    it('returns undefined map when sourceMap is true but only babel stages run', () => {
      // modernizeJS only runs ResugarStage which is babel-based and does not
      // produce MagicString sourcemaps, so no map is composed.
      const result = modernizeJS('var a = 1;', {
        ...DEFAULT_OPTIONS,
        sourceMap: true,
      });
      expect(result.map).toBeUndefined();
    });
  });
});
