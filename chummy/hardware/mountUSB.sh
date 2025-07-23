#!/bin/bash

# This script mounts a USB drive to /mnt/usb on a Raspberry Pi.

# Exit immediately if a command exits with a non-zero status.
set -e

MOUNT_POINT="/mnt/usb"

# Find the first available block device that is not the main SD card (mmcblk0)
# and is not already mounted. We assume this is the USB drive.
DEVICE_PARTITION=$(lsblk -p -o NAME,MOUNTPOINT | grep -v "mmcblk" | grep -v "boot" | awk '$2=="" {print $1}' | head -n 1)

if [ -z "$DEVICE_PARTITION" ]; then
    echo "No unmounted USB partition found."
    # Check if it's already mounted at the target
    if mountpoint -q "$MOUNT_POINT"; then
        echo "A device is already mounted at $MOUNT_POINT."
        exit 0
    fi
    exit 1
fi

echo "Found USB partition: $DEVICE_PARTITION"

# Create the mount point if it doesn't exist
if [ ! -d "$MOUNT_POINT" ]; then
    echo "Creating mount point: $MOUNT_POINT"
    mkdir -p "$MOUNT_POINT"
fi

# Mount the device
echo "Mounting $DEVICE_PARTITION to $MOUNT_POINT"
mount "$DEVICE_PARTITION" "$MOUNT_POINT"

echo "USB drive mounted successfully at $MOUNT_POINT"

exit 0
