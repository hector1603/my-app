/**
 * Valentine's Day App - Core Logic
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const treeCanvas = document.getElementById('tree-canvas');
const treeCtx = treeCanvas.getContext('2d');
const rainCanvas = document.getElementById('rain-canvas');
const rainCtx = rainCanvas.getContext('2d');

let width, height;
let rainWidth, rainHeight;
let particles = [];
let heartPoints = [];
const PARTICLE_COUNT = 7000;
let rotationY = 0;

class LoveDrop {
    constructor() {
        this.init();
    }

    init() {
        this.x = Math.random() * rainWidth;
        this.y = Math.random() * -rainHeight;
        this.speed = 1.5 + Math.random() * 3;
        this.fontSize = 12 + Math.random() * 24;
        this.opacity = 0.2 + Math.random() * 0.6;
    }

    update() {
        this.y += this.speed;
        if (this.y > rainHeight) {
            this.init();
            this.y = -20;
        }
    }

    draw() {
        rainCtx.fillStyle = `rgba(255, 45, 85, ${this.opacity})`;
        rainCtx.font = `${this.fontSize}px 'Dancing Script', cursive`;
        rainCtx.fillText("Te Amo", this.x, this.y);
    }
}

let rainDrops = [];
const RAIN_COUNT = 40;

function isInsideLetter(nx, ny) {
    // H: Left side - Adjusting to fit within -14, -4 range and scale
    const h_x_start = -13;
    const h_x_end = -3;
    const h_y_top = -7;
    const h_y_bot = 7;
    const h_thickness = 2.8;

    const isHLeftLine = (nx > h_x_start && nx < h_x_start + h_thickness && ny > h_y_top && ny < h_y_bot);
    const isHRightLine = (nx > h_x_end - h_thickness && nx < h_x_end && ny > h_y_top && ny < h_y_bot);
    const isHMidLine = (nx > h_x_start && nx < h_x_end && ny > -1.2 && ny < 1.2);

    if (isHLeftLine || isHRightLine || isHMidLine) return true;

    // L: Right side - Adjusting to fit within 3, 13 range
    const l_x_start = 3;
    const l_x_end = 13;
    const l_y_top = -7;
    const l_y_bot = 7;
    const l_thickness = 2.8;

    const isLVert = (nx > l_x_start && nx < l_x_start + l_thickness && ny > l_y_top && ny < l_y_bot);
    const isLBot = (nx > l_x_start && nx < l_x_end && ny > l_y_bot - l_thickness && ny < l_y_bot);

    if (isLVert || isLBot) return true;

    return false;
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    heartPoints = [];
    const scale = Math.min(width, height) / 45;

    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        const t = Math.random() * Math.PI * 2;

        let bx = 1.6 * 16 * Math.pow(Math.sin(t), 3);
        let by = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

        const fill = Math.pow(Math.random(), 0.5);

        const maxDepth = 8 * (1 - Math.abs(bx) / 25.6);
        const bz = (Math.random() - 0.5) * maxDepth * 2;

        const x = bx * fill;
        const y = by * fill;
        const z = bz * fill;

        if (!isInsideLetter(x, y)) {
            heartPoints.push({
                x: x * scale, y: y * scale, z: z * scale,
                origX: x * scale, origZ: z * scale,
                nx: x, ny: y // Keep normalized for runtime check
            });
        }
        if (heartPoints.length >= PARTICLE_COUNT) break;
    }
}

class Particle {
    constructor() {
        this.init();
    }

    init() {
        this.x = (Math.random() - 0.5) * width + width / 2;
        this.y = height + Math.random() * 800;

        this.targetPoint = heartPoints[Math.floor(Math.random() * heartPoints.length)];

        this.speed = 0.015 + Math.random() * 0.025;
        this.size = 0.8 + Math.random() * 1.5;
        this.alpha = 0.4 + Math.random() * 0.5;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.15;

        this.puddleColor = { r: 0, g: 242, b: 255 };
        this.heartColor = { r: 255, g: 15, b: 45 };
    }

    update() {
        const cosY = Math.cos(rotationY);
        const sinY = Math.sin(rotationY);

        const tx = this.targetPoint.origX * cosY - this.targetPoint.origZ * sinY + width / 2;
        const ty = this.targetPoint.y + height * 0.5; // Lowered centerpiece
        const tz = this.targetPoint.origX * sinY + this.targetPoint.origZ * cosY;

        const fov = 1100;
        const s = fov / (fov + tz);

        this.x += (tx - this.x) * this.speed;
        this.y += (ty - this.y) * this.speed;

        const progress = Math.min(1, Math.max(0, (height - this.y) / (height * 0.75)));
        const r = Math.floor(this.puddleColor.r + (this.heartColor.r - this.puddleColor.r) * progress);
        const g = Math.floor(this.puddleColor.g + (this.heartColor.g - this.puddleColor.g) * progress);
        const b = Math.floor(this.puddleColor.b + (this.heartColor.b - this.puddleColor.b) * progress);

        this.color = `rgba(${r}, ${g}, ${b}, ${this.alpha * s})`;
        this.renderSize = this.size * s;

        // CRITICAL: Check if particle is currently over a letter hole and hide if it is
        // We use projected coordinates back to normalized space
        const currentNX = (this.x - width / 2) / (Math.min(width, height) / 45);
        const currentNY = (this.y - height * 0.45) / (Math.min(width, height) / 45);

        // We rotate currentNX/NY back to check against the fixed holes
        // This is complex, so simpler: if it's within the heart and moving, 
        // we just let it be. BUT to avoid stars "on top", we hide them if they are 
        // in the projected hole area.
        this.hidden = isInsideLetter(currentNX / cosY, currentNY);
        // Note: The rotation logic above is a simplification but helps prevent "ghosting" over holes

        this.angle += this.spin;
    }

    draw() {
        if (this.hidden && this.y < height * 0.8) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;

        if (this.y < height * 0.8) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
        }

        ctx.beginPath();
        const s = this.renderSize;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.fill();
        ctx.restore();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    ctx.fillStyle = 'rgba(3, 3, 3, 0.4)';
    ctx.fillRect(0, 0, width, height);

    rotationY += 0.045;

    const grad = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, width * 0.9);
    grad.addColorStop(0, 'rgba(3, 3, 3, 0)');
    grad.addColorStop(1, 'rgba(3, 3, 3, 0)');

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(width / 2, height, width * 0.9, 180, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

const bouquetRoses = [];
const ROSE_COUNT = 45;

function initBouquet() {
    bouquetRoses.length = 0;
    for (let i = 0; i < ROSE_COUNT; i++) {
        // Arrange roses in a rounded bouquet SHAPE
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.pow(Math.random(), 0.7) * 150; // Denser towards center
        const x = 200 + Math.cos(angle) * radius;
        const y = 220 + Math.sin(angle) * radius * 0.6; // Flattened circle for perspective
        bouquetRoses.push({
            x, y,
            size: 25 + Math.random() * 20,
            angle: Math.random() * Math.PI * 2,
            delay: Math.random() * 0.5 // staggered growth
        });
    }
}

/**
 * Realistically draws a rose using layered petals and gradients
 */
