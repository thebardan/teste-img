#!/bin/bash
# Downloads Google Fonts TTFs for PDF embedding
FONTS_DIR="$(dirname "$0")/../assets/fonts"
mkdir -p "$FONTS_DIR"

FONTS=(
  "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf|Inter-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf|Montserrat-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf|PlayfairDisplay-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/oswald/Oswald%5Bwght%5D.ttf|Oswald-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf|Poppins-SemiBold.ttf"
  "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf|Poppins-Regular.ttf"
  "https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf|Nunito-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/sourcesans3/SourceSans3%5Bwght%5D.ttf|SourceSans3-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/opensans/OpenSans%5Bwght%5D.ttf|OpenSans-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf|DMSerifDisplay-Regular.ttf"
  "https://github.com/google/fonts/raw/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf|DMSans-Variable.ttf"
)

for entry in "${FONTS[@]}"; do
  IFS='|' read -r url filename <<< "$entry"
  if [ ! -f "$FONTS_DIR/$filename" ]; then
    echo "Downloading $filename..."
    curl -sL "$url" -o "$FONTS_DIR/$filename"
  else
    echo "$filename already exists, skipping."
  fi
done

echo "Done. Fonts in $FONTS_DIR"
