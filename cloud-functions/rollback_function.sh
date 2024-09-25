#!/bin/bash

REGION="us-central1"

rollback_function() {
    local function_name=$1

    echo "Fetching versions for function: $function_name in region $REGION"
    versions=$(gcloud functions versions list $function_name --region=$REGION --format="value(name)" --sort-by="~createTime" --limit=2)

    if [ -z "$versions" ]; then
        echo "No versions found for function $function_name"
        exit 1
    fi

    read -r current_version previous_version <<< $versions

    if [ -z "$previous_version" ]; then
        echo "No previous version found to rollback to for function $function_name"
        exit 1
    fi

    echo "Current version: $current_version"
    echo "Rolling back to previous version: $previous_version"

    gcloud functions versions update $previous_version --function=$function_name --region=$REGION

    if [ $? -eq 0 ]; then
        echo "Successfully rolled back $function_name to version $previous_version in $REGION"
    else
        echo "Failed to rollback $function_name in $REGION"
        exit 1
    fi
}

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <function-name>"
    echo "Note: This script will always use the us-central1 region"
    exit 1
fi

rollback_function $1