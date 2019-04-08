#!/bin/bash
set -ex

# TODO: prompt for confirmation before each deletion command

if [ $# -ne 1 ]
then
    echo "Domain name required"
    exit -1
fi

awscli=aws

tempfile=$(mktemp)

domain=$1
echo "Cleaning up $domain"

# Delete S3 buckets
#$awscli s3api delete-bucket --bucket "$domain"
#$awscli s3api delete-bucket --bucket "www.$domain"

# Delete Route 53 hosted zone
# TODO: first, get all non-SOA, non-NS records with `list-resource-record-sets`
# second, delete records with `change-resource-records-sets`
# third, delete-hosted-zone

################################################################################
# Delete CloudFront distributions
################################################################################

delete_cloudfront_distribution() {
    local cloudfront_domain=$1

    # Find distribution id
    local cloudfront_id=$($awscli cloudfront list-distributions \
                              | jq -r ".[\"DistributionList\"][\"Items\"][] | select(.[\"Origins\"][\"Items\"][0][\"Id\"] == \"S3-$cloudfront_domain\") | .[\"Id\"]")
    if [[ ! $cloudfront_id ]]
    then
        echo "Distribution not found for $cloudfront_domain"
        return
    fi

    # Get ETag and prepare updated distribution config (with "Enabled"=false)
    local cloudfront_etag=$($awscli cloudfront get-distribution-config --id $cloudfront_id | jq -r '.["ETag"]')
    $awscli cloudfront get-distribution-config    --id $cloudfront_id \
        | jq -r '.["DistributionConfig"] | .["Enabled"] = false' > $tempfile

    # Update then wait to delete
    local cloudfront_etag=$($awscli cloudfront update-distribution --id $cloudfront_id --if-match $cloudfront_etag --distribution-config file://$tempfile \
                          | jq -r '.["ETag"]')
    $awscli cloudfront wait distribution-deployed --id $cloudfront_id
    echo "Waiting for updated distribution to be deployed..."
    $awscli cloudfront delete-distribution --id $cloudfront_id --if-match $cloudfront_etag
}

delete_cloudfront_distribution "$domain"
delete_cloudfront_distribution "www.$domain"

echo "Cleanup complete"
rm -f $tempfile
