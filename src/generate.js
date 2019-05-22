const fs = require('fs');

const welcomePageUrl = "https://raw.githubusercontent.com/cloudkj/scar/master/src/welcome.html";

////////////////////////////////////////////////////////////////////////////////
// Resources
////////////////////////////////////////////////////////////////////////////////

const s3WWWBucketResource = [
    "S3WWWBucket",
    {
        "Type": "AWS::S3::Bucket",
        "Properties": {
            "BucketName": {
                "Fn::Join": [
                    "",
                    [
                        "www.",
                        {
                            "Ref": "Domain"
                        }
                    ]
                ]
            },
            "AccessControl": "PublicRead",
            "WebsiteConfiguration": {
                "IndexDocument": {
                    "Ref": "IndexFilename"
                },
                "ErrorDocument": {
                    "Ref": "ErrorFilename"
                }
            }
        }
    }
];

const s3RootBucketResource = [
    "S3RootBucket",
    {
        "Type": "AWS::S3::Bucket",
        "Properties": {
            "BucketName": {
                "Ref": "Domain"
            },
            "WebsiteConfiguration": {
                "RedirectAllRequestsTo": {
                    "HostName": {
                        "Fn::Join": [
                            "",
                            [
                                "www.",
                                {
                                    "Ref": "Domain"
                                }
                            ]
                        ]
                    },
                    "Protocol": "https"
                }
            }
        },
    }
];

const route53ZoneResource = [
    "Route53Zone",
    {
        "Type" : "AWS::Route53::HostedZone",
        "Properties" : {
            "Name": {
                "Ref": "Domain"
            }
        }
    }
];

const acmCertificateResource = [
    "ACMCertificate",
    {
        "Type": "AWS::CertificateManager::Certificate",
        "DependsOn": route53ZoneResource[0],
        "Properties": {
            "DomainName": {
                "Ref": "Domain"
            },
            "SubjectAlternativeNames": [
                {
                    "Fn::Join": [
                        "",
                        [
                            "*.",
                            {
                                "Ref": "Domain"
                            }
                        ]
                    ]
                }
            ],
            "ValidationMethod": "DNS"
        }
    }
];

const cloudFrontRootDistributionResource = [
    "CloudFrontRootDistribution",
    {
        "Type": "AWS::CloudFront::Distribution",
        "DependsOn": [s3RootBucketResource[0], acmCertificateResource[0]],
        "Properties": {
            "DistributionConfig": {
                "Enabled": true,
                "Origins": [
                    {
                        "Id": {
                            "Fn::Join": [
                                "",
                                [
                                    "S3-",
                                    {
                                        "Ref": "Domain"
                                    }
                                ]
                            ]
                        },
                        "DomainName": {
                            "Fn::Join": [
                                "",
                                [
                                    {
                                        "Ref": "Domain"
                                    },
                                    ".s3-website-",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".amazonaws.com"
                                ]
                            ]
                        },
                        "CustomOriginConfig": {
                            "OriginProtocolPolicy": "http-only",
                            "HTTPPort": 80,
                            "HTTPSPort": 443
                        }
                    }
                ],
                "DefaultCacheBehavior": {
                    "TargetOriginId": {
                        "Fn::Join": [
                            "",
                            [
                                "S3-",
                                {
                                    "Ref": "Domain"
                                }
                            ]
                        ]
                    },
                    "ViewerProtocolPolicy": "redirect-to-https",
                    "MinTTL": 0,
                    "ForwardedValues": {
                        "QueryString": false,
                        "Cookies": {
                            "Forward": "none"
                        }
                    }
                },
                "Aliases": [
                    {
                        "Ref": "Domain"
                    }
                ],
                "ViewerCertificate": {
                    "AcmCertificateArn": {
                        "Ref": acmCertificateResource[0]
                    },
                    "SslSupportMethod": "sni-only",
                    "MinimumProtocolVersion": "TLSv1.1_2016"
                }
            }
        }
    }
];

const cloudFrontWWWDistributionResource = [
    "CloudFrontWWWDistribution",
    {
        "Type": "AWS::CloudFront::Distribution",
        "DependsOn": [s3WWWBucketResource[0], acmCertificateResource[0]],
        "Properties": {
            "DistributionConfig": {
                "Enabled": true,
                "Origins": [
                    {
                        "Id": {
                            "Fn::Join": [
                                "",
                                [
                                    "S3-www.",
                                    {
                                        "Ref": "Domain"
                                    }
                                ]
                            ]
                        },
                        "DomainName": {
                            "Fn::Join": [
                                "",
                                [
                                    "www.",
                                    {
                                        "Ref": "Domain"
                                    },
                                    ".s3-website-",
                                    {
                                        "Ref": "AWS::Region"
                                    },
                                    ".amazonaws.com"
                                ]
                            ]
                        },
                        "CustomOriginConfig": {
                            "OriginProtocolPolicy": "http-only",
                            "HTTPPort": 80,
                            "HTTPSPort": 443
                        }
                    }
                ],
                "DefaultCacheBehavior": {
                    "TargetOriginId": {
                        "Fn::Join": [
                            "",
                            [
                                "S3-www.",
                                {
                                    "Ref": "Domain"
                                }
                            ]
                        ]
                    },
                    "ViewerProtocolPolicy": "redirect-to-https",
                    "MinTTL": 0,
                    "ForwardedValues": {
                        "QueryString": false,
                        "Cookies": {
                            "Forward": "none"
                        }
                    }
                },
                "Aliases": [
                    {
                        "Fn::Join": [
                            "",
                            [
                                "www.",
                                {
                                    "Ref": "Domain"
                                }
                            ]
                        ]
                    }
                ],
                "ViewerCertificate": {
                    "AcmCertificateArn": {
                        "Ref": acmCertificateResource[0]
                    },
                    "SslSupportMethod": "sni-only",
                    "MinimumProtocolVersion": "TLSv1.1_2016"
                }
            }
        }
    }
];

