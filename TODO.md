TODO
====

* Additional templates for bare domain only, www->root
* Include certificate validation using CNAME DNS record as part of template.
  Until official CloudFormation support, potential solutions:
  * https://binx.io/blog/2018/10/05/automated-provisioning-of-acm-certificates-using-route53-in-cloudformation/
  * https://github.com/awslabs/aws-cdk/pull/1797
* Add custom resource to delete the CNAME DNS record used for validation in
  Route 53 hosted zone
