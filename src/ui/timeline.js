export class TimelineController {
    constructor(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;
        
        this.totalFrames = 0;
        this.startFrame = 0;
        this.endFrame = 0;
        this.sourceFps = 30;
        this.isLooping = false;
        
        this.setupDrag();
        this.setupZoomAndFineTune();
    }

    reset() {
        this.totalFrames = 0;
        this.startFrame = 0;
        this.endFrame = 0;
        this.sourceFps = 30;
        this.isLooping = false;
        if (this.elements.btnLoop) {
            this.elements.btnLoop.style.background = '';
            this.elements.btnLoop.style.color = '';
        }
        if(this.elements.zoomSlider) this.elements.zoomSlider.value = 1;
        if(this.elements.tracksWrapper) this.elements.tracksWrapper.style.width = '100%';
        if(this.elements.trimDurationDisplay) this.elements.trimDurationDisplay.textContent = '選択: 0.00秒';
        this.updateUI();
        this.setTimecode(0);
    }

    init(duration, fps) {
        this.sourceFps = fps;
        this.totalFrames = Math.floor(duration * fps);
        this.startFrame = 0;
        this.endFrame = this.totalFrames;
        
        if(this.elements.zoomSlider) this.elements.zoomSlider.value = 1;
        if(this.elements.tracksWrapper) this.elements.tracksWrapper.style.width = '100%';

        this.updateUI();
        this.setTimecode(0);
    }

    setTimecode(frame) {
        this.elements.timecodeDisplay.textContent = this.formatTimecode(frame, this.sourceFps);
    }

    updatePlayhead(currentTime) {
        if (!this.totalFrames || !this.sourceFps) return;
        const currentFrame = Math.floor(currentTime * this.sourceFps);
        this.setTimecode(currentFrame);
        
        const pct = (currentFrame / this.totalFrames) * 100;
        this.elements.playhead.style.left = `${pct}%`;
    }

    formatTimecode(frame, fps) {
        if (!fps) fps = 30;
        const f = Math.floor(frame % fps);
        const s = Math.floor((frame / fps) % 60);
        const m = Math.floor((frame / (fps * 60)) % 60);
        const h = Math.floor(frame / (fps * 60 * 60));
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
    }

    updateUI() {
        if (this.totalFrames === 0) return;
        const startPct = (this.startFrame / this.totalFrames) * 100;
        const endPct = (this.endFrame / this.totalFrames) * 100;

        this.elements.trimArea.style.left = `${startPct}%`;
        this.elements.trimArea.style.width = `${endPct - startPct}%`;
        
        if (this.elements.trimDurationDisplay) {
            const durationSec = (this.endFrame - this.startFrame) / this.sourceFps;
            this.elements.trimDurationDisplay.textContent = `選択範囲: ${durationSec.toFixed(2)}秒`;
        }
    }

    setupDrag() {
        let isDragging = null;

        const getFrameFromEvent = (e) => {
            const rect = this.elements.tracksWrapper.getBoundingClientRect();
            // ClientX - rect.left coordinates work perfectly even when scrolled because rect.left is relative to viewport 
            let x = e.clientX - rect.left;
            x = Math.max(0, Math.min(x, rect.width));
            const pct = x / rect.width;
            return Math.floor(pct * this.totalFrames);
        };

        this.elements.tracksWrapper.addEventListener('mousedown', (e) => {
            if (!this.totalFrames) return;
            if (e.target === this.elements.trimStartHandle) {
                isDragging = 'start';
            } else if (e.target === this.elements.trimEndHandle) {
                isDragging = 'end';
            } else {
                isDragging = 'playhead';
                const f = getFrameFromEvent(e);
                if (this.callbacks.onSeek) this.callbacks.onSeek(f / this.sourceFps, true);
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.totalFrames) return;
            let f = getFrameFromEvent(e);

            if (isDragging === 'start') {
                if (f >= this.endFrame) f = this.endFrame - 1; // Strict rule: start must leave at least 1 frame gap
                if (f < 0) f = 0; // Strict rule: >= 0
                this.startFrame = f;
                this.updateUI();
                if (this.callbacks.onSeek) this.callbacks.onSeek(this.startFrame / this.sourceFps, false);
            } else if (isDragging === 'end') {
                if (f <= this.startFrame) f = this.startFrame + 1; // Strict rule: end must be ahead of start
                if (f > this.totalFrames) f = this.totalFrames; // Strict rule: <= totalFrames
                this.endFrame = f;
                this.updateUI();
                if (this.callbacks.onSeek) this.callbacks.onSeek(this.endFrame / this.sourceFps, false);
            } else if (isDragging === 'playhead') {
                if (this.callbacks.onSeek) this.callbacks.onSeek(f / this.sourceFps, false);
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = null;
        });

        this.elements.btnSetIn.addEventListener('click', () => {
            if (!this.totalFrames) return;
            const currentF = Math.floor(this.callbacks.getCurrentTime() * this.sourceFps);
            if (currentF >= this.endFrame) return; // Prevent overtaking
            this.startFrame = currentF;
            this.updateUI();
        });

        this.elements.btnSetOut.addEventListener('click', () => {
            if (!this.totalFrames) return;
            const currentF = Math.floor(this.callbacks.getCurrentTime() * this.sourceFps);
            if (currentF <= this.startFrame) return; // Prevent overtaking
            this.endFrame = currentF;
            this.updateUI();
        });

        if (this.elements.btnGoIn) {
            this.elements.btnGoIn.addEventListener('click', () => {
                if (!this.totalFrames) return;
                if (this.callbacks.onSeek) {
                    this.callbacks.onSeek(this.startFrame / this.sourceFps, true);
                }
            });
        }

        if (this.elements.btnGoOut) {
            this.elements.btnGoOut.addEventListener('click', () => {
                if (!this.totalFrames) return;
                if (this.callbacks.onSeek) {
                    this.callbacks.onSeek(this.endFrame / this.sourceFps, true);
                }
            });
        }

        if (this.elements.btnLoop) {
            this.elements.btnLoop.addEventListener('click', () => {
                this.isLooping = !this.isLooping;
                if (this.isLooping) {
                    this.elements.btnLoop.style.background = '#10a37f';
                    this.elements.btnLoop.style.color = '#fff';
                    // Auto-seek if out of bounds
                    if (this.callbacks.getCurrentTime) {
                        const currentTime = this.callbacks.getCurrentTime();
                        if (currentTime >= this.endFrame / this.sourceFps || currentTime < this.startFrame / this.sourceFps) {
                            if (this.callbacks.onSeek) this.callbacks.onSeek(this.startFrame / this.sourceFps, false);
                        }
                    }
                } else {
                    this.elements.btnLoop.style.background = '';
                    this.elements.btnLoop.style.color = '';
                }
            });
        }
    }

    setupZoomAndFineTune() {
        // Zoom Logic with scroll position compensation (Requirement 1 & 2)
        if (this.elements.zoomSlider && this.elements.scrollArea) {
            this.elements.zoomSlider.addEventListener('input', (e) => {
                const zoomValue = parseInt(e.target.value, 10);
                const rect = this.elements.tracksWrapper.getBoundingClientRect();
                const oldWidth = rect.width;
                const scrollArea = this.elements.scrollArea;
                
                // Keep playhead position in screen during zoom
                let playheadRatio = 0;
                if (this.totalFrames && this.callbacks.getCurrentTime) {
                    const currentTime = this.callbacks.getCurrentTime();
                    const currentFrame = Math.floor(currentTime * this.sourceFps);
                    playheadRatio = currentFrame / this.totalFrames;
                }
                const playheadXInView = (oldWidth * playheadRatio) - scrollArea.scrollLeft;
                
                // Apply new width (zoom)
                this.elements.tracksWrapper.style.width = `${zoomValue * 100}%`;
                
                // Restore scroll based on playhead target coordinates
                const newWidth = this.elements.tracksWrapper.getBoundingClientRect().width;
                const newPlayheadX = newWidth * playheadRatio;
                scrollArea.scrollLeft = newPlayheadX - playheadXInView;
            });
        }

        // Safely re-query the button just in case of Vite HMR issues where elements map fired early
        const btnFocusPlayhead = this.elements.btnFocusPlayhead || document.getElementById('btn-focus-playhead');
        
        if (btnFocusPlayhead && this.elements.scrollArea) {
            btnFocusPlayhead.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.totalFrames || !this.callbacks.getCurrentTime) return;
                
                const currentTime = this.callbacks.getCurrentTime();
                const currentFrame = Math.floor(currentTime * this.sourceFps);
                const playheadRatio = currentFrame / this.totalFrames;
                
                // Use scrollWidth instead of bounding client rect to ensure accurate calculation when zoomed
                const trackWidth = this.elements.tracksWrapper.scrollWidth || this.elements.tracksWrapper.getBoundingClientRect().width;
                const playheadX = trackWidth * playheadRatio;
                
                const scrollAreaWidth = this.elements.scrollArea.clientWidth || this.elements.scrollArea.getBoundingClientRect().width;
                
                // Direct assignment to scrollLeft works consistently across all states without smooth-scroll conflicts
                this.elements.scrollArea.scrollLeft = playheadX - (scrollAreaWidth / 2);
            });
        }
        // Playback and Frame step controls
        const stepFrame = (direction) => {
            if (!this.totalFrames || !this.callbacks.getCurrentTime) return;
            const currentT = this.callbacks.getCurrentTime();
            let newT = currentT + (direction * (1 / this.sourceFps));
            newT = Math.max(0, Math.min(newT, this.totalFrames / this.sourceFps));
            if (this.callbacks.onSeek) this.callbacks.onSeek(newT, true);
        };

        if (this.elements.btnFramePrev) {
            this.elements.btnFramePrev.addEventListener('click', () => stepFrame(-1));
        }
        if (this.elements.btnFrameNext) {
            this.elements.btnFrameNext.addEventListener('click', () => stepFrame(1));
        }
        
        if (this.elements.btnPlayPause) {
            this.elements.btnPlayPause.addEventListener('click', () => {
                if (this.callbacks.onTogglePlay) {
                    this.callbacks.onTogglePlay();
                }
            });
        }
    }

    getSettings() {
        return {
            startFrame: this.startFrame,
            endFrame: this.endFrame,
            totalFrames: this.totalFrames,
            sourceFps: this.sourceFps,
            timeStart: this.startFrame / this.sourceFps,
            timeEnd: this.endFrame / this.sourceFps
        };
    }
}
