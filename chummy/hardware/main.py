# This script plays the songs with input from arrow and pause buttons
import pygame
import time
import os
import RPi.GPIO as GPIO
# Paths and Constants
MUSIC_DIR = "/home/pi/Music"
CHANNELS = [f"C{i}" for i in range(1, 9)] # C1 to C8
SONG_COUNT = 7 # Each channel has 7 songs
# Button GPIO Pins (BCM Mode)
PAUSE_BUTTON = 17 # Pin 11
FORWARD_BUTTON = 27 # Pin 13
BACK_BUTTON = 22 # Pin 15
# Setup GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(PAUSE_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(FORWARD_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(BACK_BUTTON, GPIO.IN, pull_up_down=GPIO.PUD_UP)
# Initialize Pygame Mixer
pygame.mixer.init()
pygame.mixer.music.set_volume(1.0) # Set volume to max
# Default State
current_channel = 0 # Index for C1 (CHANNELS[0] = "C1")
current_song = 1
paused = False

last_pause_state = GPIO.HIGH
last_forward_state = GPIO.HIGH
last_back_state = GPIO.HIGH
pause_debounce_time = 0.5 # Time in seconds to ignore additional presses

button_debounce_time = 0.5 # Time in seconds to ignore additional presses for forward and back
last_pause_press_time = 0 # The last time the PAUSE button was pressed
last_forward_press_time = 0 # The last time the FORWARD button was pressed
last_back_press_time = 0 # The last time the BACK button was pressed

def get_song_path():
    # Returns the full path of the current song.
    return os.path.join(MUSIC_DIR, CHANNELS[current_channel], f"Song{current_song}.mp3")

def play_song():
    # Loads and plays the selected song.
    pygame.mixer.music.load(get_song_path())
    pygame.mixer.music.play()
    print(f"Playing: {get_song_path()}")

# Initial Song Play
play_song()

# Button Handlers
def toggle_pause(channel):
    # Toggles play/pause when the pause button is pressed.
    global paused
    if paused:
        pygame.mixer.music.unpause()
        print("Resumed Playback")
    else:
        pygame.mixer.music.pause()
        print("Paused Playback")
    paused = not paused

def next_song(channel):
    # Plays the next song, wrapping around if needed.
    if not paused:
        global current_song
        current_song = current_song + 1 if current_song < SONG_COUNT else 1
        play_song()

def prev_song(channel):
    # Plays the previous song, wrapping around if needed.
    if not paused:
        global current_song
        current_song = current_song - 1 if current_song > 1 else SONG_COUNT
        play_song()

# This was an interrupt approach which worked initially, but no longer does, so polling is used for now
# Detect Button Presses
#GPIO.add_event_detect(PAUSE_BUTTON, GPIO.FALLING, callback=toggle_pause, bouncetime=300)
#GPIO.add_event_detect(FORWARD_BUTTON, GPIO.FALLING, callback=next_song, bouncetime=300)
#GPIO.add_event_detect(BACK_BUTTON, GPIO.FALLING, callback=prev_song, bouncetime=300)
# Keep Script Running
try:
    while True:
        # Check if the PAUSE button is pressed with debounce
        current_time = time.time()
        if GPIO.input(PAUSE_BUTTON) == GPIO.LOW and last_pause_state == GPIO.HIGH:
            if current_time - last_pause_press_time >= pause_debounce_time:
                toggle_pause(PAUSE_BUTTON)
                last_pause_press_time = current_time # Update the last press time
        last_pause_state = GPIO.input(PAUSE_BUTTON)
        # Check if the FORWARD button is pressed with debounce
        if GPIO.input(FORWARD_BUTTON) == GPIO.LOW and last_forward_state == GPIO.HIGH:
            if current_time - last_forward_press_time >= button_debounce_time:
                next_song(FORWARD_BUTTON)
                last_forward_press_time = current_time # Update the last press time
        last_forward_state = GPIO.input(FORWARD_BUTTON)
        # Check if the BACK button is pressed with debounce
        if GPIO.input(BACK_BUTTON) == GPIO.LOW and last_back_state == GPIO.HIGH:
            if current_time - last_back_press_time >=button_debounce_time:
                prev_song(BACK_BUTTON)
                last_back_press_time = current_time # Update the last press time
            last_back_state = GPIO.input(BACK_BUTTON)
            time.sleep(0.1) # Prevent high CPU usage
except KeyboardInterrupt:
    print("Exiting...")

    GPIO.cleanup()