const route53RecordsResource = [
    "Route53Records",
    {
        "Type": "AWS::Route53::RecordSetGroup",
        "DependsOn": [
            route53ZoneResource[0],
            cloudFrontRootDistributionResource[0],
            cloudFrontWWWDistributionResource[0]
        ],
        "Properties": {
            "HostedZoneId": {
                "Ref": route53ZoneResource[0]
            },
            "RecordSets": [
                {
                    "Name": {
                        "Ref": "Domain"
                    },
                    "Type": "A",
                    "AliasTarget": {
                        "DNSName": {
                            "Fn::GetAtt": [
                                cloudFrontRootDistributionResource[0],
                                "DomainName"
                            ]
                        },
                        "EvaluateTargetHealth": false,
                        "HostedZoneId": "Z2FDTNDATAQYW2"
                    }
                },
                {
                    "Name": {
                        "Fn::Join": [
                            "",
                            [
                                "www.",
                                {
                                    "Ref": "Domain"
                                }
                            ]
                        ]
                    },
                    "Type": "A",
                    "AliasTarget": {
                        "DNSName": {
                            "Fn::GetAtt": [
                                cloudFrontWWWDistributionResource[0],
                                "DomainName"
                            ]
                        },
                        "EvaluateTargetHealth": false,
                        "HostedZoneId": "Z2FDTNDATAQYW2"
                    }
                }
            ]
        }
    }
];

const iamLambdaS3UploadRoleResource = [
    "IAMLambdaS3UploadRole",
    {
        "Type": "AWS::IAM::Role",
        "Properties": {
            "AssumeRolePolicyDocument": {
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"Service": ["lambda.amazonaws.com"]},
                    "Action": ["sts:AssumeRole"]
                }]
            },
            "Path": "/",
            "Policies": [{
                "PolicyName": "root",
                "PolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Action": [
                                "logs:*",
                                "s3:*",
                            ],
                            "Resource": "*"
                        }
                    ]
                }
            }]
        }
    }
];

const lambdaS3UploadResource = [
    "LambdaS3Upload",
    {
        "Type": "AWS::Lambda::Function",
        "Properties": {
            "Handler": "index.handler",
            "Runtime": "nodejs8.10",
            "Timeout": "30",
            "Role": { "Fn::GetAtt": [iamLambdaS3UploadRoleResource[0], "Arn"] }
        }
    }
];

const customS3UploadWelcomeResource = [
    "CustomS3UploadWelcome",
    {
        "Type": "Custom::S3UploadWelcome",
        "DependsOn": s3WWWBucketResource[0],
        "Properties": {
            "ServiceToken": { "Fn::GetAtt": [lambdaS3UploadResource[0], "Arn"] },
            "WelcomePageUrl": welcomePageUrl,
            "S3Bucket": {
                "Fn::Join": [
                    "",
                    [
                        "www.",
                        {
                            "Ref": "Domain"
                        }
                    ]
                ]
            },
            "S3Key": {
                "Ref": "IndexFilename"
            }
        }
    }
];

const resources = [
    s3WWWBucketResource,
    s3RootBucketResource,
    route53ZoneResource,
    acmCertificateResource,
    cloudFrontRootDistributionResource,
    cloudFrontWWWDistributionResource,
    route53RecordsResource,
    iamLambdaS3UploadRoleResource,
    lambdaS3UploadResource,
    customS3UploadWelcomeResource
];

////////////////////////////////////////////////////////////////////////////////
// Template
////////////////////////////////////////////////////////////////////////////////

const template = {
    "Parameters": {
        "Domain": {
            "Type": "String",
            "Description": "The apex or root domain of your website, e.g. example.com. Don't include any subdomain parts, such as www."
        },
        "IndexFilename": {
            "Type": "String",
            "Description": "The filename of the index document for the website.",
            "Default": "index.html"
        },
        "ErrorFilename": {
            "Type": "String",
            "Description": "The filename of the error document for the website.",
            "Default": "404.html"
        }
    },
    "Outputs": {
        "Route53NameServers": {
            "Description": "Name servers for Route 53 hosted zone",
            "Value": {
                "Fn::Join": [
                    "\n",
                    {
                        "Fn::GetAtt": [
                            route53ZoneResource[0],
                            "NameServers"
                        ]
                    }
                ]
            }
        }
    },
    "AWSTemplateFormatVersion": "2010-09-09"
};

////////////////////////////////////////////////////////////////////////////////
// Main
////////////////////////////////////////////////////////////////////////////////

fs.readFile('lambda/upload.js', 'utf8', (err, data) => {
    // Add inlined lambda function code
    lambdaS3UploadResource[1]["Properties"]["Code"] = {
        "ZipFile": data
    };

    template["Resources"] = {};
    resources.forEach(r => template["Resources"][r[0]] = r[1]);
    
    console.log(JSON.stringify(template));
});
