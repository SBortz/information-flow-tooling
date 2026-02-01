<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorState } from '@codemirror/state';
  import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine } from '@codemirror/view';
  import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
  import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
  import { html } from '@codemirror/lang-html';

  interface Props {
    value: string;
    onChange: (value: string) => void;
    onSave?: () => void;
    readonly?: boolean;
  }

  let { value, onChange, onSave, readonly = false }: Props = $props();

  let container: HTMLDivElement;
  let view: EditorView | null = null;

  // Track if we're currently updating from external
  let isUpdatingFromExternal = false;

  function createEditor() {
    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      highlightActiveLine(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        // Ctrl+S / Cmd+S to save
        {
          key: 'Mod-s',
          run: () => {
            if (onSave) {
              onSave();
              return true;
            }
            return false;
          },
        },
      ]),
      html(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isUpdatingFromExternal) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '13px',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'var(--font-mono)',
        },
        '.cm-content': {
          padding: '0.5rem 0',
        },
        '.cm-gutters': {
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          color: 'var(--text-tertiary)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'var(--bg-secondary)',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
        },
        '.cm-selectionBackground': {
          backgroundColor: 'rgba(100, 150, 255, 0.2) !important',
        },
        '&.cm-focused .cm-selectionBackground': {
          backgroundColor: 'rgba(100, 150, 255, 0.3) !important',
        },
        '.cm-cursor': {
          borderLeftColor: 'var(--text-primary)',
        },
      }),
      EditorState.readOnly.of(readonly),
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    view = new EditorView({
      state,
      parent: container,
    });
  }

  onMount(() => {
    createEditor();
  });

  onDestroy(() => {
    view?.destroy();
  });

  // Update editor content when value changes externally
  $effect(() => {
    if (view && value !== view.state.doc.toString()) {
      isUpdatingFromExternal = true;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
      isUpdatingFromExternal = false;
    }
  });
</script>

<div class="editor-container" bind:this={container}></div>

<style>
  .editor-container {
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: var(--bg-primary);
    border-radius: 0.375rem;
    border: 1px solid var(--border);
  }

  .editor-container :global(.cm-editor) {
    height: 100%;
  }
</style>
