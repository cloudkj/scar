SCAR - a static website deployment stack
----------------------------------------

The **SCAR** stack is a deployment stack for static websites, using S3,
CloudFront, Amazon Certificate Manager, and Route53.

Deploying static websites on AWS shouldn't be so scary. Tired of reading
outdated Medium posts or combing through verbose AWS documentation? **SCAR**
is a collection of Amazon CloudFormation templates that makes it easy for you
to deploy a static website with a custom domain, SSL, and a CDN. All you need
is an Amazon account to get started, and who doesn't have one of those these
days?

Three simple steps:

1. Launch a new stack of your choosing
2. Update settings at your domain registrar to use the Route 53 name servers
3. Validate your domain with the Certificate Manager

Grab a cup of coffee, wait a few moments, and you should be up and running in
little to no time. Upload your website contents directly with the AWS console,
or use a CLI for programmatic control.

## Templates

## TODO

* Additional templates for bare domain only, www->root
* See if there's a way to use same set of name servers for Route 53 zone to avoid
  having to always look up name servers
* Include certificate validation using CNAME DNS record as part of template.
  Until official CloudFormation support, potential solutions:
  * https://binx.io/blog/2018/10/05/automated-provisioning-of-acm-certificates-using-route53-in-cloudformation/
  * https://github.com/awslabs/aws-cdk/pull/1797
* Add custom resource to delete the CNAME DNS record used for validation in
  Route 53 hosted zone
