export const elements = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    videoPreviewContainer: document.getElementById('video-preview-container'),
    videoPreview: document.getElementById('video-preview'),
    btnRemoveVideo: document.getElementById('btn-remove-video'),
    btnConvert: document.getElementById('btn-convert'),
    btnConvertLabel: document.querySelector('#btn-convert .btn-label'),
    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    outputContainer: document.getElementById('output-container'),
    gifPreview: document.getElementById('gif-preview'),
    btnDownload: document.getElementById('btn-download'),
    btnDownloadLabel: document.querySelector('#btn-download .btn-label'),
    initOverlay: document.getElementById('init-overlay'),
    timelineContainer: document.getElementById('timeline-container'),
    videoInfo: document.getElementById('video-info'),
    errorAlert: document.getElementById('error-alert'),
    errorMessage: document.getElementById('error-message'),
    fpsSelect: document.getElementById('fps-select'),
    scaleSelect: document.getElementById('scale-select'),
    appVersion: document.getElementById('app-version'),
    // Timeline specific
    timecodeDisplay: document.getElementById('timecode-display'),
    btnGoIn: document.getElementById('btn-go-in'),
    btnSetIn: document.getElementById('btn-set-in'),
    btnSetOut: document.getElementById('btn-set-out'),
    btnGoOut: document.getElementById('btn-go-out'),
    btnLoop: document.getElementById('btn-loop'),
    tracksWrapper: document.getElementById('timeline-tracks-wrapper'),
    trimArea: document.getElementById('trim-area'),
    trimStartHandle: document.getElementById('trim-start-handle'),
    trimEndHandle: document.getElementById('trim-end-handle'),
    playhead: document.getElementById('playhead'),
    scrollArea: document.getElementById('timeline-scroll-area'),
    zoomSlider: document.getElementById('zoom-slider'),
    btnFocusPlayhead: document.getElementById('btn-focus-playhead'),
    btnFramePrev: document.getElementById('btn-frame-prev'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnFrameNext: document.getElementById('btn-frame-next'),
    trimDurationDisplay: document.getElementById('trim-duration-display')
};

export const showError = (message) => {
    elements.errorMessage.textContent = message;
    elements.errorAlert.classList.remove('hidden');
    setTimeout(() => {
        elements.errorAlert.classList.add('hidden');
    }, 5000);
};

export const hideError = () => {
    elements.errorAlert.classList.add('hidden');
};
