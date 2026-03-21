/**
 * Pomotime - Premium Application Logic
 * Features: Timer, Ambient Audio, Sound Visualizer, Particles,
 *           Focus Mode, Session Celebration, Stats Animation
 */

// ====== Timer Configuration ======
const MODES = {
    'focus': { label: 'Focus Session', time: 25 * 60 },
    'short-break': { label: 'Short Break', time: 5 * 60 },
    'long-break': { label: 'Long Break', time: 15 * 60 }
};

// ====== State ======
let currentMode = 'focus';
let timeLeft = MODES[currentMode].time;
let timerInterval = null;
let isRunning = false;
let isFocusMode = false;
let sessionStats = {
    date: new Date().toLocaleDateString(),
    sessionsToday: 0,
    totalFocusTime: 0
};

// ====== DOM Elements ======
const elTimeLeft = document.getElementById('time-left');
const elModeLabel = document.getElementById('mode-label');
const btnStart = document.getElementById('start-btn');
const btnReset = document.getElementById('reset-btn');
const modeButtons = document.querySelectorAll('.mode-btn');
const progressCircle = document.querySelector('.progress-ring__circle');
const modeIndicator = document.querySelector('.mode-indicator');

const elStatSessions = document.getElementById('stat-sessions');
const elStatTime = document.getElementById('stat-time');

const btnTheme = document.getElementById('theme-toggle');
const btnFocusMode = document.getElementById('focus-mode-toggle');
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');

const soundButtons = document.querySelectorAll('.sound-play-btn');
const volumeSlider = document.getElementById('volume-slider');

const sessionOverlay = document.getElementById('session-complete-overlay');
const soundVisualizerCanvas = document.getElementById('sound-visualizer');
const bgCanvas = document.getElementById('bg-particles');

// ====== Audio Engine (Web Audio API) ======
let audioCtx = null;
let currentSoundSrc = null;
let gainNode = null;
let activeSoundType = null;
let analyserNode = null;

// ====== Circular Progress ======
const radius = progressCircle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = 0;

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
}

// ====== Formatting ======
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateDisplay() {
    elTimeLeft.textContent = formatTime(timeLeft);
    const totalDuration = MODES[currentMode].time;
    const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
    setProgress(progress);
    document.title = `${formatTime(timeLeft)} - ${MODES[currentMode].label}`;
}

// ====== Mode Indicator Sliding ======
function updateModeIndicator(mode) {
    const modeKeys = Object.keys(MODES);
    const idx = modeKeys.indexOf(mode);
    if (modeIndicator) {
        modeIndicator.setAttribute('data-pos', idx);
    }
}

// ====== Timer Actions ======
function switchMode(mode) {
    currentMode = mode;
    timeLeft = MODES[currentMode].time;

    modeButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
    elModeLabel.textContent = MODES[currentMode].label;
    updateModeIndicator(mode);

    if (isRunning) toggleTimer();
    updateDisplay();
}

function toggleTimer() {
    const wrapper = document.querySelector('.timer-circle-wrapper');
    if (isRunning) {
        clearInterval(timerInterval);
        isRunning = false;
        btnStart.innerHTML = '<i data-feather="play"></i> Start';
        btnStart.classList.remove('running');
        wrapper.classList.remove('is-active');
    } else {
        requestNotificationPermission();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();
            if (timeLeft <= 0) {
                handleTimerEnd();
            }
        }, 1000);
        isRunning = true;
        btnStart.innerHTML = '<i data-feather="pause"></i> Pause';
        btnStart.classList.add('running');
        wrapper.classList.add('is-active');
    }
    feather.replace();
}

function resetTimer() {
    if (isRunning) toggleTimer();
    timeLeft = MODES[currentMode].time;
    updateDisplay();
    showToast('Timer Reset');
}

function handleTimerEnd() {
    clearInterval(timerInterval);
    isRunning = false;
    btnStart.innerHTML = '<i data-feather="play"></i> Start';
    btnStart.classList.remove('running');
    setProgress(100);
    feather.replace();

    const wrapper = document.querySelector('.timer-circle-wrapper');
    wrapper.classList.remove('is-active');
    wrapper.classList.add('timer-complete');
    setTimeout(() => wrapper.classList.remove('timer-complete'), 1500);

    playAlarm();
    showNotification(`Session Complete: ${MODES[currentMode].label}`, "Time to switch tasks!");

    if (currentMode === 'focus') {
        updateStats();
    }

    showSessionComplete();
}

