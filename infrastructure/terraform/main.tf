provider "google" {
  project = "gffft-auth"
  region  = "us-central1"
  zone    = "us-central1-c"
}

resource "google_cloudbuild_trigger" "deploy-trigger" {
  project  = "gffft-auth"
  provider = google-beta

  name        = "API Deploy"
  description = "Deploys API services to app engine"

  github {
    owner = "teacurran"
    name  = "gffft-server"
    push {
      branch = "master"
    }
  }

  filename = "build/deploy.cloudbuild.yml"
}
