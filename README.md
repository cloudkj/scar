SCAR - a static website deployment stack
----------------------------------------

The **SCAR** stack is a deployment stack for static websites, using S3,
CloudFront, AWS CLI, and Route53.

TODO: include Dockerfile and setup for building image

TODO: manual step for going to AWS console IAM and creating a user with full
access permissions for S3, CloudFront, Route53, Certificate Manager. Access key
and secret key need to be noted for next step.

TODO: manual step for aws cli setup and configuration

Base command for invoking awscli:

    docker run --rm -itv $HOME/.aws:/root/.aws -v $PWD:/home/aws-cli kelvin/aws-cli aws

## Steps executed by script

S3 - create buckets, configure for website hosting, create bucket policy

Route 53 - create hosted zone for domains - (manual step to update name servers
if domain is not registed with AWS)

Certificate Manager - request a certificate for *.foo.com, choose DNS validation
and figure out how to automatically create CNAME record in Route 53 to
verify ownership of domain
