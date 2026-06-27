output "vps_ip" {
  value       = digitalocean_droplet.grilyage.ipv4_address
  description = "Public IP of the VPS"
}

output "domain" {
  value       = var.domain
  description = "Primary domain"
}

output "api_url" {
  value       = "https://api.${var.domain}"
  description = "API base URL"
}

output "site_url" {
  value       = "https://${var.domain}"
  description = "Site URL"
}
