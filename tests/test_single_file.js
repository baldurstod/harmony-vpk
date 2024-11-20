import { Vpk } from '../dist/index.js';
//import { readFile } from 'node:fs/promises';
import { readAsset } from './readasset.js';

const vpk = new Vpk();
//const contents = await readFile('test/fbx/bin/textures.fbx');


const file = await readAsset('hd_femme_pyro_swimsuit.vpk');
//console.info(file);

const error = await vpk.setFiles([file]);
console.info(error);

vpk.getFile('model/player/pyro.mdl');
