#!/bin/bash

# API configuration
API_KEY="0940f8e3-f5e4-4430-81ec-b48c6bbfda4c"
API_URL="https://ark.cn-beijing.volces.com/api/v3/images/generations"
OUTPUT_DIR="../public/images/monsters"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Monster prompts (Chinese ink painting style)
declare -a PROMPTS=(
    "Chinese ink painting style, cute little monster, black ink, simple lines, transparent background, game character design"
    "Chinese ink painting style, small demon, round shape, black ink, flowing lines, transparent background, game character design"
    "Chinese ink painting style, little creature, Q-style, black ink, smooth lines, transparent background, game character design"
    "Chinese ink painting style, small spirit, kawaii style, black ink, lively lines, transparent background, game character design"
    "Chinese ink painting style, tiny beast, cartoon style, black ink, vivid lines, transparent background, game character design"
)

echo "Starting to generate monster images..."
echo "======================================"

SUCCESS=0
FAIL=0

for i in {1..5}; do
    echo ""
    echo "Generating monster$i..."
    echo "Prompt: ${PROMPTS[$i-1]}"

    # Create JSON request body
    JSON_DATA=$(cat <<EOF
{
    "model": "doubao-seedream-3-0-t2i-250415",
    "prompt": "${PROMPTS[$i-1]}",
    "size": "512x512"
}
EOF
)

    # Call API
    echo "  Calling Doubao API..."
    RESPONSE=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -d "$JSON_DATA")

    # Extract image URL
    IMAGE_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | sed 's/"url":"//;s/"$//')

    if [ -n "$IMAGE_URL" ]; then
        # Download image
        echo "  Downloading image..."
        OUTPUT_FILE="$OUTPUT_DIR/monster$i.png"
        curl -s -o "$OUTPUT_FILE" "$IMAGE_URL"

        if [ -f "$OUTPUT_FILE" ]; then
            echo "  ✓ Success: $OUTPUT_FILE"
            ((SUCCESS++))
        else
            echo "  ✗ Failed to download"
            ((FAIL++))
        fi
    else
        echo "  ✗ Failed to get image URL"
        echo "  Response: $RESPONSE"
        ((FAIL++))
    fi

    # Add delay to avoid rate limiting
    if [ $i -lt 5 ]; then
        echo "  Waiting 2 seconds..."
        sleep 2
    fi
done

echo ""
echo "======================================"
echo "Generation complete!"
echo "Success: $SUCCESS images"
echo "Failed: $FAIL images"
echo ""
echo "Images saved to: $OUTPUT_DIR"
