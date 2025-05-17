const fs = require('fs');

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
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": false,
                "BlockPublicPolicy": false,
                "IgnorePublicAcls": false,
                "RestrictPublicBuckets": false
            },
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

const s3WWWBucketPolicyResource = [
    "S3WWWBucketPolicy",
    {
        "Type": "AWS::S3::BucketPolicy",
        "Properties": {
            "Bucket": {
                "Ref": s3WWWBucketResource[0]
            },
            "PolicyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": "s3:GetObject",
                        "Resource": {
                            "Fn::Join": [
                                "",
                                [
                                    "arn:aws:s3:::www.",
                                    {
                                        "Ref": "Domain"
                                    },
                                    "/*"
                                ]
                            ]
                        }
                    }
                ]
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

const resources = [
    s3WWWBucketResource,
    s3WWWBucketPolicyResource,
    s3RootBucketResource,
    route53ZoneResource,
    acmCertificateResource,
    cloudFrontRootDistributionResource,
    cloudFrontWWWDistributionResource,
    route53RecordsResource,
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

template["Resources"] = {};
resources.forEach(r => template["Resources"][r[0]] = r[1]);
    
console.log(JSON.stringify(template));
