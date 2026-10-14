# Carbon Frame Bike

Original model: **Robert Schweier** (https://www.roberts-bikes.de/).
Realtime version and animation: **Felix Herbst / prefrontal cortex**, with additional support from **Needle**.

Source: https://github.com/prefrontalcortex/glTF-Sample-Models/tree/carbon-frame-bike/2.0/CarbonFrameBike

License: **Creative Commons Attribution-ShareAlike 4.0 International**
https://creativecommons.org/licenses/by-sa/4.0/

`CarbonFrameBike.glb` and `bike-preview.png` were downloaded from the original repository on 2026-10-14, without changes. The original source documentation is preserved in `SOURCE.md`.

The website controls the original `Holobike_Loop` animation with scrolling and a range input. It changes camera and lighting in the viewer; no model geometry, textures or embedded animation were modified. Attribution and a license link are visible directly beneath the 3D viewer. The model is shown as a design study, not as an actual Racepoint product.

`racepoint-build.blend` is an imported Blender version with a new preview camera, lighting and ground plane. `preview-assembled.png` and `preview-exploded.png` were rendered from it. These adapted asset files are also provided under CC BY-SA 4.0 with the same original authors credited above. `prepare-bike.py` reproduces the import and previews using Blender 5.2.

If a modified version of this asset is shared, its adaptation must retain this license and indicate changes. The asset license is independent of the website source.

Three.js 0.180.0 is stored in `../vendor/`, under its MIT license (`THREE-LICENSE.txt`). Import paths in GLTFLoader, BufferGeometryUtils and RoomEnvironment were changed to relative local paths; no functional library changes were made.
