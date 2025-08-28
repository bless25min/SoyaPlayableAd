#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Starting Robust Build Process ---"

# --- 1. Re-create package.json and install dependencies ---
echo "1. Installing build dependencies..."
# Create a minimal package.json
echo '{
  "description": "Build dependencies for SoyaPlayableAd",
  "devDependencies": {
    "esbuild": "^0.14.0",
    "terser": "^5.0.0",
    "html-minifier-terser": "^7.0.0"
  }
}' > package.json

# Run npm install
npm install

# --- 2. Ensure executables are present and have correct permissions ---
# This is the critical step to work around the environment issue.
echo "2. Verifying and setting permissions for build tools..."
if [ -f "./node_modules/.bin/esbuild" ]; then
    chmod +x ./node_modules/.bin/esbuild
    echo "esbuild executable found and permissions set."
else
    echo "ERROR: esbuild binary not found in node_modules/.bin!"
    exit 1
fi

if [ -f "./node_modules/.bin/terser" ]; then
    chmod +x ./node_modules/.bin/terser
    echo "terser executable found and permissions set."
else
    echo "ERROR: terser binary not found in node_modules/.bin!"
    exit 1
fi

# --- 3. Run the build process using direct paths ---
echo "3. Executing build steps..."

DIST_DIR="dist"
SRC_DIR="src"
JS_DIR="$SRC_DIR/js"
CSS_DIR="$SRC_DIR/css"
DATA_FILE="XAUUSD_M15.csv"

# Create dist directory
mkdir -p $DIST_DIR

# Step 3a: Bundle JS
echo "   - Bundling JavaScript..."
./node_modules/.bin/esbuild "$JS_DIR/security.js" --bundle --outfile="$DIST_DIR/bundle.js"

# Step 3b: Minify & Obfuscate JS
echo "   - Obfuscating JavaScript..."
./node_modules/.bin/terser "$DIST_DIR/bundle.js" --compress drop_console=true,dead_code=true --mangle toplevel=true -o "$DIST_DIR/bundle.min.js"

# Step 3c: Inject into HTML (using the previously created inject.js script)
echo "   - Finalizing HTML..."
node inject.js

# Step 3d: Create Cloudflare headers file
echo "   - Creating Cloudflare headers file..."
cat <<EOF > "$DIST_DIR/_headers"
/*
  X-Frame-Options: SAMEORIGIN
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-XSS-Protection: 1; mode=block
*/
EOF

echo "--- Build Process Completed Successfully! ---"
echo "The protected application is ready in the '$DIST_DIR' directory."

echo "--- Verifying dist directory contents before exiting: ---"
ls -lR $DIST_DIR
