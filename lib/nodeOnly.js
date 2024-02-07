let fs = null;
let fg = null;
let stylelint = null;
let chokidar = null;
let fileURLToPath = null;
let dirname = null;

if (typeof window !== "object" && process.env.NODE_ENV === "development") {
    let { default: _fs } = await import("fs");
    let { default: _fg } = await import("fast-glob");
    let { default: _stylelint } = await import("stylelint");
    let { default: _chokidar } = await import("chokidar");
    let { fileURLToPath: _fileURLToPath } = await import("url");
    let { dirname: _dirname } = await import("path");

    fs = _fs;
    fg = _fg;
    stylelint = _stylelint;
    chokidar = _chokidar;
    fileURLToPath = _fileURLToPath;
    dirname = _dirname;
}

export { fs, fg, stylelint, chokidar, fileURLToPath, dirname };
