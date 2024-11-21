import { Vpk } from '../dist/index.js';
//import { readFile } from 'node:fs/promises';
import { readAsset } from './readasset.js';

const vpk = new Vpk();
//const contents = await readFile('test/fbx/bin/textures.fbx');


const vpkFile = await readAsset('hd_femme_pyro_swimsuit.vpk');
//console.info(file);

const error = await vpk.setFiles([vpkFile]);
if (error) {
	console.info(error);
}

const file = await vpk.getFile('models/player/pyro.mdl');
console.info(file);
