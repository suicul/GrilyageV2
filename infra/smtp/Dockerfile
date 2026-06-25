FROM dockerhub.timeweb.cloud/library/debian:bookworm-slim

RUN apt-get update -qq && \
    apt-get install -y -qq postfix mailutils libsasl2-modules >/dev/null 2>&1 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY postfix-main.cf /etc/postfix/main.cf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD postfix status