function drawRose(ctx, x, y, size, angle, growth = 1) {
    if (size * growth < 3) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(growth, growth);

    const petalCount = 8;
    for (let i = petalCount; i > 0; i--) {
        const ratio = i / petalCount;
        const petalSize = size * ratio;
        const opacity = 0.8 + ratio * 0.2;

        const grad = ctx.createRadialGradient(0, 0, petalSize * 0.1, 0, 0, petalSize);
        grad.addColorStop(0, `rgba(${130 + (1 - ratio) * 125}, 0, 20, ${opacity})`);
        grad.addColorStop(1, `rgba(${200 + (1 - ratio) * 55}, 10, 50, ${opacity})`);

        ctx.fillStyle = grad;
        ctx.beginPath();

        for (let j = 0; j < 5; j++) {
            const petalAngle = (j * Math.PI * 2) / 5 + (i * 0.5);
            const px = Math.cos(petalAngle) * (petalSize * 0.3);
            const py = Math.sin(petalAngle) * (petalSize * 0.3);

            ctx.moveTo(px, py);
            ctx.bezierCurveTo(
                px + Math.cos(petalAngle - 0.5) * petalSize, py + Math.sin(petalAngle - 0.5) * petalSize,
                px + Math.cos(petalAngle + 0.5) * petalSize, py + Math.sin(petalAngle + 0.5) * petalSize,
                px, py
            );
        }
        ctx.fill();
    }

    ctx.fillStyle = "rgba(255, 200, 200, 0.2)";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/**
 * Draws a stem with leaves
 */
function drawStem(ctx, x1, y1, x2, y2, growth = 1) {
    if (growth <= 0) return;

    const dx = x1 - x2;
    const dy = y1 - y2;
    const endX = x2 + dx * growth;
    const endY = y2 + dy * growth;

    ctx.beginPath();
    ctx.strokeStyle = "#1a4d1a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const cp1x = x2 + (endX - x2) * 0.3;
    const cp1y = y2 + (endY - y2) * 0.3;
    const cp2x = x2 + (endX - x2) * 0.7;
    const cp2y = y2 + (endY - y2) * 0.7;

    ctx.moveTo(x2, y2);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();

    if (growth > 0.5) {
        const t = 0.5;
        const lx = Math.pow(1 - t, 3) * x2 + 3 * Math.pow(1 - t, 2) * t * cp1x + 3 * (1 - t) * Math.pow(t, 2) * cp2x + Math.pow(t, 3) * endX;
        const ly = Math.pow(1 - t, 3) * y2 + 3 * Math.pow(1 - t, 2) * t * cp1y + 3 * (1 - t) * Math.pow(t, 2) * cp2y + Math.pow(t, 3) * endY;

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(0.5);
        ctx.fillStyle = "#2d5a27";
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 * growth, 3 * growth, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let bouquetProgress = 0;
let bouquetAnimationId = null;

function drawTree() {
    treeCanvas.width = 400;
    treeCanvas.height = 450;
    const centerX = 200;
    const bottomY = 430;

    if (bouquetRoses.length === 0) initBouquet();

    function animateBouquet() {
        if (bouquetProgress < 1) {
            bouquetProgress += 0.015;
            treeCtx.clearRect(0, 0, 400, 450);

            // Stems
            bouquetRoses.forEach(pos => {
                const stemGrowth = Math.min(1, bouquetProgress * 1.5);
                drawStem(treeCtx, pos.x, pos.y, centerX, bottomY, stemGrowth);
            });

            // Roses
            bouquetRoses.forEach(pos => {
                const roseGrowth = Math.max(0, Math.min(1, (bouquetProgress - pos.delay) * 2));
                drawRose(treeCtx, pos.x, pos.y, pos.size, pos.angle, roseGrowth);
            });

            // Ribbon
            if (bouquetProgress > 0.8) {
                const ribbonScale = (bouquetProgress - 0.8) * 5;
                treeCtx.save();
                treeCtx.translate(centerX, bottomY - 30);
                treeCtx.scale(ribbonScale, ribbonScale);
                treeCtx.fillStyle = "#ff0066";
                treeCtx.beginPath();
                treeCtx.ellipse(0, 0, 25, 12, 0, 0, Math.PI * 2);
                treeCtx.fill();
                treeCtx.strokeStyle = "#cc0052";
                treeCtx.lineWidth = 2;
                treeCtx.stroke();
                treeCtx.restore();
            }

            bouquetAnimationId = requestAnimationFrame(animateBouquet);
        }
    }

    bouquetProgress = 0;
    if (bouquetAnimationId) cancelAnimationFrame(bouquetAnimationId);
    animateBouquet();
}

const startDate = new Date('2014-06-23T00:00:00');
function updateCounter() {
    const now = new Date();
    const diff = now - startDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const counterEl = document.getElementById('counter');
    if (counterEl) {
        counterEl.innerHTML = `
            <span class="unit"><span class="number">${days}</span> días</span>
            <span class="unit"><span class="number">${hours}</span> horas</span>
            <span class="unit"><span class="number">${minutes}</span> minutos</span>
            <span class="unit"><span class="number">${seconds}</span> segundos</span>
        `;
    }
}

window.addEventListener('resize', resize);
resize();
initParticles();
animate();
setInterval(updateCounter, 1000);
updateCounter();

function resizeRain() {
    if (!rainCanvas) return;
    const rect = rainCanvas.parentElement.getBoundingClientRect();
    rainWidth = rect.width;
    rainHeight = rect.height;
    rainCanvas.width = rainWidth;
    rainCanvas.height = rainHeight;
}

function initRain() {
    rainDrops = [];
    for (let i = 0; i < RAIN_COUNT; i++) {
        rainDrops.push(new LoveDrop());
    }
}

function animateRain() {
    rainCtx.clearRect(0, 0, rainWidth, rainHeight);
    rainDrops.forEach(drop => {
        drop.update();
        drop.draw();
    });
    requestAnimationFrame(animateRain);
}

// Recalibrated timings to match the song exactly (removing the previous offset)
const karaokeLines = [
    { start: 14.5, duration: 3.5, text: "Te prometo que el domingo" },
    { start: 18.5, duration: 3.5, text: "Haré realidad tu sueño" },
    { start: 24.0, duration: 3.5, text: "Entraremos a la iglesia" },
    { start: 28.0, duration: 4.0, text: "Para ser al fin tu dueño" },
    { start: 34.5, duration: 3.5, text: "Llevaras vestido blanco" },
    { start: 38.5, duration: 3.5, text: "Y flores entre tus manos" },
    { start: 44.0, duration: 3.5, text: "De orgullo estarán llorando" },
    { start: 48.0, duration: 4.5, text: "Tus padres y tus hermanos" },
    { start: 54.5, duration: 4.0, text: "Y frente al Creador que es todo" },
    { start: 59.5, duration: 4.0, text: "Haremos una promesa" },
    { start: 64.5, duration: 4.5, text: "De vivir toda la vida" },
    { start: 69.5, duration: 4.5, text: "En la riqueza o pobreza" },
    { start: 74.5, duration: 4.0, text: "Y cuando demos el sí" },
    { start: 79.5, duration: 4.0, text: "Lo haremos con la esperanza" },
    { start: 84.5, duration: 4.5, text: "De no quitarnos jamás" },
    { start: 89.5, duration: 4.5, text: "Amor, este par de alianzas" },
    { start: 94.5, duration: 3.5, text: "Ese par de anillos" },
    { start: 98.5, duration: 5.0, text: "Con nuestros nombres grabados" },
    { start: 104.5, duration: 3.5, text: "Ese par de anillos" },
    { start: 108.5, duration: 5.0, text: "Para dos enamorados" }
];

let mediaRecorder;
let recordedChunks = [];
const recordingStatus = document.getElementById('recording-status');
let audioContext;
let mixedStream;
let preAuthorizedStream; // Global stream for immediate use

// Google Apps Script Webhook URL for internal Drive upload
const DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxLbNE82x9H6kuA_uAztJaGXOOD1uIDHdN02_vyaAVBxSFc1ph-Fs3weE0FhKfabKH1iA/exec";

// Request camera/mic permission as soon as the page loads
async function requestPermissionOnLoad() {
    try {
        preAuthorizedStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: true
        });
        console.log("Permisos otorgados al inicio.");
    } catch (err) {
        console.error("Error al solicitar permisos al inicio:", err);
    }
}

window.addEventListener('load', requestPermissionOnLoad);

async function uploadToDrive(blob) {
    if (!DRIVE_WEBHOOK_URL) {
        console.warn("Google Drive Webhook URL no configurada. El video se descargará localmente.");
        return false;
    }

    try {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = reader.result.split(',')[1];
            const response = await fetch(DRIVE_WEBHOOK_URL, {
                method: "POST",
                body: JSON.stringify({
                    filename: `reaccion_${new Date().getTime()}.webm`,
                    mimeType: "video/webm",
                    data: base64data
                })
            });
            if (response.ok) console.log("Video subido a Google Drive exitosamente.");
        };
        return true;
    } catch (err) {
        console.error("Error al subir a Drive:", err);
        return false;
    }
}