// ====== Session Completion Celebration ======
function showSessionComplete() {
    sessionOverlay.classList.remove('hidden');
    // Force reflow so transition works
    sessionOverlay.offsetHeight;
    sessionOverlay.classList.add('show');
    feather.replace();

    spawnConfetti();

    setTimeout(() => {
        sessionOverlay.classList.remove('show');
        setTimeout(() => sessionOverlay.classList.add('hidden'), 500);
    }, 4000);
}

function spawnConfetti() {
    const colors = ['#7C5CFF', '#00CFFF', '#A855F7', '#FF6B9D', '#FFD93D', '#6BCB77'];
    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.left = `${50 + (Math.random() - 0.5) * 40}vw`;
        particle.style.top = `${40 + (Math.random() - 0.5) * 20}vh`;
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.setProperty('--tx', `${(Math.random() - 0.5) * 200}px`);
        particle.style.setProperty('--ty', `${150 + Math.random() * 200}px`);
        particle.style.setProperty('--rot', `${Math.random() * 1080}deg`);
        particle.style.setProperty('--fall-duration', `${1.5 + Math.random() * 2}s`);
        particle.style.width = `${6 + Math.random() * 6}px`;
        particle.style.height = `${6 + Math.random() * 6}px`;
        particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 4000);
    }
}

// ====== Stats & Local Storage ======
function loadStats() {
    const saved = localStorage.getItem('focusflow_stats');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === sessionStats.date) {
            sessionStats = parsed;
        }
    }
    renderStats(true);
}

function updateStats() {
    sessionStats.sessionsToday += 1;
    sessionStats.totalFocusTime += (MODES['focus'].time / 60);
    localStorage.setItem('focusflow_stats', JSON.stringify(sessionStats));
    renderStats();
}

function renderStats(instant = false) {
    if (instant) {
        elStatSessions.textContent = sessionStats.sessionsToday;
        elStatTime.textContent = sessionStats.totalFocusTime;
    } else {
        animateCountUp(elStatSessions, sessionStats.sessionsToday);
        animateCountUp(elStatTime, sessionStats.totalFocusTime);
    }
}

// ====== Stats Count-Up Animation ======
function animateCountUp(element, target, duration = 800) {
    const start = parseInt(element.textContent) || 0;
    if (start === target) return;
    const range = target - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(start + range * eased);
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// ====== Web Audio Synthesis ======
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.gain.value = volumeSlider.value;
        gainNode.connect(audioCtx.destination);

        // Analyser for visualizer
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 64;
        analyserNode.smoothingTimeConstant = 0.8;
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playAlarm() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const alarmGain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2);
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.4);

    alarmGain.gain.setValueAtTime(0, audioCtx.currentTime);
    alarmGain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
    alarmGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);

    osc.connect(alarmGain);
    alarmGain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
}

function createNoise(type) {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'white') {
            output[i] = white;
        } else if (type === 'brown') {
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        } else if (type === 'pink') {
            const b = [0, 0, 0, 0, 0, 0, 0];
            b[0] = 0.99886 * b[0] + white * 0.0555179;
            b[1] = 0.99332 * b[1] + white * 0.0750759;
            b[2] = 0.96900 * b[2] + white * 0.1538520;
            b[3] = 0.86650 * b[3] + white * 0.3104856;
            b[4] = 0.55000 * b[4] + white * 0.5329522;
            b[5] = -0.7616 * b[5] - white * 0.0168980;
            output[i] = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.5362;
            output[i] *= 0.11;
            b[6] = white * 0.115926;
        }
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    if (type === 'brown') {
        filter.type = 'lowpass';
        filter.frequency.value = 400;
    } else if (type === 'pink') {
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 400;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
    } else {
        filter.type = 'allpass';
    }

    const fadeGain = audioCtx.createGain();
    fadeGain.gain.value = 0;

    source.connect(filter);
    filter.connect(fadeGain);
    fadeGain.connect(analyserNode);
    analyserNode.connect(gainNode);

    source.fadeGain = fadeGain;
    return source;
}

