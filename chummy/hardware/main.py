# This script plays songs in Radio (ChummyC*) and MT (MT*) modes with button & encoder controls
import pygame
import time
import os
import RPi.GPIO as GPIO
import shutil

# Paths and Constants
MUSIC_DIR       = "/home/suzen/Music"
USB_MUSIC_DIR   = "/media/suzen/ESD-USB"
DEBOUNCE_TIME   = 0.5  # Time in seconds to ignore additional presses

# GPIO pin assignments
ENCODER_CLK  = 23
ENCODER_DT   = 24
RED_BUTTON   = 27  # Mode switch / Next in MT
GREEN_BUTTON = 22  # Back to Radio
PAUSE_BUTTON = 17  # Pause/Resume

# Setup GPIO
# Pull-up resistors, reads high when touched, drops to low when pressed
GPIO.setmode(GPIO.BCM)
for pin in (ENCODER_CLK, ENCODER_DT, RED_BUTTON, GREEN_BUTTON, PAUSE_BUTTON):
    GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Initialize Pygame mixer
pygame.mixer.init()
pygame.mixer.music.set_volume(1.0)

# Helper to load channels/tracks
def load_music(directory, prefix=None):
    """
    Returns (channels_list, tracks_dict) for subfolders starting with prefix
    """
    channels = sorted([
        d for d in os.listdir(directory)
        if os.path.isdir(os.path.join(directory, d)) and (prefix is None or d.startswith(prefix))
    ])
    if not channels:
        raise RuntimeError(f"No folders in {directory} matching prefix '{prefix}'")
    tracks = {}
    for ch in channels:
        folder_path = os.path.join(directory, ch)
        songs = sorted([f for f in os.listdir(folder_path) if f.lower().endswith(('.mp3','.wav'))])
        if not songs:
            raise RuntimeError(f"No audio files in {folder_path}")
        tracks[ch] = songs
    return channels, tracks

# Radio Playback Functions
radio_channels, radio_tracks = [], {}
current_channel = 0
current_track   = 0

def play_current_radio():
    ch = radio_channels[current_channel]
    song = radio_tracks[ch][current_track]
    path = os.path.join(MUSIC_DIR, ch, song)
    pygame.mixer.music.load(path)
    pygame.mixer.music.play()
    print(f"[Radio] {ch}: {song}")

def next_radio_track():
    global current_track
    current_track = (current_track + 1) % len(radio_tracks[radio_channels[current_channel]])
    play_current_radio()

def switch_radio_channel(delta):
    global current_channel, current_track
    current_channel = (current_channel + delta) % len(radio_channels)
    current_track   = 0
    play_current_radio()

# MT Playback Functions
mt_channels, mt_tracks = [], {}
mt_folder_index = 0
mt_song_index   = -1
mt_playing      = False

def play_next_mt():
    global mt_folder_index, mt_song_index, mt_playing, paused
    folder = mt_channels[mt_folder_index]
    songs  = mt_tracks[folder]
    mt_song_index += 1
    if mt_song_index >= len(songs):
        mt_song_index    = 0
        mt_folder_index = (mt_folder_index + 1) % len(mt_channels)
        folder = mt_channels[mt_folder_index]
        songs  = mt_tracks[folder]
    path = os.path.join(MUSIC_DIR, folder, songs[mt_song_index])
    pygame.mixer.music.load(path)
    pygame.mixer.music.play()
    print(f"[MT] {folder}: {songs[mt_song_index]}")
    mt_playing = True
    paused     = False

# Shared Controls
paused = False
def toggle_pause():
    global paused
    if paused:
        pygame.mixer.music.unpause()
        print("[Paused] Resumed")
    else:
        pygame.mixer.music.pause()
        print("[Paused] Paused")
    paused = not paused

# Initial Load
mode = 'radio'
try:
    radio_channels, radio_tracks = load_music(MUSIC_DIR, prefix='ChummyC')
    print(f"Found Radio channels: {radio_channels}")
    play_current_radio()
except Exception as e:
    print(f"Error loading radio: {e}")
    exit(1)

# Debounce state
last_times  = {'red':0.0,'green':0.0,'pause':0.0,'clk':0.0}
last_states = {'red':GPIO.HIGH,'green':GPIO.HIGH,'pause':GPIO.HIGH,'clk':GPIO.input(ENCODER_CLK)}

# Main Loop
try:
    clock = pygame.time.Clock()
    running = True
    
    while running:
        now = time.time()
        r   = GPIO.input(RED_BUTTON)
        g   = GPIO.input(GREEN_BUTTON)
        p   = GPIO.input(PAUSE_BUTTON)
        clk = GPIO.input(ENCODER_CLK)
        dt  = GPIO.input(ENCODER_DT)

        # RED button: switch mode or next MT --
        if r==GPIO.LOW and last_states['red']==GPIO.HIGH and now-last_times['red']>=DEBOUNCE_TIME:
            if mode == 'radio':
                # Switch into MT
                mode = 'mt'
                pygame.mixer.music.stop()
                print("[Mode] -> MT")
                # Copy new MT from USB
                copied = False
                for d in os.listdir(USB_MUSIC_DIR):
                    if d.startswith('MT'):
                        src = os.path.join(USB_MUSIC_DIR, d)
                        dst = os.path.join(MUSIC_DIR, d)
                        if not os.path.exists(dst) or not os.listdir(dst):
                            shutil.copytree(src, dst, dirs_exist_ok=True)
                            copied = True
                if not copied:
                    print("No new MT on USB, skipped copy")
                # Load MT channels
                try:
                    mt_channels, mt_tracks = load_music(MUSIC_DIR, prefix='MT')
                except Exception as e:
                    print(f"MT load error: {e}")
                    mode = 'radio'
                    continue
                mt_folder_index = 0
                mt_song_index   = -1
                mt_playing      = False
                paused          = False
                # Play first MT track
                play_next_mt()
            elif mode == 'mt':
                # Next MT
                play_next_mt()
            last_times['red'] = now
        last_states['red'] = r

        # GREEN button: back to Radio
        if g==GPIO.LOW and last_states['green']==GPIO.HIGH and now-last_times['green']>=DEBOUNCE_TIME:
            mode = 'radio'
            print("[Mode] -> Radio")
            current_channel = 0
            current_track   = 0
            play_current_radio()
            last_times['green'] = now
        last_states['green'] = g

        # GLOBAL Pause/Resume
        if p==GPIO.LOW and last_states['pause']==GPIO.HIGH and now-last_times['pause']>=DEBOUNCE_TIME:
            toggle_pause()
            last_times['pause'] = now
        last_states['pause'] = p

        # Rotary & Auto-advance
        if mode == 'radio':
            # Encoder: change channel
            if clk!=last_states['clk'] and now-last_times['clk']>=DEBOUNCE_TIME:
                if dt!=clk:
                    switch_radio_channel(+1)
                else:
                    switch_radio_channel(-1)
                last_times['clk'] = now
            last_states['clk'] = clk
            # End-of-track -> next
            if not pygame.mixer.music.get_busy() and not paused:
                next_radio_track()

        else:  # MT mode
            # End-of-track -> next MT
            if mt_playing and not pygame.mixer.music.get_busy() and not paused:
                play_next_mt()

        time.sleep(0.05)

except KeyboardInterrupt:
    print("Exiting…")
finally:
    pygame.quit()
