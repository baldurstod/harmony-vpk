export declare class Vpk {
    #private;
    setFiles(files: Array<File>): Promise<VpkError | null>;
    getFile(filename: string): Promise<VpkFileResponse>;
    getFileList(): Promise<Set<string>>;
}

export declare enum VpkError {
    Ok = 0,
    NoFileProvided = 1,
    NoDirectory = 2,
    DuplicateDirectory = 3,
    UnknownFilename = 4,
    Uninitialized = 5,
    FormatError = 6,
    FileNotFound = 7,
    InvalidArchive = 8,
    InternalError = 9
}

export declare type VpkFileResponse = {
    file?: File;
    error?: VpkError;
};

export { }
