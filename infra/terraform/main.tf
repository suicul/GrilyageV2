# Grilyage Delivery — Terraform configuration
# Manages VPS infrastructure: server, DNS, Docker, monitoring.
#
# Usage:
#   cd infra/terraform
#   terraform init
#   terraform plan
#   terraform apply

terraform {
  required_version = ">= 1.6"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.40"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.50"
    }
  }
}

# ─── Provider: DigitalOcean (VPS host) ───────────────────────────────────
provider "digitalocean" {
  token = var.do_token
}

# ─── Provider: Cloudflare (DNS) ─────────────────────────────────────────
provider "cloudflare" {
  api_token = var.cloudflare_token
}

# ─── VPS Droplet ─────────────────────────────────────────────────────────
resource "digitalocean_droplet" "grilyage" {
  name     = var.droplet_name
  region   = var.region
  size     = var.droplet_size
  image    = "ubuntu-24-04-x64"
  backups  = true
  monitoring = true
  tags     = ["grilyage", "production"]

  ssh_keys = var.ssh_key_ids

  # Docker and project setup via cloud-init
  user_data = templatefile("${path.module}/cloud-init.yml", {
    domain       = var.domain
    project_dir  = var.project_dir
    github_repo  = var.github_repo
  })
}

# ─── Cloudflare DNS Records ──────────────────────────────────────────────
resource "cloudflare_zone" "main" {
  zone = var.domain
}

resource "cloudflare_record" "root" {
  zone_id = cloudflare_zone.main.id
  name    = "@"
  type    = "A"
  value   = digitalocean_droplet.grilyage.ipv4_address
  proxied = true
}

resource "cloudflare_record" "www" {
  zone_id = cloudflare_zone.main.id
  name    = "www"
  type    = "CNAME"
  value   = var.domain
  proxied = true
}

resource "cloudflare_record" "api" {
  zone_id = cloudflare_zone.main.id
  name    = "api"
  type    = "A"
  value   = digitalocean_droplet.grilyage.ipv4_address
  proxied = false
}

# Outputs are defined in outputs.tf
