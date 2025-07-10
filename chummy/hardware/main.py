# This script plays the songs with input from arrow and pause buttons
import pygame
import time
import os
import RPi.GPIO as GPIO

# Paths and Constants
MUSIC_DIR = "/home/suzen/Music" # Change to your pi zero music directory, e.g. /home/pi/Music
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

# Load channels and songs
channels = sorted([d for d in os.listdir(MUSIC_DIR) if os.path.isdir(os.path.join(MUSIC_DIR, d))])
if not channels:
    raise RuntimeError(f"No channels (folders) found in the {MUSIC_DIR}")
# Map each channel folders to a list of songs
tracks = {}
for ch in channels:
    path = os.path.join(MUSIC_DIR, ch)
    songs = sorted([f for f in os.listdir(path) if f.endswith('.mp3') or f.endswith('.wav')])
    if not songs:
        raise RuntimeError(f"No songs found in channel {ch} at {path}")
    tracks[ch] = songs

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
    return os.path.join(MUSIC_DIR, ch, fname)

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
    global mode
    mode = "mt"
    pygame.mixer.music.stop()  # Stop current playback
    print("[Mode] -> Music Therapy Mode")

    '''
    @Farbod You can start/edit your code from here regarding music therapy mode (when red button is pressed)
    
    
    '''

def switch_to_radio():
    global mode
    mode = "radio"
    print("[Mode] -> Radio Mode")
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