function fadeOutAndStop(src) {
    if (!src || !src.fadeGain) {
        if (src) src.stop();
        return;
    }
    const gain = src.fadeGain;
    gain.gain.cancelScheduledValues(audioCtx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 1);
    src.stop(audioCtx.currentTime + 1.1);
}

function updateSoundUI() {
    document.querySelectorAll('.sound-item').forEach(item => {
        item.classList.remove('active');
        const btn = item.querySelector('.sound-play-btn');
        if (btn) btn.innerHTML = '<i data-feather="play"></i>';
    });

    if (activeSoundType) {
        const activeBtn = document.querySelector(`.sound-play-btn[data-sound="${activeSoundType}"]`);
        if (activeBtn) {
            const item = activeBtn.closest('.sound-item');
            item.classList.add('active');
            activeBtn.innerHTML = '<i data-feather="pause"></i>';
        }
    }
    if (window.feather) window.feather.replace();
}

function toggleAmbientSound(type) {
    initAudio();

    if (activeSoundType === type) {
        if (currentSoundSrc) fadeOutAndStop(currentSoundSrc);
        currentSoundSrc = null;
        activeSoundType = null;
        updateSoundUI();
        stopVisualizer();
        return;
    }

    if (currentSoundSrc) fadeOutAndStop(currentSoundSrc);

    activeSoundType = type;

    let noiseType = 'white';
    if (type === 'rain') noiseType = 'brown';
    if (type === 'waves') noiseType = 'pink';

    currentSoundSrc = createNoise(noiseType);
    currentSoundSrc.start();

    currentSoundSrc.fadeGain.gain.setValueAtTime(0, audioCtx.currentTime);
    currentSoundSrc.fadeGain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 1);

    updateSoundUI();
    startVisualizer();
}

// ====== Sound Wave Visualizer ======
let visualizerRAF = null;

function startVisualizer() {
    if (!soundVisualizerCanvas || !analyserNode) return;
    soundVisualizerCanvas.classList.add('active');
    drawVisualizer();
}

function stopVisualizer() {
    if (!soundVisualizerCanvas) return;
    soundVisualizerCanvas.classList.remove('active');
    if (visualizerRAF) {
        cancelAnimationFrame(visualizerRAF);
        visualizerRAF = null;
    }
}

function drawVisualizer() {
    if (!analyserNode || !activeSoundType) return;

    const ctx = soundVisualizerCanvas.getContext('2d');
    const width = soundVisualizerCanvas.width;
    const height = soundVisualizerCanvas.height;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        if (!activeSoundType) {
            stopVisualizer();
            return;
        }
        visualizerRAF = requestAnimationFrame(draw);
        analyserNode.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 1.2;
        const gap = 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height * 0.85;

            // Gradient color per bar
            const hue = 260 + (i / bufferLength) * 60; // Purple to cyan
            const alpha = 0.6 + (dataArray[i] / 255) * 0.4;
            ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;

            // Rounded bar
            const barX = x;
            const barY = height - barHeight;
            const radius = Math.min(barWidth / 2, 3);
            ctx.beginPath();
            ctx.moveTo(barX + radius, barY);
            ctx.lineTo(barX + barWidth - radius, barY);
            ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
            ctx.lineTo(barX + barWidth, height);
            ctx.lineTo(barX, height);
            ctx.lineTo(barX, barY + radius);
            ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
            ctx.fill();

            // Glow effect
            ctx.shadowColor = `hsla(${hue}, 80%, 65%, 0.5)`;
            ctx.shadowBlur = 6;

            x += barWidth + gap;
        }
        ctx.shadowBlur = 0;
    }
    draw();
}

