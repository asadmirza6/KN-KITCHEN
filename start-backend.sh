#!/bin/bash
# KN KITCHEN - Complete Startup Script for Linux/Mac
# For Windows, use the .bat file or run commands manually in separate terminals

echo "=========================================="
echo "KN KITCHEN - Full Stack Startup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on Windows (Git Bash)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo -e "${YELLOW}Windows detected. Use verify.bat for verification.${NC}"
fi

echo -e "${YELLOW}Starting Backend...${NC}"
echo "Command: python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000"
echo ""
echo "In a new terminal, run:"
echo -e "${YELLOW}cd frontend && npm run dev${NC}"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "=========================================="
echo ""

# Start backend
cd backend
python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
