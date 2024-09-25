#!/bin/bash

# Define functions and their corresponding directories
FUNCTION_NAMES=("summarizeInterview" "setUpAnalysis")
FUNCTION_DIRS=("./summarizeInterview" "./setUpAnalysis")

# Function to deploy to a specific environment
deploy_to_env() {
    local env=$1
    echo "Deploying to $env environment"
    gcloud config configurations activate $env

    for i in "${!FUNCTION_NAMES[@]}"; do
        local func=${FUNCTION_NAMES[$i]}
        local dir=${FUNCTION_DIRS[$i]}
        echo "Deploying $func from $dir"
        (cd "$dir" && gcloud functions deploy "$func" \
            --gen2 \
            --runtime nodejs20 \
            --trigger-http \
            --region=us-central1 \
            --source . \
            --entry-point=$func)
    done
}

# Check if an environment argument was provided
if [ $# -eq 0 ]; then
    echo "Please provide an environment (dev, staging, or prod) as an argument."
    echo "Usage: $0 <environment>"
    exit 1
fi

# Get the environment from the first argument
ENV=$1

# Validate the environment
case $ENV in
    dev|staging|prod)
        deploy_to_env $ENV
        ;;
    *)
        echo "Invalid environment. Please use dev, staging, or prod."
        exit 1
        ;;
esac

echo "Deployment to $ENV complete"