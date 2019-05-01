const aws = require('aws-sdk');
const https = require("https");
const s3 = new aws.S3();

exports.handler = async (event, context) => {
    return new Promise((resolve, reject) => {
        switch (event.RequestType) {
            case 'Create':
                handleCreate(event, context);
                break;
            case 'Update':
                handleUpdate(event, context);
                break;
            case 'Delete':
                handleDelete(event, context);
                break;
        }
    });
};

function handleCreate(event, context) {
    const url = event.ResourceProperties.WelcomePageUrl;
    const bucket = event.ResourceProperties.S3Bucket;
    const key = event.ResourceProperties.S3Key;
    console.log(`Uploading contents of ${url} to s3://${bucket}/${key}`);

    https.get(url, (res) => {
        let data = '';
        res.on('data', (x) => { data += x; });
        res.on('end', () => {
            const params = {
                ACL: 'public-read',
                Body: data,
                ContentType: 'text/html',
                Bucket: bucket,
                Key: key
            };
            s3.putObject(params, (e, d) => {
                respond(event, context, 'SUCCESS', { Message: 'Upload completed'});
            });
        });
    }).on('error', (e) => {
        respond(event, context, 'FAILED', { Message: `Upload failed: ${e.message}` });
    });
}

function handleUpdate(event, context) {
    respond(event, context, 'SUCCESS', { Message: 'No-op: update event'});
}

function handleDelete(event, context) {
    const bucket = event.ResourceProperties.S3Bucket;
    const key = event.ResourceProperties.S3Key;
    console.log(`Deleting s3://${bucket}/${key}`);
    
    s3.deleteObjects({
        Bucket: bucket,
        Delete: {
            Quiet: true,
            Objects: [ { Key: key } ]
        }
    }, () => {
        respond(event, context, 'SUCCESS', { Message: `Deleted s3://${bucket}/${key}` });
    });
}

function respond(event, context, responseStatus, responseData) {
    const responseMessage = responseStatus == "SUCCESS" ? "See the details in CloudWatch Log Stream: " + context.logStreamName : JSON.stringify(responseData.Message);

    var responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: responseMessage,
        PhysicalResourceId: event.StackId + '::' + event.LogicalResourceId,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });

    console.log("Sending response " + responseStatus + ": " + responseBody);

    var url = require("url");
    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };
 
    var request = https.request(options, function(response) {
        context.done();
    });
 
    request.on("error", function(error) {
        console.log("sendResponse Error:" + error);
        context.done();
    });
  
    request.write(responseBody);
    request.end();
}
