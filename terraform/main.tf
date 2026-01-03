# Main Terraform Configuration

terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.0"
    }
  }
  backend "s3" {
    bucket = "terraform-state"
    key    = "dev/terraform.tfstate"
    region = "us-east-1"
    endpoint = "http://localhost:9000"
    force_path_style = true
    skip_credentials_validation = true
    skip_metadata_api_check = true
    skip_requesting_account_id = true
    use_lockfile = true
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

module "my_web_server" {
  source = "./modules/crge-vm-module"
  server_name   = "demo-server"
  environment   = "dev"
  external_port = 8090
}