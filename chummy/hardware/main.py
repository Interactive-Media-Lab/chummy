# This script plays the songs with input from arrow and pause buttons
import pygame
import time
import os
import RPi.GPIO as GPIO
import requests

# Paths and Constants
MUSIC_DIR = "/home/suzen/Music" # Change to your pi zero music directory, e.g. /home/pi/Music
MT_MUSIC_DIR = "/music/mt"
DEBOUNCE_TIME = 0.5 # Time in seconds to ignore additional presses

# GPIO Pins
ENCODER_CLK = 23  # CLK pin of rotary encoder
ENCODER_DT = 24   # DT pin of rotary encoder
RED_BUTTON = 27 # Formerly used for forward button, now used to enable music therapy mode
GREEN_BUTTON = 22 # Formerly used for back button, now used to enable regular radio mode
PAUSE_BUTTON = 17 # Pause button, used to pause and resume playback

# Setup GPIO
# Pull-up resistor, reads high when untouched, drops to low when pressed
GPIO.setmode(GPIO.BCM)
GPIO.setup(ENCODER_CLK, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(ENCODER_DT, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(RED_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(GREEN_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(PAUSE_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Initialize Pygame Mixer
pygame.mixer.init()
pygame.mixer.music.set_volume(1.0) # Set volume to max

def load_music(music_directory):
    """Loads music channels and tracks from a directory."""
    channels = sorted([d for d in os.listdir(music_directory) if os.path.isdir(os.path.join(music_directory, d))])
    if not channels:
        raise RuntimeError(f"No channels (folders) found in the {music_directory}")
    
    tracks = {}
    for ch in channels:
        path = os.path.join(music_directory, ch)
        songs = sorted([f for f in os.listdir(path) if f.endswith('.mp3') or f.endswith('.wav')])
        if not songs:
            raise RuntimeError(f"No songs found in channel {ch} at {path}")
        tracks[ch] = songs
    return channels, tracks

# Load channels and songs
channels, tracks = load_music(MUSIC_DIR)

# Default State
mode = "radio"  # Default mode is radio, change to "mt" for music therapy mode
current_channel = 0 # index into channels
current_track = 0 # index into tracks
paused = False

# Debounce tracking
last_times = {"red": 0.0, "green": 0.0, "pause": 0.0, "clk": 0.0} # timestamp of the last accepted event for each control
last_states = {
    "red": GPIO.HIGH,
    "green": GPIO.HIGH,
    "pause": GPIO.HIGH,
    "clk": GPIO.input(ENCODER_CLK),
} # previous GPIO readings, so we can detect edges

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
    print(f"[Radio] Playing: {channels[current_channel]}: {tracks[channels[current_channel]][current_track]}")

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
        print("[Radio] Resumed")
    else:
        pygame.mixer.music.pause()
        print("[Radio] Paused")
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
    print("[Mode] -> Radio Mode")
    # Reload radio music
    channels, tracks = load_music(MUSIC_DIR)
    current_channel = 0
    current_track = 0
    play_current()  # Start playing the first song in radio mode

# Start playback
print(f"Found channels: {channels}\nStarting in RADIO mode")
play_current()

# Main loop to handle button presses and rotary encoder
try:
    while True:
        now = time.time()

        # Read all pins once
        red_state = GPIO.input(RED_BUTTON)
        green_state = GPIO.input(GREEN_BUTTON)
        pause_state = GPIO.input(PAUSE_BUTTON)
        clk_state = GPIO.input(ENCODER_CLK)
        dt_state = GPIO.input(ENCODER_DT)

        # Mode switching by switching a high -> low transition and enforce a debounce time
        if red_state == GPIO.LOW and last_states["red"] == GPIO.HIGH and now - last_times["red"] >= DEBOUNCE_TIME:
            switch_to_mt()
            last_times["red"] = now
        last_states["red"] = red_state

        if green_state == GPIO.LOW and last_states["green"] == GPIO.HIGH and now - last_times["green"] >= DEBOUNCE_TIME:
            switch_to_radio()
            last_times["green"] = now
        last_states["green"] = green_state

        # Radio mode controls
        if mode == "radio":
            # Rotary encoder rotation -> next/previous song
            if clk_state != last_states["clk"] and now - last_times["clk"] >= DEBOUNCE_TIME:
                if dt_state != clk_state: # means we turned in one direction (next channel)
                    switch_channel(+1)
                else:
                    switch_channel(-1) # means we turned in the other direction (previous channel)
                last_times["clk"] = now
            last_states["clk"] = clk_state

            # Pause/resume playback, uses the same high -> low transition debounce pattern
            if pause_state == GPIO.LOW and last_states["pause"] == GPIO.HIGH and now - last_times["pause"] >= DEBOUNCE_TIME:
                toggle_pause()
                last_times["pause"] = now
            last_states["pause"] = pause_state

            # Auto-advance when a track ends
            if not pygame.mixer.music.get_busy() and not paused:
                next_track()

        # Sleep a bit to avoid busy-waiting
        time.sleep(0.05)
  
except KeyboardInterrupt:
    print("Exiting...")
finally:
    GPIO.cleanup()
