#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { EventBridgeStack } from "../lib/eventbridge-demo-stack";

const app = new cdk.App();

new EventBridgeStack(app, "EventBridgeStack", {});