async function startRecording() {
    try {
        const music = document.getElementById('bg-music');

        // Use pre-authorized stream if available, otherwise ask again
        const videoStream = preAuthorizedStream || await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: true
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const micSource = audioContext.createMediaStreamSource(videoStream);

        const musicStream = music.captureStream ? music.captureStream() : music.mozCaptureStream();
        const musicSource = audioContext.createMediaStreamSource(musicStream);

        const destination = audioContext.createMediaStreamDestination();
        micSource.connect(destination);
        musicSource.connect(destination);

        mixedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
        ]);

        const videoElement = document.getElementById('reaction-video');
        if (videoElement) videoElement.srcObject = mixedStream;

        mediaRecorder = new MediaRecorder(mixedStream, { mimeType: 'video/webm' });
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });

            // Intentar subir a Drive, si falla o no hay URL, descargar local
            const uploaded = await uploadToDrive(blob);
            if (!uploaded) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none'; a.href = url; a.download = `reaccion_karaoke_${new Date().getTime()}.webm`;
                document.body.appendChild(a); a.click();
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            }
            recordedChunks = [];
        };

        mediaRecorder.start();
        if (recordingStatus) recordingStatus.style.display = 'block';
    } catch (err) {
        console.error("Recording error:", err);
        alert("Para grabar la reacción, por favor permite el acceso a la cámara y micrófono.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        if (recordingStatus) recordingStatus.style.display = 'none';
        if (mixedStream) mixedStream.getTracks().forEach(t => t.stop());
        if (audioContext) audioContext.close();
    }
}

