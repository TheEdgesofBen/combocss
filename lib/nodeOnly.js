async function getModules(...modules) {
    let fs = null;
    let fg = null;
    let stylelint = null;
    let chokidar = null;
    let fileURLToPath = null;
    let dirname = null;

    for (let module of modules) {
        if (module == "fs") {
            let { default: _fs } = await import("fs");

            fs = _fs;
        } else if (module == "fg") {
            let { default: _fg } = await import("fast-glob");

            fg = _fg;
        } else if (module == "stylelint") {
            let { default: _stylelint } = await import("stylelint");

            stylelint = _stylelint;
        } else if (module == "chokidar") {
            let { default: _chokidar } = await import("chokidar");

            chokidar = _chokidar;
        } else if (module == "fileURLToPath") {
            let { fileURLToPath: _fileURLToPath } = await import("url");

            fileURLToPath = _fileURLToPath;
        } else if (module == "dirname") {
            let { dirname: _dirname } = await import("path");

            dirname = _dirname;
        }
    }

    return { fs, fg, stylelint, chokidar, fileURLToPath, dirname };
}

export { getModules };
