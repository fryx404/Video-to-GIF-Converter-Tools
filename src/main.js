import { FFmpegCore } from './core/ffmpeg.js';
import { TimelineController } from './ui/timeline.js';
import { elements, showError, hideError } from './ui/dom.js';
import { setupWarnings, setupAppEvents } from './ui/events.js';

// Constants
const MAX_FILE_SIZE_MB = 2000;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Application State
let currentFile = null;
let resultUrl = null;
let isConverting = false;
const ffmpegCore = new FFmpegCore();

const timeline = new TimelineController(elements, {
    onSeek: (time, isPause) => {
        if (isPause) elements.videoPreview.pause();
        elements.videoPreview.currentTime = time;
    },
    getCurrentTime: () => elements.videoPreview.currentTime,
    onTogglePlay: () => {
        if (elements.videoPreview.paused) {
            elements.videoPreview.play();
        } else {
            elements.videoPreview.pause();
        }
    }
});

// Initialize FFmpeg
const initApp = async () => {
    try {
        await ffmpegCore.init(
            null, // onLog 
            (percent) => {
                // FFmpeg processing progress
                elements.progressFill.style.width = `${percent}%`;
            }
        );
        elements.initOverlay.classList.add('hidden');
    } catch (error) {
        elements.initOverlay.classList.add('hidden');
        showError('FFmpegの初期化に失敗しました。ローカルホスト上で実行しているか、COOP/COEPヘッダーが設定されていることを確認してください。');
        console.error(error);
        elements.progressText.textContent = '初期化に失敗しました。';
    }
};

