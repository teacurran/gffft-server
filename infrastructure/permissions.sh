PROJECT_ID=gffft-auth

PROJECT_NUMBER=$(gcloud projects list \
  --format="value(projectNumber)" \
  --filter="projectId=${PROJECT_ID}")

gcloud iam service-accounts add-iam-policy-binding \
    ${PROJECT_ID}@appspot.gserviceaccount.com \
    --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
    --role=roles/iam.serviceAccountUser \
    --project=${PROJECT_ID}
