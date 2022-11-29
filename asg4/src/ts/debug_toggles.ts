import { assert } from "./util.js";

export const DEBUG_TOGGLES = ['disable_lighting', 'show_normals', 'show_uvs', 'no_backface_culling', 'no_draw_chunks', 'colorize_mipmaps', 'render_wireframe', 'fast_movement', 'draw_atlas_packing_internal_state', 'force_webgl_1_only', 'force_no_gl_extensions'] as const;
export type DebugToggle = (typeof DEBUG_TOGGLES)[number];

export const debugToggles: Set<DebugToggle> = new Set();

export function setupDebugToggles() {
    debugToggles.clear();
    // get current toggles
    const searchParams = new URLSearchParams(window.location.search);
    for(const toggleName of DEBUG_TOGGLES) {
        if(searchParams.get(toggleName) === '1') debugToggles.add(toggleName);
    }
    // toggles ui
    const togglesContainer = document.getElementById('debug_toggles_container');
    assert(togglesContainer !== null);
    for(const toggleName of DEBUG_TOGGLES) {
        const toggleButton = document.createElement('button');
        toggleButton.addEventListener('click', (ev) => {
            searchParams.delete(toggleName);
            if(!debugToggles.has(toggleName)) searchParams.append(toggleName, '1');
            window.location.search = searchParams.toString();
        });
        toggleButton.classList.add('debug-toggle');
        toggleButton.dataset["enabled"] = debugToggles.has(toggleName) ? "true" : "false";
        toggleButton.textContent = (debugToggles.has(toggleName) ? 'disable' : 'enable') + ` ${toggleName}`;
        togglesContainer.appendChild(toggleButton);
    }
}
