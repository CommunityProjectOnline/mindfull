// MindFull Audio System

// Ambient music playlist with display names
const musicTracks = [
    { file: 'sounds/orbiting-dreams.mp3', name: 'Orbiting Dreams' },
    { file: 'sounds/stellar-reflection.mp3', name: 'Stellar Reflection' },
    { file: 'sounds/weighless-fade.mp3', name: 'Weightless Fade' },
    { file: 'sounds/weightless-expanse.mp3', name: 'Weightless Expanse' }
];

let currentTrackIndex = 0;
let ambientMusic = null;
let isMuted = false;
let nowPlayingElement = null;
let trackNameElement = null;
let fadeOutTimer = null;

// Sound effects
const sounds = {
    connect: new Audio('sounds/click.mp3')
};

// Show track name with fade in
function showTrackName(trackName) {
    if (!trackNameElement || !nowPlayingElement) return;

    // Clear any existing fade out timer
    if (fadeOutTimer) {
        clearTimeout(fadeOutTimer);
    }

    // Update text and fade in
    trackNameElement.textContent = trackName;
    nowPlayingElement.classList.add('visible');

    // Fade out after 4 seconds
    fadeOutTimer = setTimeout(() => {
        nowPlayingElement.classList.remove('visible');
    }, 4000);
}

// Initialize ambient music
function initAmbientMusic() {
    ambientMusic = new Audio(musicTracks[currentTrackIndex].file);
    ambientMusic.volume = 0.3; // Start at 30% volume
    ambientMusic.loop = false; // We'll handle the loop ourselves to switch tracks

    // When track ends, play next one
    ambientMusic.addEventListener('ended', () => {
        playNextTrack();
    });

    // Check if user wants audio (load from localStorage)
    const savedMuteState = localStorage.getItem('mindful-audio-muted');
    if (savedMuteState === 'true') {
        isMuted = true;
    }
    // Don't auto-play - wait for user interaction
}

// Play next track in playlist
function playNextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length;
    const track = musicTracks[currentTrackIndex];
    ambientMusic.src = track.file;

    if (!isMuted) {
        ambientMusic.play().catch(err => {
            console.log('Audio play prevented:', err);
        });
        // Show track name when new song starts
        showTrackName(track.name);
    }
}

// Fade in music
function fadeInMusic() {
    ambientMusic.volume = 0;
    ambientMusic.play().catch(err => {
        console.log('Audio play prevented:', err);
        // Browser blocked autoplay - user needs to interact first
    });

    // Show track name when first song starts
    showTrackName(musicTracks[currentTrackIndex].name);

    let volume = 0;
    const fadeInterval = setInterval(() => {
        if (volume < 0.3) {
            volume += 0.01;
            ambientMusic.volume = Math.min(volume, 0.3);
        } else {
            clearInterval(fadeInterval);
        }
    }, 50);
}

// Toggle mute
function toggleMute() {
    isMuted = !isMuted;

    if (isMuted) {
        ambientMusic.pause();
        localStorage.setItem('mindful-audio-muted', 'true');
    } else {
        ambientMusic.play().catch(err => console.log('Play error:', err));
        localStorage.setItem('mindful-audio-muted', 'false');
    }

    updateMuteButton();
}

// Update mute button appearance
function updateMuteButton() {
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        muteBtn.title = isMuted ? 'Unmute' : 'Mute';
    }
}

// Play sound effect
function playSound(soundName) {
    if (!isMuted && sounds[soundName]) {
        sounds[soundName].currentTime = 0; // Reset to start
        sounds[soundName].volume = 0.5;
        sounds[soundName].play().catch(err => {
            console.log('Sound effect error:', err);
        });
    }
}

// Set volume
function setVolume(value) {
    if (ambientMusic) {
        ambientMusic.volume = value;
    }
}

// Start music on first user interaction
let musicStarted = false;

function startMusicOnInteraction() {
    if (!musicStarted && ambientMusic && !isMuted) {
        musicStarted = true;
        fadeInMusic();
        console.log('🎵 Music started!');
    }
}

// Skip to next track
function skipToNextTrack() {
    if (!ambientMusic) return;
    playNextTrack();
    updateCurrentTrackDisplay();
    console.log('⏭ Skipped to next track');
}

// Skip to previous track
function skipToPreviousTrack() {
    if (!ambientMusic) return;
    currentTrackIndex = (currentTrackIndex - 1 + musicTracks.length) % musicTracks.length;
    const track = musicTracks[currentTrackIndex];
    ambientMusic.src = track.file;

    if (!isMuted) {
        ambientMusic.play().catch(err => {
            console.log('Audio play prevented:', err);
        });
        showTrackName(track.name);
    }
    updateCurrentTrackDisplay();
    console.log('⏮ Skipped to previous track');
}

// Update current track display in settings
function updateCurrentTrackDisplay() {
    const currentTrackDisplay = document.getElementById('currentTrackDisplay');
    if (currentTrackDisplay && ambientMusic) {
        const track = musicTracks[currentTrackIndex];
        currentTrackDisplay.textContent = track.name;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Get now playing elements
    nowPlayingElement = document.getElementById('nowPlaying');
    trackNameElement = document.getElementById('trackName');

    initAmbientMusic();

    // Start music on ANY user interaction
    document.addEventListener('click', startMusicOnInteraction, { once: true });
    document.addEventListener('keydown', startMusicOnInteraction, { once: true });

    // Set up mute button if it exists
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            toggleMute();
            // If unmuting and music hasn't started, start it
            if (!musicStarted && !isMuted) {
                startMusicOnInteraction();
            }
        });
        updateMuteButton();
    }

    // Set up volume slider if it exists
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            setVolume(volume);
            if (volumeValue) {
                volumeValue.textContent = e.target.value + '%';
            }
        });
    }

    // Set up track control buttons
    const nextTrackBtn = document.getElementById('nextTrack');
    const prevTrackBtn = document.getElementById('prevTrack');

    if (nextTrackBtn) {
        nextTrackBtn.addEventListener('click', skipToNextTrack);
    }

    if (prevTrackBtn) {
        prevTrackBtn.addEventListener('click', skipToPreviousTrack);
    }

    // Set up settings panel
    const navSettings = document.getElementById('navSettings');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettings = document.getElementById('closeSettings');

    if (navSettings && settingsPanel) {
        navSettings.addEventListener('click', (e) => {
            e.preventDefault();
            settingsPanel.classList.toggle('hidden');
            updateCurrentTrackDisplay();
        });
    }

    if (closeSettings && settingsPanel) {
        closeSettings.addEventListener('click', () => {
            settingsPanel.classList.add('hidden');
        });
    }

    // Close settings when clicking outside
    if (settingsPanel) {
        document.addEventListener('click', (e) => {
            if (!settingsPanel.contains(e.target) &&
                e.target.id !== 'navSettings' &&
                !e.target.closest('#navSettings')) {
                settingsPanel.classList.add('hidden');
            }
        });
    }
});

// Export functions for use in other scripts
window.MindfulAudio = {
    playSound,
    toggleMute,
    setVolume
};

console.log('🎵 MindFull Audio System initialized');
