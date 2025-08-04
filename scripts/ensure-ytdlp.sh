#!/bin/bash

# Script to ensure yt-dlp is available
echo "Checking for yt-dlp..."

# Create bin directory if it doesn't exist
mkdir -p /app/bin

# Always download the Linux version to ensure compatibility
echo "Downloading yt-dlp Linux version..."
rm -f /app/bin/yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /app/bin/yt-dlp
chmod +x /app/bin/yt-dlp
echo "yt-dlp Linux version downloaded and made executable"

# Test yt-dlp
echo "Testing yt-dlp..."
/app/bin/yt-dlp --version

echo "yt-dlp setup complete!"
