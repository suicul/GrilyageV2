"""
Grilyage Delivery — Deploy wrapper.
Redirects to scripts/vps/deploy.py for the actual implementation.

Usage:
    python deploy.py
"""
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from scripts.vps.deploy import main

if __name__ == "__main__":
    main()
