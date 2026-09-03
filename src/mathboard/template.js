export function mathboardTemplate(baseUrl) {
  const courseUrl = "https://picinfiniti.net/pre-calculus/";

  return `
  <div class="mathboard-shell">
    <header class="mathboard-header">
      <a class="mathboard-brand" href="${baseUrl}" aria-label="MathBoard home">
        <span class="mathboard-brand__mark" aria-hidden="true">ƒ</span>
        <span><strong>MathBoard</strong><small>Visual workspace</small></span>
      </a>
      <div class="mathboard-header__title">
        <span>Sketch · test · explain</span>
      </div>
      <a class="mathboard-header__home" href="${courseUrl}">Precalculus course <span aria-hidden="true">↗</span></a>
    </header>

    <main class="mathboard-main">
      <aside class="mathboard-toolbar" id="mathboard-toolbar" aria-label="MathBoard tools">
        <div class="mathboard-panel-tabs" aria-label="Control panel mode">
          <button type="button" data-panel-tab="draw" aria-pressed="true">
            <span class="mathboard-panel-tab__icon" aria-hidden="true">✎</span>
            <span><strong>Draw</strong><small>Tools & ink</small></span>
          </button>
          <button type="button" data-panel-tab="canvas" aria-pressed="false">
            <span class="mathboard-panel-tab__icon" aria-hidden="true">⌗</span>
            <span><strong>Canvas</strong><small>Grid & axes</small></span>
          </button>
        </div>
        <div class="mathboard-save-status" id="mathboard-save-status" data-state="loading" role="status" aria-live="polite">
          <span aria-hidden="true"></span>
          <strong>Loading saved project…</strong>
        </div>

        <fieldset class="mathboard-tool-group mathboard-tool-group--drawing" data-panel-section="draw">
          <legend>Drawing tool</legend>
          <div class="mathboard-tool-grid">
            <button class="mathboard-tool" type="button" data-tool="pen" aria-pressed="true"><span aria-hidden="true">✎</span><span>Pen</span></button>
            <button class="mathboard-tool" type="button" data-tool="highlighter" aria-pressed="false"><span aria-hidden="true">▰</span><span>Highlight</span></button>
            <button class="mathboard-tool" type="button" data-tool="eraser" aria-pressed="false"><span aria-hidden="true">◇</span><span>Eraser</span></button>
            <button class="mathboard-tool" type="button" data-tool="hand" aria-pressed="false"><span aria-hidden="true">✋</span><span>Move</span></button>
            <button class="mathboard-tool" type="button" data-tool="zoom" aria-pressed="false"><span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="5" /><path d="m14 14 5 5M7.5 10h5" /></svg></span><span>Zoom</span></button>
          </div>
        </fieldset>

        <fieldset class="mathboard-tool-group mathboard-tool-group--colors" data-panel-section="draw">
          <legend>Ink color</legend>
          <div class="mathboard-colors">
            <button class="mathboard-color" style="--swatch: #071d33" type="button" data-color="#071d33" aria-label="Navy ink" aria-pressed="true"></button>
            <button class="mathboard-color" style="--swatch: #ff6b48" type="button" data-color="#ff6b48" aria-label="Coral ink" aria-pressed="false"></button>
            <button class="mathboard-color" style="--swatch: #d99f18" type="button" data-color="#d99f18" aria-label="Gold ink" aria-pressed="false"></button>
            <button class="mathboard-color" style="--swatch: #168ca8" type="button" data-color="#168ca8" aria-label="Blue ink" aria-pressed="false"></button>
            <button class="mathboard-color" style="--swatch: #765fc0" type="button" data-color="#765fc0" aria-label="Violet ink" aria-pressed="false"></button>
          </div>
        </fieldset>

        <div class="mathboard-tool-group mathboard-tool-group--stroke" data-panel-section="draw">
          <label id="mathboard-size-label" for="mathboard-size">Pen size</label>
          <div class="mathboard-size-row">
            <input class="mathboard-size" id="mathboard-size" type="range" min="1" max="30" value="5" />
            <output for="mathboard-size" id="mathboard-size-output">5</output>
          </div>
          <button class="mathboard-smoothing" id="mathboard-smoothing" type="button" aria-pressed="true">
            <span><strong>Smooth curves</strong><small>Round out pen movement</small></span>
            <span class="mathboard-smoothing__switch" aria-hidden="true"><i></i></span>
          </button>
        </div>

        <fieldset class="mathboard-tool-group mathboard-tool-group--background" data-panel-section="canvas">
          <legend>Background</legend>
          <div class="mathboard-grid-options">
            <button class="mathboard-grid-button" type="button" data-grid="blank" aria-pressed="false">Blank</button>
            <button class="mathboard-grid-button" type="button" data-grid="square" aria-pressed="true">Grid</button>
            <button class="mathboard-grid-button" type="button" data-grid="coordinate" aria-pressed="false">Axes</button>
          </div>
          <button class="mathboard-axis-numbers" id="mathboard-axis-numbers" type="button" aria-pressed="true" disabled>
            <span><strong>Axis numbers</strong><small>Label coordinate values</small></span>
            <span class="mathboard-axis-numbers__switch" aria-hidden="true"><i></i></span>
          </button>
          <label class="mathboard-axis-size" for="mathboard-axis-size">
            <span>Number size</span>
            <span class="mathboard-axis-size__control">
              <input id="mathboard-axis-size" type="range" min="12" max="30" value="13" disabled />
              <output id="mathboard-axis-size-output" for="mathboard-axis-size">13</output>
            </span>
          </label>
        </fieldset>

        <div class="mathboard-history" aria-label="Board actions">
          <p class="mathboard-history__title">Board actions</p>
          <button class="mathboard-action" id="mathboard-undo" type="button" disabled>Undo</button>
          <button class="mathboard-action" id="mathboard-redo" type="button" disabled>Redo</button>
          <button class="mathboard-action" id="mathboard-history-toggle" type="button" aria-expanded="false" aria-controls="mathboard-history-scrubber" disabled>History</button>
          <div class="mathboard-file-actions" aria-label="Save and project actions">
            <button class="mathboard-icon-action mathboard-action--save" id="mathboard-save" type="button" aria-label="Download PNG" data-tooltip="Save this canvas as a PNG image">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10M8.5 9.5 12 13l3.5-3.5M5 16v4h14v-4" /></svg>
              <span class="mathboard-icon-action__label">Download PNG</span>
            </button>
            <button class="mathboard-icon-action mathboard-action--pdf" id="mathboard-pdf" type="button" aria-label="Download PDF" data-tooltip="Save this canvas as a printable PDF">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h4" /></svg>
              <span class="mathboard-icon-action__label">Download PDF</span>
            </button>
            <details class="mathboard-project-menu" id="mathboard-project-menu">
              <summary class="mathboard-icon-action" aria-label="Project options" data-tooltip="Create, import, export, or share a project">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3zM3 7V5h6l2 2" /></svg>
                <span class="mathboard-icon-action__label">Project</span>
              </summary>
              <div aria-label="Project actions">
                <button id="mathboard-project-new" type="button"><span aria-hidden="true">＋</span>New clean project</button>
                <button id="mathboard-project-export" type="button"><span aria-hidden="true">⇩</span>Export project</button>
                <button id="mathboard-project-import" type="button"><span aria-hidden="true">⇧</span>Import project</button>
                <button id="mathboard-project-share" type="button"><span aria-hidden="true">↗</span>Share project</button>
                <input id="mathboard-project-file" type="file" accept=".mathboard,.json,application/json" hidden />
              </div>
            </details>
            <button class="mathboard-icon-action mathboard-action--clear" id="mathboard-clear" type="button" aria-label="Clear board" data-tooltip="Remove every stroke from this canvas">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
              <span class="mathboard-icon-action__label">Clear board</span>
            </button>
          </div>
        </div>

        <details class="mathboard-help">
          <summary>Quick help</summary>
          <p>Use Move to pan and Zoom to frame a precise area. Use − or + to change scale, or ↺ to reset. Drag canvas tabs to reorder them; use <strong>Alt + ←/→</strong> from the keyboard. Pen pressure and stylus eraser tips are supported. Press <strong>Ctrl/⌘ + Z</strong> to undo.</p>
        </details>
      </aside>

      <section class="mathboard-board" id="mathboard-board" aria-label="Drawing area">
        <div class="mathboard-canvas-tabs" aria-label="Canvas tabs">
          <div class="mathboard-canvas-tabs__list" id="mathboard-canvas-tabs" role="tablist" aria-label="Open canvases"></div>
          <div class="mathboard-canvas-tabs__actions">
            <button id="mathboard-canvas-new" type="button" aria-label="Create a new canvas" title="New canvas"><span aria-hidden="true">+</span><span>New</span></button>
            <button id="mathboard-canvas-duplicate" type="button" aria-label="Duplicate the current canvas" title="Duplicate canvas"><span aria-hidden="true">⧉</span><span>Duplicate</span></button>
            <button id="mathboard-canvas-rename" type="button" aria-label="Rename the current canvas" title="Rename canvas"><span aria-hidden="true">✎</span><span>Rename</span></button>
            <button id="mathboard-canvas-delete" type="button" aria-label="Delete the current canvas" title="Delete canvas"><span aria-hidden="true">×</span><span>Delete</span></button>
          </div>
        </div>
        <dialog class="mathboard-rename-dialog" id="mathboard-rename-dialog">
          <form id="mathboard-rename-form">
            <p>Canvas name</p>
            <label for="mathboard-canvas-name">Rename the current canvas</label>
            <input id="mathboard-canvas-name" name="canvasName" type="text" maxlength="32" autocomplete="off" required />
            <div>
              <button id="mathboard-rename-cancel" type="button">Cancel</button>
              <button type="submit">Save name</button>
            </div>
          </form>
        </dialog>
        <div class="mathboard-axis-labels" id="mathboard-axis-labels" aria-hidden="true"></div>
        <div class="mathboard-zoom-selection" id="mathboard-zoom-selection" aria-hidden="true"></div>
        <canvas
          class="mathboard-canvas"
          id="mathboard-canvas"
          tabindex="0"
          aria-label="MathBoard canvas. Draw with a mouse, finger, or stylus. Use the toolbar to change tools."
        ></canvas>
        <span class="mathboard-eraser-preview" id="mathboard-eraser-preview" aria-hidden="true"></span>
        <p class="mathboard-board__hint" aria-hidden="true">Draw anywhere to begin</p>
        <p class="mathboard-status" id="mathboard-status" role="status" aria-live="polite"></p>
        <div class="mathboard-zoom-controls" aria-label="Zoom controls">
          <button id="mathboard-zoom-out" type="button" aria-label="Zoom out" title="Zoom out">−</button>
          <button id="mathboard-zoom-reset" type="button" aria-label="Reset zoom and center canvas" title="Reset view"><span aria-hidden="true">↺</span></button>
          <button id="mathboard-zoom-in" type="button" aria-label="Zoom in" title="Zoom in">+</button>
        </div>
        <section class="mathboard-history-scrubber" id="mathboard-history-scrubber" aria-label="Stroke history" aria-hidden="true">
          <div class="mathboard-history-scrubber__header">
            <div><strong>Stroke history</strong><span>Travel without clearing the board</span></div>
            <button id="mathboard-history-close" type="button" aria-label="Close stroke history" title="Close history">×</button>
          </div>
          <div class="mathboard-history-scrubber__controls">
            <button id="mathboard-history-start" type="button" aria-label="Jump to the beginning" title="Beginning" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 6l-7 6 7 6" /></svg>
            </button>
            <label for="mathboard-history-range">
              <input id="mathboard-history-range" type="range" min="0" max="0" value="0" aria-label="Visible stroke" disabled />
            </label>
            <button id="mathboard-history-end" type="button" aria-label="Jump to the latest stroke" title="Latest" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 6l7 6-7 6" /></svg>
            </button>
          </div>
          <output id="mathboard-history-output" for="mathboard-history-range">No strokes yet</output>
        </section>
        <div class="mathboard-fullscreen-actions" aria-label="Full-screen board actions">
          <button id="mathboard-fullscreen-undo" type="button" aria-label="Undo" title="Undo" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7-5 5 5 5M5 12h8a6 6 0 0 1 6 6" /></svg>
          </button>
          <button id="mathboard-fullscreen-redo" type="button" aria-label="Redo" title="Redo" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 7 5 5-5 5M19 12h-8a6 6 0 0 0-6 6" /></svg>
          </button>
          <button id="mathboard-fullscreen-history" type="button" aria-label="Open stroke history" aria-expanded="false" aria-controls="mathboard-history-scrubber" title="Stroke history" disabled>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7M4 4v4.7h4.7M12 7v5l3 2" /></svg>
          </button>
          <button class="mathboard-fullscreen-clear" id="mathboard-fullscreen-clear" type="button" aria-label="Clear board" title="Clear board">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
          </button>
        </div>
        <button class="mathboard-panel-toggle" id="mathboard-panel-toggle" type="button" aria-expanded="true" aria-controls="mathboard-toolbar mathboard-canvas-tabs" aria-label="Hide MathBoard controls" title="Hide controls">
          <span aria-hidden="true">✎</span>
        </button>
        <button class="mathboard-fullscreen-toggle" id="mathboard-fullscreen" type="button" aria-pressed="false" aria-label="Open full-screen MathBoard" title="Full screen">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path class="mathboard-fullscreen-toggle__expand" d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
            <path class="mathboard-fullscreen-toggle__collapse" d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />
          </svg>
        </button>
      </section>
    </main>
  </div>
`;
}