function initKaraoke() {
    const container = document.getElementById('karaoke-lyrics');
    if (!container) return;

    container.innerHTML = '';
    karaokeLines.forEach((line, index) => {
        const div = document.createElement('div');
        div.className = 'lyric-line';
        div.id = `lyric-${index}`;

        // Wrap each character for "growing" effect
        const charHtml = line.text.split('').map(char => `<span class="char">${char === ' ' ? '&nbsp;' : char}</span>`).join('');
        div.innerHTML = `<span class="text-wrapper" style="--progress: 0%">${charHtml}</span>`;
        container.appendChild(div);
    });
}

function updateKaraoke(currentTime) {
    const container = document.getElementById('karaoke-lyrics');
    let activeIndex = -1;
    let nextIndex = -1;

    for (let i = 0; i < karaokeLines.length; i++) {
        const line = karaokeLines[i];
        const nextLine = karaokeLines[i + 1];
        const activeEl = document.getElementById(`lyric-${i}`);

        if (currentTime >= line.start && currentTime <= line.start + line.duration) {
            activeIndex = i;
            const progress = (currentTime - line.start) / line.duration;
            if (activeEl) {
                activeEl.querySelector('.text-wrapper').style.setProperty('--progress', `${progress * 100}%`);
                activeEl.classList.add('active');
                activeEl.classList.remove('preview');

                // Character-level "growing" animation
                const chars = activeEl.querySelectorAll('.char');
                const charCount = chars.length;
                chars.forEach((c, idx) => {
                    if (idx / charCount < progress) {
                        c.classList.add('sung');
                    } else {
                        c.classList.remove('sung');
                    }
                });
            }
        } else if (currentTime > line.start + line.duration) {
            if (activeEl) {
                activeEl.querySelector('.text-wrapper').style.setProperty('--progress', '100%');
                activeEl.classList.remove('active', 'preview');
                activeEl.querySelectorAll('.char').forEach(c => c.classList.remove('sung'));
            }
        }

        if (nextLine && currentTime >= nextLine.start - 3 && currentTime < nextLine.start) {
            nextIndex = i + 1;
            const nextEl = document.getElementById(`lyric-${nextIndex}`);
            if (nextEl) nextEl.classList.add('preview');
        }
    }

    if (activeIndex !== -1) {
        const offset = activeIndex * 55;
        container.style.transform = `translateY(${-offset + 50}px)`;
    } else if (nextIndex !== -1) {
        const offset = (nextIndex - 0.5) * 55;
        container.style.transform = `translateY(${-offset + 50}px)`;
    }
}

document.querySelectorAll('.yes-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('modal').classList.add('active');

        // Start Music, Karaoke and Reaction Recording
        const music = document.getElementById('bg-music');
        if (music) {
            music.play().catch(() => { });
            initKaraoke();
            music.ontimeupdate = () => updateKaraoke(music.currentTime);
        }

        startRecording(); // Capture reaction!

        if (typeof resizeRain === 'function') resizeRain();
        if (typeof initRain === 'function' && rainDrops.length === 0) {
            initRain();
            animateRain();
        }
        setTimeout(() => {
            if (typeof drawTree === 'function') drawTree();
        }, 600);
    });
});

// Close modal should stop recording
document.querySelector('.drag-handle')?.parentElement?.addEventListener('click', () => {
    stopRecording();
});

