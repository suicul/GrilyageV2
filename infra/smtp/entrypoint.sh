#!/bin/sh
set -e

# Generate SASL password map from env vars
echo "[smtp.yandex.ru]:465 ${SMTP_USER}:${SMTP_PASSWORD}" > /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db

# Create chroot log directory
mkdir -p /var/spool/postfix/var/log
chown postfix:postfix /var/spool/postfix/var/log

# Start Postfix (this creates /var/spool/postfix/etc/)
postfix start 2>&1

# Copy DNS resolver and TLS CA certs into chroot AFTER postfix start (start recreates the etc dir)
cp /etc/resolv.conf /var/spool/postfix/etc/resolv.conf 2>/dev/null || true
mkdir -p /var/spool/postfix/etc/ssl/certs
cp /etc/ssl/certs/ca-certificates.crt /var/spool/postfix/etc/ssl/certs/ca-certificates.crt 2>/dev/null || true

# Fallback: if maillog_file fails, use the entrypoint to just sleep and let docker healthcheck
# Tail log (from chroot perspective)
touch /var/spool/postfix/var/log/mail.log
chown postfix:postfix /var/spool/postfix/var/log/mail.log
chmod 644 /var/spool/postfix/var/log/mail.log

# Reload to pick up DNS changes
postfix reload 2>/dev/null || true

tail -F /var/spool/postfix/var/log/mail.log
