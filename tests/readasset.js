import { File } from 'node:buffer';
import { readFile } from 'node:fs/promises';

export async function readAsset(name) {
	const buffer = await readFile('tests/assets/' + name);

	const file = new File([buffer], name);
	return file;
}
