provider "google" {
  project = "gffft-auth"
  region  = "us-central1"
  zone    = "us-central1-c"
}

terraform {
  backend "gcs" {
    bucket = "tfstate-035825c0e64e39d3"
    prefix = "terraform/state"
  }
}

resource "google_cloudbuild_trigger" "integration-tests" {
  project  = "gffft-auth"
  provider = google-beta

  name        = "integration-tests"
  description = "Runs all integration tests and reports Sonar analysis"

  github {
    owner = "teacurran"
    name  = "gffft-server"
    push {
      branch       = "^main$"
      invert_regex = true
    }
  }

  filename = "build/sonar.cloudbuild.yml"
}
