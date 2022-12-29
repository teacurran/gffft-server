provider "google" {
  project = "gffft-auth"
  region  = "us-central1"
  zone    = "us-central1-c"
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
