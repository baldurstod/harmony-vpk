import { BinaryReader } from 'harmony-binary-reader';
import { File } from 'node:buffer';

export enum VpkError {
	Ok = 0,
	NoFileProvided,
	NoDirectory,
	DuplicateDirectory,
	UnknownFilename,
	Uninitialized,
	FormatError,
}

export type VpkFileResponse = { file?: File, error?: VpkError };

const ArchiveRegEx = /(.*)_(\d*).vpk/;
export class Vpk {
	#files = new Map<string, VpkFileInfo>;
	#directory?: File;
	#archives: Array<File> = [];
	#readers = new Map<File, BinaryReader>;
	#initialized = false;
	//#initPromiseResolve?: (value: boolean) => void;
	//#initPromise = new Promise(resolve => this.#initPromiseResolve = resolve);

	async setFiles(files: Array<File>): Promise<VpkError | null> {
		//this.#files = [...files];
		return await this.#init(files);
	}

	async #init(files: Array<File>): Promise<VpkError | null> {
		console.info('init');
		this.#directory = undefined;
		this.#archives = [];
		this.#readers.clear();
		this.#files.clear();

		let error: VpkError | null
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

	async #initFiles(files: Array<File>): Promise<VpkError | null> {
		console.info('initFiles');
		for (const file of files) {
			if (file.name.endsWith('_dir.vpk')) {
				if (this.#directory) {
					return VpkError.DuplicateDirectory;
				} else {
					this.#directory = file;
				}
			} else {
				const result = ArchiveRegEx.exec(file.name);
				if (result && result.length == 3) {
					this.#archives[Number(result[2])] = file;
				} else {
					return VpkError.UnknownFilename;
				}
			}
		}
		await this.#initDirectory();
		return null
	}



	async getFile(filename: string): Promise<VpkFileResponse> {
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

	async #initDirectory(): Promise<VpkError | null> {
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

	#readTree(reader: BinaryReader): VpkError | null {
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

	#readFile(reader: BinaryReader): VpkFileInfo {
		const fileinfo = new VpkFileInfo();
		console.info(reader.tell());
		fileinfo.crc = reader.getUint32();
		fileinfo.preloadBytes = reader.getUint16();
		fileinfo.archiveIndex = reader.getUint16();
		fileinfo.entryOffset = reader.getUint32();
		fileinfo.entryLength = reader.getUint32();
		reader.skip(fileinfo.preloadBytes);//TODO: read preload bytes
		reader.skip(2);//TODO: check Terminator = 0xffff;

		return fileinfo;
	}

	async #getReader(file: File): Promise<BinaryReader> {
		if (this.#readers.has(file)) {
			return this.#readers.get(file) as BinaryReader;
		} else {
			const ab = await file.arrayBuffer();
			const reader = new BinaryReader(ab);
			this.#readers.set(file, reader);
			return reader;
		}
	}
}

class VpkFileInfo {
	crc: number = 0;
	preloadBytes: number = 0;
	archiveIndex: number = 0;
	entryOffset: number = 0;
	entryLength: number = 0;
}

function cleanupFilename(filename: string): string {
	filename = filename.toLowerCase().replaceAll('\\', '/');
	const arr = filename.split('/');
	return arr.filter((path) => path != '').join('/');
}
