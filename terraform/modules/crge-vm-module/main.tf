terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.0"
    }
  }
}

resource "docker_image" "nginx" {
  name         = "nginx:latest"
  keep_locally = false
}

resource "docker_container" "nginx_server" {
  image = docker_image.nginx.image_id
  name  = var.server_name
  ports {
    internal = 80
    external = var.external_port
  }
}