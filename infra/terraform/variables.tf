variable "do_token" {
  description = "DigitalOcean personal access token"
  type        = string
  sensitive   = true
}

variable "cloudflare_token" {
  description = "Cloudflare API token with DNS edit permissions"
  type        = string
  sensitive   = true
}

variable "domain" {
  description = "Primary domain (e.g. grilyazh-omsk.ru)"
  type        = string
  default     = "grilyazh-omsk.ru"
}

variable "droplet_name" {
  description = "Droplet hostname"
  type        = string
  default     = "grilyage-prod"
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "fra1"
}

variable "droplet_size" {
  description = "Droplet plan"
  type        = string
  default     = "s-2vcpu-4gb-120gb-intel"
}

variable "ssh_key_ids" {
  description = "List of DigitalOcean SSH key IDs for root access"
  type        = list(string)
}

variable "project_dir" {
  description = "Remote project directory"
  type        = string
  default     = "/opt/grilyage"
}

variable "github_repo" {
  description = "GitHub repo URL for cloning (optional, used by cloud-init)"
  type        = string
  default     = ""
}
