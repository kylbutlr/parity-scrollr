"""Compatibility entry point for the pinned App Stylr icon generator."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    subprocess.run(["npm", "run", "styles"], cwd=ROOT, check=True)
