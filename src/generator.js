const fs = require('fs');

////////////////////////////////////////////////////////////////////////////////
// Resources
////////////////////////////////////////////////////////////////////////////////

const roleResourceName = "MyLambdaExecutionRole";
const lambdaResourceName = "MyFunc";
const customS3UploadWelcomeResourceName = "CustomS3UploadWelcome";

const roleResource = {
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
};

const lambdaResource = {
    "Type": "AWS::Lambda::Function",
    "Properties": {
        "Handler": "index.handler",
        "Runtime": "nodejs8.10",
        "Timeout": "30",
        "Role": { "Fn::GetAtt": [roleResourceName, "Arn"] }
    }
};

const customS3UploadWelcomeResource = {
    "Type": "Custom::S3UploadWelcome",
    "Properties": {
        "ServiceToken": { "Fn::GetAtt": [lambdaResourceName, "Arn"] },
        "WelcomePageUrl": { "Ref": "Url" },
        "S3Bucket": { "Ref": "Bucket" },
        "S3Key": { "Ref": "Key" }
    }
}

////////////////////////////////////////////////////////////////////////////////
// Template
////////////////////////////////////////////////////////////////////////////////

const template = {
    "Parameters": {
        "Url": {
            "Type": "String"
        },
        "Bucket": {
            "Type": "String"
        },
        "Key": {
            "Type": "String"
        }
    },
    "AWSTemplateFormatVersion": "2010-09-09"
};

fs.readFile('lambda/upload.js', 'utf8', (err, data) => {
    lambdaResource["Properties"]["Code"] = {
        "ZipFile": data
    };
    template["Resources"] = {};
    template["Resources"][roleResourceName] = roleResource;
    template["Resources"][lambdaResourceName] = lambdaResource;
    template["Resources"][customS3UploadWelcomeResourceName] = customS3UploadWelcomeResource;
    
    console.log(JSON.stringify(template));
});
