import { elements } from './dom.js';

export const setupAppEvents = ({ onFileSelected, onClearVideo, onConvert }) => {
    // Drag & Drop / File Input Event Listeners
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    
    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropZone.classList.add('dragover');
    });
    
    elements.dropZone.addEventListener('dragleave', () => {
        elements.dropZone.classList.remove('dragover');
    });
    
    elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            onFileSelected(e.dataTransfer.files[0]);
        }
    });
    
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            onFileSelected(e.target.files[0]);
        }
    });
    
    // A file dropped outside the drop zone would otherwise replace the whole page with the video
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
            onFileSelected(e.dataTransfer.files[0]);
        }
    });

    elements.btnRemoveVideo.addEventListener('click', onClearVideo);
    
    // Conversion Process
    elements.btnConvert.addEventListener('click', onConvert);

    setupShortcuts();
};

// Keyboard shortcuts mirror the timeline buttons
const setupShortcuts = () => {
    const keyMap = {
        ' ': elements.btnPlayPause,
        'ArrowLeft': elements.btnFramePrev,
        'ArrowRight': elements.btnFrameNext,
        'Home': elements.btnGoIn,
        'End': elements.btnGoOut,
        'i': elements.btnSetIn,
        'o': elements.btnSetOut,
        'l': elements.btnLoop,
        'f': elements.btnFocusPlayhead
    };

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.target.closest('input, select, textarea, video')) return;
        if (elements.timelineContainer.classList.contains('hidden')) return;

        const button = keyMap[e.key.length === 1 ? e.key.toLowerCase() : e.key];
        if (!button) return;
        e.preventDefault();
        button.click();
    });
};

export const setupWarnings = () => {
    const formatSelect = document.getElementById('format-select');
    const scaleSelect = document.getElementById('scale-select');
    const fpsSelect = document.getElementById('fps-select');
    const resolutionWarning = document.getElementById('resolution-warning');

    if (formatSelect && scaleSelect && fpsSelect && resolutionWarning) {
        const checkWarning = () => {
            const isHighRes = scaleSelect.value === '-1' || parseInt(scaleSelect.value, 10) >= 1080;
            const isHighFps = fpsSelect.value === '-1' || parseInt(fpsSelect.value, 10) >= 24;
            
            if ((isHighRes || isHighFps) && formatSelect.value === 'gif') {
                resolutionWarning.classList.remove('hidden');
            } else {
                resolutionWarning.classList.add('hidden');
            }
        };
        formatSelect.addEventListener('change', checkWarning);
        scaleSelect.addEventListener('change', checkWarning);
        fpsSelect.addEventListener('change', checkWarning);
        
        // Initial check
        checkWarning();
    }
};
