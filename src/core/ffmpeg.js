import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export class FFmpegCore {
    constructor() {
        this.ffmpeg = null;
    }

    async init(onLog, onProgress) {
        this.ffmpeg = new FFmpeg();
        // Read directly from the static public/ffmpeg/ folder mapping to base
        const baseURL = './ffmpeg';
        
        this.ffmpeg.on('log', ({ message }) => {
            console.log(message);
            if (onLog) onLog(message);
        });
        
        this.ffmpeg.on('progress', ({ progress, time }) => {
            const percent = Math.round(progress * 100);
            if (onProgress) onProgress(percent);
        });

        await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
    }



    async convertVideo({ file, startTime, duration, fps, scaleWidth, format, onStepChange }) {
        const inputDir = '/workerFS';
        const inputName = file.name;
        const inputPath = `${inputDir}/${inputName}`;
        const outputName = `output.${format}`;
        const paletteName = 'palette.png';

        if (onStepChange) onStepChange('WorkerFSをマウント中...');
        
        await this.ffmpeg.createDir(inputDir);
        await this.ffmpeg.mount('WORKERFS', { files: [file] }, inputDir);

        try {
            // Build Video Filter (-vf)
            const filters = [];
            if (fps !== '-1') {
                filters.push(`fps=${fps}`);
            }
            if (scaleWidth !== '-1') {
                // scale to scaleWidth, maintaining aspect ratio.
                // -2 ensures height is an even number, which is safe for many codecs.
                filters.push(`scale=${scaleWidth}:-2:flags=lanczos`);
            }

            const vfString = filters.length > 0 ? filters.join(',') : '';

            // Fast Seek Args: -ss before -i is crucial for fast seeking
            const commonInputArgs = [
                '-ss', String(startTime),
                '-t', String(duration),
                '-i', inputPath
            ];

            if (format === 'gif') {
                if (onStepChange) onStepChange('Step 1/2: 色情報の解析中 (palettegen)...');
                
                // Palettegen filter
                const pGenFilter = vfString ? `${vfString},palettegen` : 'palettegen';
                
                await this.ffmpeg.exec([
                    ...commonInputArgs,
                    '-vf', pGenFilter,
                    '-y', paletteName
                ]);

                if (onStepChange) onStepChange('Step 2/2: GIFを生成中 (paletteuse)...');
                
                // Paletteuse filter requires complex format if scaling/fps is active
                const pUseFilter = vfString ? `[0:v] ${vfString} [x]; [x][1:v] paletteuse` : '[0:v][1:v] paletteuse';

                await this.ffmpeg.exec([
                    ...commonInputArgs,
                    '-i', paletteName,
                    '-filter_complex', pUseFilter,
                    '-y', outputName
                ]);

                await this.ffmpeg.deleteFile(paletteName);

            } else if (format === 'webp') {
                if (onStepChange) onStepChange('WebP (アニメーション) を生成中...');

                const args = [...commonInputArgs];
                if (vfString) {
                    args.push('-vf', vfString);
                }
                args.push(
                    '-vcodec', 'libwebp',
                    '-lossless', '0',
                    '-qscale', '75',
                    '-loop', '0',
                    '-an',
                    '-y', outputName
                );

                await this.ffmpeg.exec(args);
            }

            if (onStepChange) onStepChange('出力ファイルを読み込み中...');
            const data = await this.ffmpeg.readFile(outputName);
            await this.ffmpeg.deleteFile(outputName);

            const mimeType = format === 'gif' ? 'image/gif' : 'image/webp';
            return new Blob([data.buffer], { type: mimeType });

        } finally {
            if (onStepChange) onStepChange('マウントを解除中...');
            await this.ffmpeg.unmount(inputDir);
            await this.ffmpeg.deleteDir(inputDir);
        }
    }
}