// Video Handling
const handleVideoFile = async (file) => {
    if (isConverting) {
        showError('変換中は動画を差し替えできません。完了までお待ちください。');
        return;
    }
    hideError();
    if (!file.type.startsWith('video/')) {
        showError('有効な動画ファイル（MP4/MOV等）を選択してください。');
        return;
    }
    
    if (file.size > MAX_FILE_SIZE_BYTES) {
        showError(`ファイルサイズが ${MAX_FILE_SIZE_MB}MB の制限を超えています。選択されたファイル: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        return;
    }

    if (!ffmpegCore.isReady) {
        showError('FFmpegを初期化中です。少々お待ちください。');
        return;
    }

    // Release the previous video before loading a new one
    if (elements.videoPreview.src) {
        URL.revokeObjectURL(elements.videoPreview.src);
    }
    currentFile = file;

    // Show preparing state
    elements.dropZone.classList.add('hidden');
    elements.videoPreviewContainer.classList.remove('hidden');
    elements.btnConvert.disabled = true;
    elements.outputContainer.classList.add('hidden');
    elements.timelineContainer.classList.add('hidden');
    
    elements.videoInfo.classList.remove('hidden');
    elements.videoInfo.textContent = 'メタデータを解析中...';

    // Step 1: Canvas extraction model doesn't need FFmpeg probe for full file
    // Fallback default FPS for the timeline initial state
    const sourceFps = 30; 

    const url = URL.createObjectURL(file);
    elements.videoPreview.src = url;
    
    elements.videoPreview.onloadedmetadata = () => {
        const duration = elements.videoPreview.duration;
        timeline.init(duration, sourceFps);

        elements.videoInfo.textContent = `長さ: ${duration.toFixed(2)}秒 | フレーム抽出モード`;

        elements.timelineContainer.classList.remove('hidden');
        elements.btnConvert.disabled = false;
    };

    // Codecs Chromium cannot decode (HEVC, ProRes, etc.) never fire loadedmetadata
    elements.videoPreview.onerror = () => {
        if (!currentFile) return;
        clearVideo();
        showError('この動画はプレビューできない形式です（HEVC/ProRes等）。H.264のMP4に変換してから読み込んでください。');
    };
    
    elements.videoPreview.onplay = () => elements.btnPlayPause.classList.add('is-playing');
    elements.videoPreview.onpause = () => elements.btnPlayPause.classList.remove('is-playing');

    elements.videoPreview.ontimeupdate = () => {
        timeline.updatePlayhead(elements.videoPreview.currentTime);
        
        // Loop Playback
        if (timeline.isLooping && !elements.videoPreview.paused) {
            const settings = timeline.getSettings();
            if (elements.videoPreview.currentTime >= settings.timeEnd) {
                elements.videoPreview.currentTime = settings.timeStart;
                if (elements.videoPreview.paused) {
                    elements.videoPreview.play();
                }
            }
        }
    };
};

const releaseResult = () => {
    if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
        resultUrl = null;
    }
    elements.gifPreview.removeAttribute('src');
};

const clearVideo = () => {
    if (isConverting) return;
    if (elements.videoPreview.src) {
        URL.revokeObjectURL(elements.videoPreview.src);
    }
    currentFile = null;
    elements.videoPreview.removeAttribute('src');
    elements.videoPreview.load();
    elements.btnPlayPause.classList.remove('is-playing');
    releaseResult();
    
    elements.dropZone.classList.remove('hidden');
    elements.videoPreviewContainer.classList.add('hidden');
    elements.videoInfo.classList.add('hidden');
    elements.videoInfo.textContent = '';
    elements.btnConvert.disabled = true;
    elements.fileInput.value = '';
    elements.outputContainer.classList.add('hidden');
    elements.timelineContainer.classList.add('hidden');
    
    timeline.reset();
};

const performConversion = async () => {
    if (!ffmpegCore.isReady || !currentFile || isConverting) return;

    isConverting = true;
    elements.videoPreview.pause();
    hideError();
    elements.btnConvert.disabled = true;
    elements.btnConvertLabel.textContent = '処理中...';
    elements.progressContainer.classList.remove('hidden');
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '準備中...';
    elements.outputContainer.classList.add('hidden');
    releaseResult();

    try {
        const timelineSettings = timeline.getSettings();
        
        const scaleVal = document.getElementById('scale-select').value;
        const formatVal = document.getElementById('format-select').value;
        const fpsVal = document.getElementById('fps-select').value;

        // 1. Convert video using FFmpeg Virtual FS directly with WorkerFS mount
        const resultBlob = await ffmpegCore.convertVideo({
            file: currentFile,
            startTime: timelineSettings.timeStart,
            duration: timelineSettings.timeEnd - timelineSettings.timeStart,
            fps: fpsVal,
            scaleWidth: scaleVal,
            format: formatVal,
            onStepChange: (text) => {
                elements.progressText.textContent = text;
            }
        });

        // 2. Cleanup and finish
        elements.progressText.textContent = '最終処理完了！';
        resultUrl = URL.createObjectURL(resultBlob);
        const baseName = currentFile.name.replace(/\.[^.]+$/, '') || 'output';

        // Update UI
        elements.gifPreview.src = resultUrl;
        elements.btnDownload.href = resultUrl;
        elements.btnDownload.download = `${baseName}.${formatVal}`;
        elements.btnDownloadLabel.textContent = `${formatVal.toUpperCase()}をダウンロード`;
        
        elements.outputContainer.classList.remove('hidden');
        setTimeout(() => {
            elements.outputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);

    } catch (error) {
        showError('変換中にエラーが発生しました。解像度やFPSを下げるか、範囲を短くして再度お試しください。');
        console.error('Conversion error:', error);
        // A crashed worker (e.g. out of memory) cannot be reused, so reload FFmpeg
        elements.progressText.textContent = 'FFmpegを再読み込み中...';
        try {
            await ffmpegCore.restart();
        } catch (restartError) {
            console.error('FFmpeg restart failed:', restartError);
        }
    } finally {
        isConverting = false;
        elements.btnConvert.disabled = false;
        elements.btnConvertLabel.textContent = '変換を実行';
        elements.progressContainer.classList.add('hidden');
    }
};

// Boot application
document.addEventListener('DOMContentLoaded', () => {
    elements.appVersion.textContent = `v${__APP_VERSION__}`;
    initApp();
    setupWarnings();
    setupAppEvents({
        onFileSelected: handleVideoFile,
        onClearVideo: clearVideo,
        onConvert: performConversion
    });
});
