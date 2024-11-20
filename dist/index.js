import { BinaryReader } from 'harmony-binary-reader';
import { File } from 'node:buffer';

var VpkError;
(function (VpkError) {
    VpkError[VpkError["Ok"] = 0] = "Ok";
    VpkError[VpkError["NoFileProvided"] = 1] = "NoFileProvided";
    VpkError[VpkError["NoDirectory"] = 2] = "NoDirectory";
    VpkError[VpkError["DuplicateDirectory"] = 3] = "DuplicateDirectory";
    VpkError[VpkError["UnknownFilename"] = 4] = "UnknownFilename";
    VpkError[VpkError["Uninitialized"] = 5] = "Uninitialized";
    VpkError[VpkError["FormatError"] = 6] = "FormatError";
})(VpkError || (VpkError = {}));
const ArchiveRegEx = /(.*)_(\d*).vpk/;
class Vpk {
    #files = new Map;
    #directory;
    #archives = [];
    #readers = new Map;
    #initialized = false;
    //#initPromiseResolve?: (value: boolean) => void;
    //#initPromise = new Promise(resolve => this.#initPromiseResolve = resolve);
    async setFiles(files) {
        //this.#files = [...files];
        return await this.#init(files);
    }
    async #init(files) {
        console.info('init');
        this.#directory = undefined;
        this.#archives = [];
        this.#readers.clear();
        this.#files.clear();
        let error;
        switch (files.length) {
            case 0:
                return VpkError.NoFileProvided;
            case 1:
                this.#directory = files[0];
                error = await this.#initDirectory();
                if (error) {
                    return error;
                }
                break;
            default:
                error = await this.#initFiles(files);
                if (error) {
                    return error;
                }
                break;
        }
        this.#initialized = true;
        return null;
    }
    async #initFiles(files) {
        console.info('initFiles');
        for (const file of files) {
            if (file.name.endsWith('_dir.vpk')) {
                if (this.#directory) {
                    return VpkError.DuplicateDirectory;
                }
                else {
                    this.#directory = file;
                }
            }
            else {
                const result = ArchiveRegEx.exec(file.name);
                if (result && result.length == 3) {
                    this.#archives[Number(result[2])] = file;
                }
                else {
                    return VpkError.UnknownFilename;
                }
            }
        }
        await this.#initDirectory();
        return null;
    }
    async getFile(filename) {
        if (!this.#initialized) {
            return { error: VpkError.Uninitialized };
        }
        //await this.#initPromise;
        /*
        const error = await this.#initDirectory();
        if (error) {
            return { error: error };
        }*/
        filename = cleanupFilename(filename);
        const file = new File([], '');
        return { file: file };
    }
    async #initDirectory() {
        if (!this.#directory) {
            return VpkError.NoDirectory;
        }
        const reader = await this.#getReader(this.#directory);
        const magic = reader.getUint32();
        if (magic != 1437209140) {
            return VpkError.FormatError;
        }
        const version = reader.getUint32();
        const treeSize = reader.getUint32();
        if (version == 2) {
            const fileDataSectionSize = reader.getUint32();
            const archiveMD5SectionSize = reader.getUint32();
            const otherMD5SectionSize = reader.getUint32();
            const signatureSectionSize = reader.getUint32();
            console.info(treeSize, fileDataSectionSize, archiveMD5SectionSize, otherMD5SectionSize, signatureSectionSize);
        }
        //console.info(reader.getNullString());
        const error = this.#readTree(reader);
        if (error) {
            return error;
        }
        //this.#initPromiseResolve?.(true);
        return null;
    }
    #readTree(reader) {
        while (true) {
            const extension = reader.getNullString();
            if (extension == '') {
                break;
            }
            while (true) {
                const path = reader.getNullString();
                if (path == '') {
                    break;
                }
                while (true) {
                    const filename = reader.getNullString();
                    if (filename == '') {
                        break;
                    }
                    const fileinfo = this.#readFile(reader);
                    console.info(path + '/' + filename + '.' + extension, fileinfo);
                }
            }
        }
        return null;
    }
    #readFile(reader) {
        const fileinfo = new VpkFileInfo();
        console.info(reader.tell());
        fileinfo.crc = reader.getUint32();
        fileinfo.preloadBytes = reader.getUint16();
        fileinfo.archiveIndex = reader.getUint16();
        fileinfo.entryOffset = reader.getUint32();
        fileinfo.entryLength = reader.getUint32();
        reader.skip(fileinfo.preloadBytes); //TODO: read preload bytes
        reader.skip(2); //TODO: check Terminator = 0xffff;
        return fileinfo;
    }
    async #getReader(file) {
        if (this.#readers.has(file)) {
            return this.#readers.get(file);
        }
        else {
            const ab = await file.arrayBuffer();
            const reader = new BinaryReader(ab);
            this.#readers.set(file, reader);
            return reader;
        }
    }
}
class VpkFileInfo {
    crc = 0;
    preloadBytes = 0;
    archiveIndex = 0;
    entryOffset = 0;
    entryLength = 0;
}
function cleanupFilename(filename) {
    filename = filename.toLowerCase().replaceAll('\\', '/');
    const arr = filename.split('/');
    return arr.filter((path) => path != '').join('/');
}

export { Vpk, VpkError };