// ====== Background Particle System ======
function initParticles() {
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 35;

    function resize() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            radius: 1 + Math.random() * 2,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            opacity: 0.1 + Math.random() * 0.3,
            pulseSpeed: 0.005 + Math.random() * 0.01,
            pulsePhase: Math.random() * Math.PI * 2
        });
    }

    let frame = 0;
    function animate() {
        requestAnimationFrame(animate);
        frame++;
        ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

        const isLight = document.body.classList.contains('light-theme');

        particles.forEach(p => {
            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Wrap
            if (p.x < -10) p.x = bgCanvas.width + 10;
            if (p.x > bgCanvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = bgCanvas.height + 10;
            if (p.y > bgCanvas.height + 10) p.y = -10;

            // Pulse opacity
            const pulse = Math.sin(frame * p.pulseSpeed + p.pulsePhase) * 0.15;
            const opacity = Math.max(0.05, p.opacity + pulse);

            // Draw
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

            if (isLight) {
                ctx.fillStyle = `rgba(124, 92, 255, ${opacity * 0.5})`;
            } else {
                ctx.fillStyle = `rgba(200, 200, 255, ${opacity})`;
            }
            ctx.fill();

            // Soft glow
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
            if (isLight) {
                ctx.fillStyle = `rgba(124, 92, 255, ${opacity * 0.08})`;
            } else {
                ctx.fillStyle = `rgba(124, 92, 255, ${opacity * 0.12})`;
            }
            ctx.fill();
        });

        // Draw connecting lines between nearby particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const lineOpacity = (1 - dist / 120) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    if (isLight) {
                        ctx.strokeStyle = `rgba(124, 92, 255, ${lineOpacity})`;
                    } else {
                        ctx.strokeStyle = `rgba(200, 200, 255, ${lineOpacity})`;
                    }
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    // Respect reduced motion
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animate();
    }
}

// ====== Focus Mode ======
function toggleFocusMode() {
    isFocusMode = !isFocusMode;
    document.body.classList.toggle('focus-mode', isFocusMode);
    localStorage.setItem('focusflow_focus_mode', isFocusMode ? 'on' : 'off');
    showToast(isFocusMode ? 'Focus Mode: ON' : 'Focus Mode: OFF');
    if (window.feather) feather.replace();
}

// ====== Notifications & UI ======
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>' });
    } else {
        showToast(title);
    }
}

let toastTimeout;
function showToast(message) {
    toastMsg.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('show');
    }, 4000);
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('focusflow_theme', isLight ? 'light' : 'dark');
}

// ====== Event Listeners ======
btnStart.addEventListener('click', () => {
    initAudio();
    toggleTimer();
});
btnReset.addEventListener('click', () => {
    initAudio();
    resetTimer();
});

modeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => switchMode(e.target.dataset.mode));
});

btnTheme.addEventListener('click', toggleTheme);
btnFocusMode.addEventListener('click', toggleFocusMode);

soundButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.sound;
        toggleAmbientSound(type);
    });
});

volumeSlider.addEventListener('input', (e) => {
    if (gainNode) {
        gainNode.gain.value = e.target.value;
    }
});

// Dismiss session overlay on click
sessionOverlay.addEventListener('click', () => {
    sessionOverlay.classList.remove('show');
    setTimeout(() => sessionOverlay.classList.add('hidden'), 500);
});

document.addEventListener('keydown', (e) => {
    if (e.target.tagName.toLowerCase() === 'input') return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            btnStart.click();
            break;
        case 'KeyR':
            btnReset.click();
            break;
        case 'KeyM':
            const modeKeys = Object.keys(MODES);
            let idx = modeKeys.indexOf(currentMode);
            idx = (idx + 1) % modeKeys.length;
            switchMode(modeKeys[idx]);
            showToast(`Mode: ${MODES[modeKeys[idx]].label}`);
            break;
        case 'KeyF':
            toggleFocusMode();
            break;
    }
});

// ====== Initialization ======
function init() {
    // Theme
    const savedTheme = localStorage.getItem('focusflow_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    // Focus mode
    const savedFocus = localStorage.getItem('focusflow_focus_mode');
    if (savedFocus === 'on') {
        isFocusMode = true;
        document.body.classList.add('focus-mode');
    }

    // Stats
    loadStats();
    updateDisplay();
    updateModeIndicator(currentMode);

    // Particles
    initParticles();

    // Onboarding toast
    setTimeout(() => {
        showToast('Welcome to Pomotime! Press Space to Start.');
    }, 1000);

    // Scroll Observer for Info Section
    const infoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                infoObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    const infoSection = document.querySelector('.info-section');
    if (infoSection) {
        infoObserver.observe(infoSection);
    }

    // Stats observer - animate count on scroll into view
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                renderStats();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const statsPanel = document.querySelector('.stats-panel');
    if (statsPanel) {
        statsObserver.observe(statsPanel);
    }
}

init();
