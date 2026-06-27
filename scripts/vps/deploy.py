"""
Grilyage Delivery -- Automated deploy script.
Connects to VPS via SSH, installs Docker, uploads project, builds & runs.
"""
import io
import os
import re
import sys
import tarfile
import time
import traceback
from pathlib import Path

from scripts.vps.vps_config import create_ssh_client, VPS_HOST, VPS_USER, VPS_PASSWORD
import paramiko

SERVER = VPS_HOST
USER = VPS_USER
PASSWORD = VPS_PASSWORD
PROJECT_DIR = Path(r"C:\DEV\GrilyageV2-main")
REMOTE_DIR = "/opt/grilyage"

# Files/dirs to EXCLUDE from upload
EXCLUDE_PATTERNS = [
    "node_modules", ".next", "dist", "uploads", "__pycache__",
    ".git", ".vscode", ".idea", "*.pyc", ".omo",
    "playwright-report", "test-results",
    "build", ".dart_tool", ".packages", ".pub-cache",
    "Pods", ".gradle", "android/app/build", "ios/build",
    ".symlinks", "DerivedData", "*.lock",
    "apps/mobile", "electron", "app-builder-bin",
    ".cache", ".opencode",
]

ENV_PLACEHOLDER_CHECK = ["SMS_RU_API_KEY"]


def log(msg):
    s = msg.encode("utf-8", errors="replace").decode("cp1251", errors="replace")
    sys.stdout.write(s + "\n")
    sys.stdout.flush()


def should_exclude(path: str) -> bool:
    rel = os.path.relpath(path, str(PROJECT_DIR))
    parts = rel.replace("\\", "/").split("/")
    for p in parts:
        for pattern in EXCLUDE_PATTERNS:
            if pattern.endswith("*") and p.startswith(pattern[:-1]):
                return True
            elif p == pattern:
                return True
    return False


def ssh_connect():
    log("[SSH] Connecting to %s@%s ..." % (USER, SERVER))
    client = create_ssh_client()
    log("[SSH] Connected")
    return client


def exec_or_fail(client, cmd, timeout=120):
    log("  $ %s" % cmd)
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out:
        for line in out.split("\n")[:30]:
            log("    | %s" % line[:200])
    if err and exit_status != 0:
        log("    ERR: %s" % err[:500])
    if exit_status != 0:
        raise RuntimeError("Command failed (exit %d): %s\n%s" % (exit_status, cmd, err[:300]))
    return out


def exec_quiet(client, cmd, timeout=120):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace").strip()
    return out, exit_status


def upload_project(client, sftp):
    log("[UPLOAD] Creating project archive (excludes node_modules, .next, dist...)")
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for root, dirs, files in os.walk(str(PROJECT_DIR)):
            dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
            for fname in files:
                fpath = os.path.join(root, fname)
                if should_exclude(fpath):
                    continue
                arcname = os.path.relpath(fpath, str(PROJECT_DIR)).replace("\\", "/")
                tar.add(fpath, arcname=arcname)
    buf.seek(0)
    size_mb = len(buf.getvalue()) / 1024 / 1024
    log("  Archive size: %.1f MB" % size_mb)

    exec_or_fail(client, "mkdir -p %s" % REMOTE_DIR)

    # Backup .env files from infra/ before cleanup
    backup_cmd = (
        'if [ -f %(dir)s/infra/.env ]; then '
        '  cp %(dir)s/infra/.env %(dir)s/.env.bak && echo "BACKED_UP"; '
        'else echo "NO_BACKUP"; fi'
    ) % {"dir": REMOTE_DIR}
    out, _ = exec_quiet(client, backup_cmd)
    if "BACKED_UP" in out:
        log("  Backed up infra/.env → .env.bak")
    else:
        log("  No infra/.env to back up (will try .env from root)")
        # Also try backing up .env from root
        exec_quiet(client,
            'if [ -f %(dir)s/.env ]; then cp %(dir)s/.env %(dir)s/.env.bak && echo "BACKED_UP_ROOT"; fi'
            % {"dir": REMOTE_DIR})

    # Clean old files (keep uploads dir)
    exec_quiet(client, "cd %s && find . -maxdepth 1 ! -name uploads ! -name .env.bak ! -name . -exec rm -rf {} + 2>/dev/null; true" % REMOTE_DIR)

    log("[UPLOAD] Transferring archive via SFTP ...")
    remote_tar = "%s/project.tar.gz" % REMOTE_DIR
    with sftp.open(remote_tar, "wb") as f:
        f.write(buf.getvalue())

    exec_or_fail(client, "cd %s && tar xzf project.tar.gz && rm project.tar.gz" % REMOTE_DIR)

    # Restore .env from backup
    exec_quiet(client,
        'if [ -f %(dir)s/.env.bak ] && [ ! -f %(dir)s/infra/.env ]; then '
        '  cp %(dir)s/.env.bak %(dir)s/infra/.env && echo "RESTORED"; '
        'elif [ -f %(dir)s/.env.bak ]; then '
        '  echo "ALREADY_EXISTS"; '
        'else echo "NO_BACKUP"; fi'
        % {"dir": REMOTE_DIR})
    log("  Restored .env from backup (if present)")

    log("[UPLOAD] Done")


