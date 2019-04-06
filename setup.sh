#!/bin/bash
set -ex

if [ $# -ne 1 ]
then
    echo "Domain name required"
    exit -1
fi

domain=$1
echo "Setting up $domain"

# NOTE: assume that this script will be run INSIDE the docker container, in
# order to access temp file
awscli=aws
region=us-east-1

tempfile=$(mktemp)

################################################################################
# Create buckets
################################################################################
$awscli s3api create-bucket --bucket "$domain" --region $region
$awscli s3api create-bucket --bucket "www.$domain" --region $region

################################################################################
# Configure for static website hosting
################################################################################
cat > $tempfile <<EOF
{
  "RedirectAllRequestsTo": {
    "HostName": "www.$domain",
    "Protocol": "https"
  }
}
EOF
$awscli s3api put-bucket-website --bucket "$domain" --website-configuration file://$tempfile

cat > $tempfile <<EOF
{
  "IndexDocument": {
    "Suffix": "index.html"
  },
  "ErrorDocument": {
    "Key": "404.html"
  }
}
EOF
$awscli s3api put-bucket-website --bucket "www.$domain" --website-configuration file://$tempfile

################################################################################
# Configure bucket policy
################################################################################
cat > $tempfile <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadForGetBucketObjects",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::www.$domain/*"
        }
    ]
}
EOF
$awscli s3api put-bucket-policy --bucket "www.$domain" --policy file://$tempfile

################################################################################
# Create hosted zone
################################################################################
hosted_zone=$($awscli route53 create-hosted-zone --name "$domain" --caller-reference "$(date)")
hosted_zone_id=$(echo $hosted_zone | jq -r '.["HostedZone"]["Id"]')
name_servers=$(echo $hosted_zone | jq -r '.["DelegationSet"]["NameServers"][]')

################################################################################
# Request certificate
################################################################################
cert_arn=$($awscli acm request-certificate --domain-name "$domain" --subject-alternative-names "*.$domain" --validation-method DNS \
              | jq -r '.["CertificateArn"]')

################################################################################
# Wait for certificate validation record
################################################################################
validation_record=$($awscli acm describe-certificate --certificate-arn $cert_arn \
                        | jq -r -c '.["Certificate"]["DomainValidationOptions"][0]["ResourceRecord"]')
while [[ $validation_record == "null" ]]
do
    echo "Certificate validation record: $validation_record. Waiting to retry..."
    sleep 10
    validation_record=$($awscli acm describe-certificate --certificate-arn $cert_arn \
                            | jq -r -c '.["Certificate"]["DomainValidationOptions"][0]["ResourceRecord"]')
done
validation_record_name=$(echo $validation_record | jq -r '.["Name"]')
validation_record_type=$(echo $validation_record | jq -r '.["Type"]')
validation_record_value=$(echo $validation_record | jq -r '.["Value"]')

################################################################################
# Add certificate validation DNS records to hosted zone
################################################################################
cat > $tempfile <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "$validation_record_name",
        "Type": "$validation_record_type",
        "TTL": 60,
        "ResourceRecords": [
          {
            "Value": "$validation_record_value"
          }
        ]
      }
    }
  ]
}
EOF
$awscli route53 change-resource-record-sets --hosted-zone-id $hosted_zone_id --change-batch file://$tempfile

################################################################################
# Wait until certificate has been validated and issued
################################################################################
cert_status=$($awscli acm describe-certificate --certificate-arn $cert_arn \
                  | jq -r '.["Certificate"]["Status"]')
while [[ $cert_status != "ISSUED" ]]
do
    echo "Certificate status: $cert_status. Waiting..."
    echo "If your domain name is not registered with Route 53, please update"
    echo "the settings for your domain to these name servers: $name_servers"
    sleep 30
    cert_status=$($awscli acm describe-certificate --certificate-arn $cert_arn \
                  | jq -r '.["Certificate"]["Status"]')
done

################################################################################
# Create CloudFront distributions
################################################################################

create_cloudfront_distribution_config() {
    local cloudfront_domain=$1
    local caller_ref=$(date)
    cat > $tempfile <<EOF
{
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-$cloudfront_domain",
        "DomainName": "$cloudfront_domain.s3-website-$region.amazonaws.com",
        "CustomOriginConfig": {
          "OriginProtocolPolicy": "http-only",
          "HTTPPort": 80,
          "HTTPSPort": 443
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-$cloudfront_domain",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    }
  },
  "Aliases": {
    "Quantity": 1,
    "Items": ["$cloudfront_domain"]
  },
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": false,
    "ACMCertificateArn": "$cert_arn",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.1_2016"
  },
  "CallerReference": "$cloudfront_domain $caller_ref",
  "Comment": ""
}
EOF
}

create_cloudfront_distribution_config "$domain"
bare_distribution_domain=$($awscli cloudfront create-distribution --distribution-config file://$tempfile \
                       | jq -r '.["Distribution"]["DomainName"]')

create_cloudfront_distribution_config "www.$domain"
www_distribution_domain=$($awscli cloudfront create-distribution --distribution-config file://$tempfile \
                       | jq -r '.["Distribution"]["DomainName"]')

################################################################################
# Add distribution domain names to hosted zone
################################################################################
# Note: hosted zone id is the same for all CloudFront distribution alias targets
# See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-aliastarget.html
cat > $tempfile <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "$domain.",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "$bare_distribution_domain",
          "EvaluateTargetHealth": false,
          "HostedZoneId": "Z2FDTNDATAQYW2"
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.$domain.",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "$www_distribution_domain",
          "EvaluateTargetHealth": false,
          "HostedZoneId": "Z2FDTNDATAQYW2"
        }
      }
    }
  ]
}
EOF

$awscli route53 change-resource-record-sets --hosted-zone-id $hosted_zone_id --change-batch file://$tempfile

echo "Setup complete"
rm -f $tempfile
