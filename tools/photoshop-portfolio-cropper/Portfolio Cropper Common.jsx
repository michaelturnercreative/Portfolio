#target photoshop

var PortfolioCropper = (function () {
    var TITLE = "Portfolio Image Cropper";
    var BACKUPS = "_portfolio_crop_backups";
    var folder = File($.fileName).parent;
    var stateFile = new File(folder.fsName + "/.portfolio-cropper-state.txt");
    var handlerFile = new File(folder.fsName + "/Portfolio Cropper Handler.jsx");
    var presets = [
        { name: "Featured cover — 4:3 — 2000 × 1500", rw: 4, rh: 3, w: 2000, h: 1500 },
        { name: "Additional Work — 4:5 — 1600 × 2000", rw: 4, rh: 5, w: 1600, h: 2000 },
        { name: "Square — 1:1 — 1800 × 1800", rw: 1, rh: 1, w: 1800, h: 1800 },
        { name: "Landscape gallery — 3:2 — 2400 × 1600", rw: 3, rh: 2, w: 2400, h: 1600 },
        { name: "Wide gallery — 16:9 — 2560 × 1440", rw: 16, rh: 9, w: 2560, h: 1440 },
        { name: "Portrait gallery — 4:5 — 1600 × 2000", rw: 4, rh: 5, w: 1600, h: 2000 },
        { name: "Vertical/mobile — 9:16 — 1440 × 2560", rw: 9, rh: 16, w: 1440, h: 2560 }
    ];

    function startBatch() {
        if (!handlerFile.exists) {
            alert("Missing companion file:\n" + handlerFile.fsName, TITLE);
            return;
        }
        if (stateFile.exists) {
            var existing = readState();
            if (existing && confirm("A crop batch is already in progress. Resume it?\n\nChoose Cancel to start over.")) {
                installNotifier();
                openNext(existing);
                return;
            }
            clearBatch();
        }
        var root = Folder.selectDialog("Choose the parent folder containing the portfolio JPG images");
        if (!root) return;
        var paths = [];
        collect(root, paths);
        paths.sort(function (a, b) { a = a.toLowerCase(); b = b.toLowerCase(); return a < b ? -1 : (a > b ? 1 : 0); });
        if (!paths.length) {
            alert("No JPG or JPEG files were found inside:\n" + root.fsName, TITLE);
            return;
        }
        var state = { root: root.fsName, files: paths, index: 0, preset: 0, backup: true };
        writeState(state);
        installNotifier();
        openNext(state);
    }

    function handleCommittedCrop() {
        var state = readState();
        if (!state || state.index >= state.files.length || !app.documents.length) return;
        var source = new File(state.files[state.index]);
        var doc = app.activeDocument;
        try {
            if (!doc.saved || doc.fullName.fsName !== source.fsName) return;
        } catch (e) { return; }

        var preset = presets[state.preset];
        var width = doc.width.as("px");
        var height = doc.height.as("px");
        var ratioError = Math.abs((width / height) - (preset.rw / preset.rh)) / (preset.rw / preset.rh);
        if (ratioError > 0.01) {
            alert("The crop does not match " + preset.rw + ":" + preset.rh + ". Undo it, correct the Crop tool ratio, and crop again.", TITLE);
            return;
        }
        if ((width < preset.w || height < preset.h) && !confirm("This crop will be enlarged to " + preset.w + " × " + preset.h + ". Continue?")) return;

        var oldDialogs = app.displayDialogs;
        try {
            if (state.backup) makeBackup(source, new Folder(state.root));
            doc.resizeImage(UnitValue(preset.w, "px"), UnitValue(preset.h, "px"), null, ResampleMethod.BICUBICSHARPER);
            var options = new JPEGSaveOptions();
            options.quality = 10;
            options.embedColorProfile = true;
            options.formatOptions = FormatOptions.STANDARDBASELINE;
            options.matte = MatteType.NONE;
            app.displayDialogs = DialogModes.NO;
            doc.saveAs(source, options, false, Extension.LOWERCASE);
            doc.close(SaveOptions.DONOTSAVECHANGES);
            state.index += 1;
            writeState(state);
        } catch (error) {
            alert("Could not save the cropped image:\n\n" + error.message, TITLE);
            return;
        } finally {
            app.displayDialogs = oldDialogs;
        }
        openNext(state);
    }

    function openNext(state) {
        while (state.index < state.files.length) {
            var source = new File(state.files[state.index]);
            if (!source.exists) { state.index += 1; writeState(state); continue; }
            var doc = findOpen(source);
            try {
                if (!doc) doc = app.open(source);
                app.activeDocument = doc;
            } catch (error) {
                alert("Could not open:\n" + source.fsName, TITLE);
                state.index += 1; writeState(state); continue;
            }
            var choice = askPreset(state, source);
            if (choice.action === "stop") { clearBatch(); return; }
            if (choice.action === "skip") {
                try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e) {}
                state.index += 1; writeState(state); continue;
            }
            state.preset = choice.preset;
            state.backup = choice.backup;
            writeState(state);
            var preset = presets[state.preset];
            try {
                setCropRatio(preset.rw, preset.rh);
            } catch (error) {
                try { app.currentTool = "cropTool"; } catch (e2) {}
                alert("Set the Crop tool Ratio fields to " + preset.rw + ":" + preset.rh + ", position the crop, and press Return/Enter.", TITLE);
            }
            return;
        }
        alert("Batch complete: " + state.files.length + " JPEG image(s) reviewed.", TITLE);
        clearBatch();
    }

    function askPreset(state, source) {
        var win = new Window("dialog", TITLE);
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.margins = 16;
        win.add("statictext", undefined, "Image " + (state.index + 1) + " of " + state.files.length);
        var path = win.add("statictext", undefined, relative(source, new Folder(state.root)), { multiline: true });
        path.preferredSize = [470, 40];
        win.add("statictext", undefined, "Choose the crop preset:");
        var names = [], i;
        for (i = 0; i < presets.length; i += 1) names.push(presets[i].name);
        var dropdown = win.add("dropdownlist", undefined, names);
        dropdown.selection = Math.min(state.preset || 0, presets.length - 1);
        var backup = win.add("checkbox", undefined, "Keep first-copy backup");
        backup.value = state.backup !== false;
        var buttons = win.add("group");
        buttons.alignment = "right";
        var crop = buttons.add("button", undefined, "Start crop", { name: "ok" });
        var skip = buttons.add("button", undefined, "Skip");
        var stop = buttons.add("button", undefined, "Stop batch", { name: "cancel" });
        var result = { action: "stop", preset: state.preset || 0, backup: backup.value };
        crop.onClick = function () { result = { action: "crop", preset: dropdown.selection.index, backup: backup.value }; win.close(1); };
        skip.onClick = function () { result.action = "skip"; result.backup = backup.value; win.close(2); };
        stop.onClick = function () { result.action = "stop"; win.close(0); };
        win.center();
        win.show();
        return result;
    }

    function installNotifier() {
        removeNotifier();
        app.notifiersEnabled = true;
        app.notifiers.add(charIDToTypeID("Crop"), handlerFile);
    }
    function removeNotifier() {
        var i;
        for (i = app.notifiers.length - 1; i >= 0; i -= 1) {
            try { if (app.notifiers[i].eventFile.fsName === handlerFile.fsName) app.notifiers[i].remove(); } catch (e) {}
        }
    }
    function clearBatch() {
        removeNotifier();
        if (stateFile.exists) try { stateFile.remove(); } catch (e) {}
    }
    function collect(dir, out) {
        var entries = dir.getFiles(), i;
        for (i = 0; i < entries.length; i += 1) {
            if (entries[i] instanceof Folder) {
                if (entries[i].name !== BACKUPS && entries[i].name !== "_alternates") collect(entries[i], out);
            } else if (entries[i] instanceof File && /\.jpe?g$/i.test(entries[i].name)) out.push(entries[i].fsName);
        }
    }
    function setCropRatio(rw, rh) {
        app.currentTool = "cropTool";
        var d = new ActionDescriptor(), r = new ActionReference(), o = new ActionDescriptor();
        r.putClass(stringIDToTypeID("cropTool"));
        d.putReference(charIDToTypeID("null"), r);
        o.putString(stringIDToTypeID("cropAspectRatioModeKey"), "pureAspectRatio");
        o.putDouble(stringIDToTypeID("cropAspectRatioWidthKey"), rw);
        o.putDouble(stringIDToTypeID("cropAspectRatioHeightKey"), rh);
        d.putObject(charIDToTypeID("T   "), stringIDToTypeID("cropTool"), o);
        executeAction(charIDToTypeID("setd"), d, DialogModes.NO);
    }
    function findOpen(source) {
        var i;
        for (i = 0; i < app.documents.length; i += 1) {
            try { if (app.documents[i].saved && app.documents[i].fullName.fsName === source.fsName) return app.documents[i]; } catch (e) {}
        }
        return null;
    }
    function writeState(state) {
        stateFile.encoding = "UTF-8";
        if (!stateFile.open("w")) throw new Error("Could not save batch state.");
        stateFile.write(state.toSource());
        stateFile.close();
    }
    function readState() {
        if (!stateFile.exists) return null;
        stateFile.encoding = "UTF-8";
        if (!stateFile.open("r")) return null;
        var text = stateFile.read(); stateFile.close();
        try { return eval(text); } catch (e) { return null; }
    }
    function relative(file, root) {
        var path = file.fsName;
        if (path.indexOf(root.fsName) === 0) path = path.substring(root.fsName.length);
        return path.replace(/^[\\\/]+/, "");
    }
    function makeBackup(source, root) {
        var backupRoot = new Folder(root.fsName + "/" + BACKUPS);
        ensure(backupRoot);
        var parts = relative(source, root).split(/[\\\/]/), destinationFolder = backupRoot, i;
        for (i = 0; i < parts.length - 1; i += 1) { destinationFolder = new Folder(destinationFolder.fsName + "/" + parts[i]); ensure(destinationFolder); }
        var destination = new File(destinationFolder.fsName + "/" + parts[parts.length - 1]);
        if (!destination.exists && !source.copy(destination.fsName)) throw new Error("Could not create backup:\n" + destination.fsName);
    }
    function ensure(dir) { if (!dir.exists && !dir.create()) throw new Error("Could not create folder:\n" + dir.fsName); }

    return { startBatch: startBatch, handleCommittedCrop: handleCommittedCrop };
}());
