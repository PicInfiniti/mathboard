export const STORAGE_KEY = "mathboard-v1";
export const DATABASE_NAME = "mathboard";
export const DATABASE_VERSION = 1;
export const DATABASE_STORE = "projects";
export const DATABASE_PROJECT_KEY = "current-project";

export const SHAPE_TOOLS = ["line", "circle"];
export const DRAWING_TOOLS = ["pen", "highlighter", "eraser"];
export const TOOLS = [...DRAWING_TOOLS, "hand", "zoom"];
export const ZOOM_LEVELS = [.25, .35, .5, .65, .8, .9, 1, 1.5, 2.25, 3.375, 5.0625, 7.59375, 8];
export const MIN_ZOOM = ZOOM_LEVELS[0];
export const MAX_ZOOM = ZOOM_LEVELS.at(-1);
