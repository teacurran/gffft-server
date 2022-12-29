provider "google" {
  project = "gffft-auth"
  region  = "us-central1"
  zone    = "us-central1-c"
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

resource "google_storage_bucket" "terraform-state" {
  name          = "tfstate-${random_id.bucket_suffix.hex}"
  force_destroy = false
  location      = "US"
  storage_class = "STANDARD"
  versioning {
    enabled = true
  }
}