def ensure_docker(client):
    log("[DOCKER] Checking ...")
    out, code = exec_quiet(client, "docker --version 2>/dev/null; echo EXIT:$?", timeout=30)
    if "EXIT:0" not in out:
        log("[DOCKER] Not found. Installing ...")
        exec_or_fail(client, "apt-get update -qq && apt-get install -y -qq ca-certificates curl")
        exec_or_fail(client, "install -m 0755 -d /etc/apt/keyrings")
        exec_or_fail(client, "curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc")
        exec_or_fail(client, 'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null')
        exec_or_fail(client, "apt-get update -qq && apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin")
        exec_or_fail(client, "systemctl enable docker && systemctl start docker")
        log("[DOCKER] Installed")
    else:
        log("[DOCKER] Already installed")

    exec_or_fail(client, "docker compose version")
    log("[DOCKER] Compose ready")


def validate_env():
    env_path = PROJECT_DIR / ".env.production"
    if not env_path.exists():
        log("[ERROR] .env.production not found")
        sys.exit(1)
    content = env_path.read_text(encoding="utf-8")
    for key in ENV_PLACEHOLDER_CHECK:
        m = re.search(r"^%s=(.+)$" % re.escape(key), content, re.MULTILINE)
        if m and (not m.group(1).strip() or "CHANGE_ME" in m.group(1)):
            log("[ERROR] %s is empty or has placeholder in .env.production" % key)
            sys.exit(1)
    log("[ENV] Validated")


def main():
    validate_env()

    client = ssh_connect()
    try:
        # 1. Install Docker
        ensure_docker(client)

        # 2. Upload project
        sftp = client.open_sftp()
        try:
            upload_project(client, sftp)
        finally:
            sftp.close()

        # 3. .env is backed up and restored in upload_project()

        # 4. Build Docker images
        log("[BUILD] Building images (may take 5-10 min)...")
        exec_or_fail(client, "cd %s/infra && docker compose build --pull" % REMOTE_DIR, timeout=600)

        # 5. Start services
        log("[START] Starting containers ...")
        exec_or_fail(client, "cd %s/infra && docker compose up -d" % REMOTE_DIR, timeout=120)

        # 6. Run Prisma migrations (proper production command)
        log("[DB] Running prisma migrate deploy ...")
        exec_or_fail(client, "cd %s/infra && docker compose run --rm api npx prisma migrate deploy" % REMOTE_DIR, timeout=120)

        # 7. Seed DB (idempotent)
        log("[DB] Seeding ...")
        exec_or_fail(client, "cd %s/infra && docker compose run --rm api npx prisma db seed" % REMOTE_DIR, timeout=120)

        # 8. Restart API
        exec_or_fail(client, "cd %s/infra && docker compose up -d api" % REMOTE_DIR)

        # 9. Verify
        log("[HEALTH] Waiting for services ...")
        time.sleep(10)
        # API healthcheck via docker exec (port 4000 not mapped to host)
        api_health, _ = exec_quiet(client, "docker exec grilyage-api-1 sh -c 'wget -q -O- http://localhost:4000/health' 2>/dev/null || echo 'FAIL'", timeout=15)
        health = "OK" if '"status":"ok"' in api_health else "FAIL"
        # Web via docker inspect (status check)
        web_status, _ = exec_quiet(client, "docker inspect grilyage-web-1 --format '{{.State.Health.Status}}' 2>/dev/null || echo 'unknown'", timeout=15)
        nginx_code, _ = exec_quiet(client, "curl -s -o /dev/null -w '%%{http_code}' http://localhost:80/", timeout=15)

        log("=" * 50)
        log("DEPLOY COMPLETE!")
        log("=" * 50)
        log("  API  health: %s" % health)
        log("  Web  status: %s" % web_status)
        log("  Nginx status: %s" % nginx_code)
        log("")
        log("  Site: https://grillyage.ru")
        log("  API:  https://grillyage.ru/api/v1/")
        log("")
        log("  Logs: ssh root@%s 'cd %s/infra && docker compose logs -f'" % (SERVER, REMOTE_DIR))
        log("=" * 50)

    except Exception:
        traceback.print_exc()
        log("\n[FAIL] Deploy failed")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
