#!/bin/bash

# Function to show help message (in bold)
show_help() {
  echo -e "\e[1mUsage: build.sh [OPTIONS]\e[0m"
  echo ""
  echo -e "\e[1mOptions:\e[0m"
  echo "  -u, --image-url        The URL of the container registry (default: value from package.json)"
  echo "  -p, --prefix-version   The prefix to add to the version (e.g., my-version)"
  echo "  -h, --help             Show this help message"
}

# Default values
IMAGE_URL=$(jq -r '.imageUrl' package.json)
VERSION=$(jq -r '.version' package.json)
PREFIX_VERSION=""
BASE_CONTEXT=${BASE_CONTEXT:-"/"}

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -u|--image-url) IMAGE_URL="$2"; shift ;;
    -p|--prefix-version) PREFIX_VERSION="$2"; shift ;;
    -h|--help) show_help; exit 0 ;;
    *) echo "Unknown parameter passed: $1"; show_help; exit 1 ;;
  esac
  shift
done

# Construct full version with prefix if provided
FULL_VERSION="${VERSION}${PREFIX_VERSION}"

# Generate git.properties file
echo -e "\e[1m➔ Generating git.properties file ⏳...\e[0m"

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo "Error: git is not installed. Please install git to generate git.properties."
  exit 1
fi

echo "git.branch=$(git rev-parse --abbrev-ref HEAD)" > git.properties \
    && echo "git.commit.id=$(git rev-parse HEAD)" >> git.properties \
    && echo "git.commit.id.short=$(git rev-parse --short HEAD)" >> git.properties \
    && echo "git.commit.time=$(git show -s --format=%ci HEAD)" >> git.properties \
    && echo "git.commit.user=$(git log -1 --pretty=%cn)" >> git.properties \
    && echo "git.total.commits=$(git rev-list --all --count)" >> git.properties \
    && echo "git.remote.origin.url=$(git config --get remote.origin.url)" >> git.properties \
    && echo "git.commit.message=$(git log -1 --pretty=%B)" >> git.properties

# Print git.properties file
echo -e "\e[1m➔ git.properties content:\e[0m"
cat git.properties

# Build the Docker image
echo -e "\e[1m➔ Building Docker image with tags: $IMAGE_URL:$FULL_VERSION and $IMAGE_URL:latest ⏳...\e[0m"
docker build -t "$IMAGE_URL:$FULL_VERSION" -t "$IMAGE_URL:latest" .
if [ $? -ne 0 ]; then
  echo 'Docker build failed';
  rm git.properties
  exit 1;
fi

# Push both tags to the container registry
echo -e "\e[1m➔ Pushing Docker images to Container Registry ⏳...\e[0m"
docker push "$IMAGE_URL:$FULL_VERSION"
if [ $? -ne 0 ]; then
  echo "Error: Docker push for version tag failed."
  rm git.properties
  exit 1
fi

docker push "$IMAGE_URL:latest"
if [ $? -ne 0 ]; then
  echo "Error: Docker push for latest tag failed."
  rm git.properties
  exit 1
fi

# Remove git.properties file
echo -e "\e[1m➔ Removing git.properties file ⏳...\e[0m"
rm git.properties

# Build and push successful
echo -e "\e[1m➔ Build and push successful: $IMAGE_URL:$FULL_VERSION and $IMAGE_URL:latest ✅\e[0m"
