#!/bin/bash

# Define functions and their corresponding directories
FUNCTION_NAMES=("summarizeInterview" "setUpAnalysis" "questionThemeAnalysisForBatch")
FUNCTION_DIRS=("./summarizeInterview" "./setUpAnalysis" "./questionThemeAnalysisForBatch")

# Function to deploy a single function
deploy_single_function() {
    local env=$1
    local target_func=$2
    
    # Find the index of the target function
    local index=-1
    for i in "${!FUNCTION_NAMES[@]}"; do
        if [[ "${FUNCTION_NAMES[$i]}" == "$target_func" ]]; then
            index=$i
            break
        fi
    done
    
    if [[ $index -eq -1 ]]; then
        echo "Error: Function '$target_func' not found."
        echo "Available functions: ${FUNCTION_NAMES[*]}"
        exit 1
    fi
    
    echo "Deploying $target_func to $env environment"
    gcloud config configurations activate $env
    
    local dir=${FUNCTION_DIRS[$index]}
    echo "Deploying from $dir"
    (cd "$dir" && gcloud functions deploy "$target_func" \
        --gen2 \
        --runtime nodejs20 \
        --trigger-http \
        --region=us-central1 \
        --source . \
        --entry-point=$target_func \
        --timeout=3600)
}

# Function to deploy all functions
deploy_all_functions() {
    local env=$1
    echo "Deploying all functions to $env environment"
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
            --entry-point=$func \
            --timeout=3600)
    done
}

# Check if enough arguments were provided
if [ $# -lt 1 ] || [ $# -gt 2 ]; then
    echo "Usage:"
    echo "  Deploy all functions: $0 <environment>"
    echo "  Deploy single function: $0 <environment> <function-name>"
    echo "Environments: dev, staging, prod"
    echo "Available functions: ${FUNCTION_NAMES[*]}"
    exit 1
fi

# Get the environment from the first argument
ENV=$1

# Validate the environment
case $ENV in
    dev|staging|prod)
        if [ $# -eq 2 ]; then
            deploy_single_function $ENV $2
        else
            deploy_all_functions $ENV
        fi
        ;;
    *)
        echo "Invalid environment. Please use dev, staging, or prod."
        exit 1
        ;;
esac

echo "Deployment to $ENV complete"