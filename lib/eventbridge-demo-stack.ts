import {
  Stack,
  StackProps,
  aws_s3,
  RemovalPolicy,
  aws_lambda,
  aws_events,
  aws_events_targets,
  aws_s3_notifications,
  aws_dynamodb,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import * as fs from "fs";

export class EventBridgeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // table
    const table = new aws_dynamodb.Table(this, "EventMessageTable", {
      tableName: "EventMessageTable",
      partitionKey: {
        name: "id",
        type: aws_dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // new s3 bucket
    const bucket = new aws_s3.Bucket(this, "bucket-eventbrideg-demo", {
      bucketName: `eventbridge-demo-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    bucket.enableEventBridgeNotification();

    // lambda function
    const func = new aws_lambda.Function(this, "ProcessS3Event", {
      functionName: "ProcessS3Event",
      code: aws_lambda.Code.fromInline(
        fs.readFileSync(path.resolve(__dirname, "./../lambda/index.py"), {
          encoding: "utf-8",
        })
      ),
      handler: "index.handler",
      runtime: aws_lambda.Runtime.PYTHON_3_7,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(func);
    bucket.grantReadWrite(func);

    // first method - event bridge rule
    const rule = new aws_events.Rule(this, "S3EventTriggerLambdaRule", {
      ruleName: "S3EventTriggerLambdaRule",
      eventPattern: {
        source: ["aws.s3"],
        detailType: ["Object Created"],
        detail: {
          bucket: {
            name: [bucket.bucketName],
          },
          object: {
            key: [{ prefix: "onrule/" }],
          },
        },
      },
    });

    rule.addTarget(new aws_events_targets.LambdaFunction(func));

    // second method - onEvent
    bucket.addEventNotification(
      aws_s3.EventType.OBJECT_CREATED,
      new aws_s3_notifications.LambdaDestination(func),
      { prefix: "onevent" }
    );

    // test lambda put objects into s3
    const testLambda = new aws_lambda.Function(this, "testLambda", {
      functionName: "testLambda",
      code: aws_lambda.Code.fromInline(
        fs.readFileSync(
          path.resolve(__dirname, "./../lambda/lambda-put-item-s3.py"),
          { encoding: "utf-8" }
        )
      ),
      handler: "index.handler",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    bucket.grantReadWrite(testLambda);
  }
}
