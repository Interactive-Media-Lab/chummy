# This script plays the songs with keyboard input controls
import pygame
import time
import os
import requests

# Paths and Constants
MUSIC_DIR = "/home/farbod/Music/radio" # Change to your pi zero music directory, e.g. /home/pi/Music
MT_MUSIC_DIR = "/home/farbod/Music/mt"
DEBOUNCE_TIME = 0.5 # Time in seconds to ignore additional presses

# Keyboard Controls:
# Left/Right arrows: Change channels
# Space: Pause/Resume
# R: Radio mode
# M: Music therapy mode

# Initialize Pygame Mixer and display
pygame.init()
pygame.mixer.init()
pygame.mixer.music.set_volume(1.0) # Set volume to max

# Create a small window for keyboard input
screen = pygame.display.set_mode((400, 200))
pygame.display.set_caption("Chummy Music Player - Press keys to control")

def load_music(music_directory):
    """Loads music channels and tracks from a directory."""
    all_dirs = sorted([d for d in os.listdir(music_directory) if os.path.isdir(os.path.join(music_directory, d))])
    
    channels = []
    tracks = {}
    
    for ch in all_dirs:
        path = os.path.join(music_directory, ch)
        songs = sorted([f for f in os.listdir(path) if f.endswith('.mp3') or f.endswith('.wav')])
        if songs:  # Only include channels that have songs
            channels.append(ch)
            tracks[ch] = songs
    
    if not channels:
        raise RuntimeError(f"No channels with songs found in the {music_directory}")
    
    return channels, tracks

# Load channels and songs
channels, tracks = load_music(MUSIC_DIR)

# Default State
mode = "radio"  # Default mode is radio, change to "mt" for music therapy mode
current_channel = 0 # index into channels
current_track = 0 # index into tracks
paused = False

# Debounce tracking for keyboard events
last_times = {"left": 0.0, "right": 0.0, "space": 0.0, "r": 0.0, "m": 0.0}

# Helper functions
def get_current_path():
    ch = channels[current_channel]
    fname = tracks[ch][current_track]
    base_dir = MT_MUSIC_DIR if mode == "mt" else MUSIC_DIR
    return os.path.join(base_dir, ch, fname)

# Play the current song
def play_current():
    path = get_current_path()
    pygame.mixer.music.load(path)
    pygame.mixer.music.play()
    print(f"[{mode.upper()}] Playing: {channels[current_channel]}: {tracks[channels[current_channel]][current_track]}")

def next_track():
    global current_track
    tl = tracks[channels[current_channel]]
    current_track = (current_track + 1) % len(tl)  # Loop back to the first song
    play_current()

# Play the next or previous channel of songs
def switch_channel(delta):
    global current_channel, current_track
    current_channel = (current_channel + delta) % len(channels)  # Wrap around
    current_track = 0  # Reset to the first song in the new channel
    play_current()

# Pause or resume playback
def toggle_pause():
    global paused
    if paused:
        pygame.mixer.music.unpause()
        print(f"[{mode.upper()}] Resumed")
    else:
        pygame.mixer.music.pause()
        print(f"[{mode.upper()}] Paused")
    paused = not paused

# Mode switching logic
def switch_to_mt():
    global mode, channels, tracks, current_channel, current_track
    mode = "mt"
    pygame.mixer.music.stop()  # Stop current playback
    print("[Mode] -> Music Therapy Mode")

    try:
        # Check if the music therapy directory is empty or doesn't exist
        if not os.path.exists(MT_MUSIC_DIR) or not os.listdir(MT_MUSIC_DIR):
            print(f"{MT_MUSIC_DIR} is empty or not found. Copying music from USB via API...")
            
            # Use the API to copy files from USB to music therapy directory
            try:
                response = requests.post("http://localhost:5000/usb/copy")
                response.raise_for_status()  # Raise an exception for bad status codes
                data = response.json()
                print(f"API Response: {data.get('message', 'Files copied successfully')}")

            except requests.exceptions.RequestException as e:
                print(f"Error contacting server for file copy: {e}")
                # Handle error: maybe switch back to radio or play a default sound
                return
            except Exception as e:
                print(f"Error copying files via API: {e}")
                return

        # Load music from the music therapy directory
        channels, tracks = load_music(MT_MUSIC_DIR)
        current_channel = 0
        current_track = 0
        play_current()

    except Exception as e:
        print(f"An error occurred in music therapy mode: {e}")
        # Optionally, switch back to radio mode as a fallback
        switch_to_radio()

def switch_to_radio():
    global mode, channels, tracks, current_channel, current_track
    mode = "radio"
    pygame.mixer.music.stop()  # Stop current playback
    print("[Mode] -> Radio Mode")
    # Reload radio music
    channels, tracks = load_music(MUSIC_DIR)
    current_channel = 0
    current_track = 0
    play_current()  # Start playing the first song in radio mode

# Start playbook
print(f"Found channels: {channels}\nStarting in RADIO mode")
print("Controls:")
print("  Left/Right arrows: Change channels")
print("  Space: Pause/Resume")
print("  R: Radio mode")
print("  M: Music therapy mode")
print("  ESC or Q: Quit")
play_current()

# Main loop to handle keyboard events
try:
    clock = pygame.time.Clock()
    running = True
    
    while running:
        now = time.time()
        
        # Handle pygame events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                # Mode switching
                if event.key == pygame.K_r and now - last_times["r"] >= DEBOUNCE_TIME:
                    switch_to_radio()
                    last_times["r"] = now
                elif event.key == pygame.K_m and now - last_times["m"] >= DEBOUNCE_TIME:
                    switch_to_mt()
                    last_times["m"] = now
                
                # Channel switching (left/right arrows)
                elif event.key == pygame.K_LEFT and now - last_times["left"] >= DEBOUNCE_TIME:
                    switch_channel(-1)
                    last_times["left"] = now
                elif event.key == pygame.K_RIGHT and now - last_times["right"] >= DEBOUNCE_TIME:
                    switch_channel(+1)
                    last_times["right"] = now
                
                # Pause/resume (space)
                elif event.key == pygame.K_SPACE and now - last_times["space"] >= DEBOUNCE_TIME:
                    toggle_pause()
                    last_times["space"] = now
                
                # Quit (ESC or Q)
                elif event.key == pygame.K_ESCAPE or event.key == pygame.K_q:
                    running = False

        # Auto-advance when a track ends (only in radio mode when not paused)
        if mode == "radio" and not pygame.mixer.music.get_busy() and not paused:
            next_track()

        # Update display
        screen.fill((0, 0, 0))  # Clear screen with black
        pygame.display.flip()
        
        # Control frame rate
        clock.tick(30)
  
except KeyboardInterrupt:
    print("Exiting...")
finally:
    pygame.quit()
