resource "google_cloudbuild_trigger" "deploy-trigger" {
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
